import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import certifi
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from shapely.geometry import shape

from django.core.management.base import BaseCommand
from django.db import transaction

from mapapi.models import District, Layer, Category, Object as ObjectModel


API_BASE = "https://apidata.mos.ru/v1"
DATASET_NOISE = [2449]

NEW_MOSCOW_KEYWORDS = ("троиц", "новомосков")


def _is_new_moscow(name: str) -> bool:
    s = (name or "").strip().lower()
    return any(k in s for k in NEW_MOSCOW_KEYWORDS)


def _normalize_ru_name(s: str) -> str:
    if not s:
        return ""
    s = str(s).strip().lower()
    if s.startswith("район "):
        s = s.replace("район ", "", 1).strip()
    if s.endswith(" район"):
        s = s.replace(" район", "").strip()
    return s


def _verify_arg(insecure: bool):
    return False if insecure else certifi.where()


def _make_session():
    sess = requests.Session()
    retry = Retry(
        total=10,
        connect=10,
        read=10,
        backoff_factor=0.7,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    sess.mount("https://", adapter)
    sess.mount("http://", adapter)
    return sess


def _geom_point(geometry):
    if not geometry:
        return None
    try:
        g = shape(geometry)
        p = g.representative_point()
        return float(p.x), float(p.y)
    except Exception:
        return None


def _bbox_of_polygon(poly_coords):
    ring = poly_coords[0]
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return min(xs), min(ys), max(xs), max(ys)


def _bbox_of_geometry(geometry):
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if gtype == "Polygon":
        return _bbox_of_polygon(coords)
    if gtype == "MultiPolygon":
        b = None
        for poly in coords or []:
            bb = _bbox_of_polygon(poly)
            if b is None:
                b = bb
            else:
                b = (min(b[0], bb[0]), min(b[1], bb[1]), max(b[2], bb[2]), max(b[3], bb[3]))
        return b
    if gtype == "Point":
        lon, lat = coords
        return lon, lat, lon, lat
    return None


def _point_in_ring(lon, lat, ring):
    inside = False
    n = len(ring)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        intersect = ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside


def _point_in_polygon(lon, lat, geometry):
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")

    if gtype == "Polygon":
        if not coords or not coords[0]:
            return False
        return _point_in_ring(lon, lat, coords[0])

    if gtype == "MultiPolygon":
        for poly in coords or []:
            if not poly or not poly[0]:
                continue
            if _point_in_ring(lon, lat, poly[0]):
                return True
        return False

    return False


def _load_districts_polygons(districts_geojson_path: Path):
    data = json.loads(districts_geojson_path.read_text(encoding="utf-8"))
    out = []

    for f in data.get("features", []):
        props = f.get("properties") or {}
        name = props.get("district") or props.get("DISTRICT") or props.get("name") or "Unknown"

        if _is_new_moscow(name):
            continue

        geom = f.get("geometry")
        if not geom:
            continue
        bb = _bbox_of_geometry(geom)
        if not bb:
            continue
        out.append({"name": name, "geom": geom, "bbox": bb})

    return out


def _find_district_for_point(lon, lat, district_polys):
    for d in district_polys:
        minx, miny, maxx, maxy = d["bbox"]
        if lon < minx or lon > maxx or lat < miny or lat > maxy:
            continue
        if _point_in_polygon(lon, lat, d["geom"]):
            return d["name"]
    return None


def _ensure_noise_taxonomy():
    noise_layer, _ = Layer.objects.get_or_create(
        slug="noise",
        defaults={"name": "Шумовой слой"}
    )
    Category.objects.get_or_create(
        slug="noise_points",
        defaults={"name": "Обращения по шуму", "layer": noise_layer}
    )
    return noise_layer


def _parse_geometry_from_feature_or_row(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    geom = item.get("geometry")
    if isinstance(geom, dict) and geom.get("type") and geom.get("coordinates") is not None:
        return geom

    cand = (
        item.get("geoData")
        or item.get("GeoData")
        or item.get("geometry")
        or item.get("Geometry")
        or item.get("GEOMETRY")
    )

    if isinstance(cand, str):
        cand = cand.strip()
        try:
            cand = json.loads(cand)
        except Exception:
            cand = None

    if isinstance(cand, dict) and cand.get("type") and cand.get("coordinates") is not None:
        return cand

    lon_keys = ["Longitude_WGS84", "Lon", "lon", "longitude", "X", "x"]
    lat_keys = ["Latitude_WGS84", "Lat", "lat", "latitude", "Y", "y"]

    lon = None
    lat = None

    for k in lon_keys:
        v = item.get(k)
        if v is None:
            continue
        try:
            lon = float(v)
            break
        except Exception:
            pass

    for k in lat_keys:
        v = item.get(k)
        if v is None:
            continue
        try:
            lat = float(v)
            break
        except Exception:
            pass

    if lon is not None and lat is not None:
        return {"type": "Point", "coordinates": [lon, lat]}

    return None


def _fetch_dataset_version(session, dataset_id: int, api_key: str, verify):
    url = f"{API_BASE}/datasets/{dataset_id}/version?api_key={api_key}"
    r = session.get(url, timeout=(20, 60), verify=verify)
    r.raise_for_status()
    js = r.json()
    return str(js.get("VersionNumber")), str(js.get("ReleaseNumber"))


def _fetch_dataset_count(session, dataset_id: int, api_key: str, verify):
    try:
        url = f"{API_BASE}/datasets/{dataset_id}/count?api_key={api_key}"
        r = session.get(url, timeout=(20, 60), verify=verify)
        if not r.ok:
            return None
        raw = r.json()
        if isinstance(raw, int):
            return raw
        if isinstance(raw, str) and raw.isdigit():
            return int(raw)
        if isinstance(raw, dict):
            for k in ("Count", "ItemsCount", "count"):
                v = raw.get(k)
                if isinstance(v, int):
                    return v
                if isinstance(v, str) and v.isdigit():
                    return int(v)
    except Exception:
        return None
    return None


def _extract_features_from_response(js):
    if isinstance(js, dict) and js.get("type") == "FeatureCollection":
        return js.get("features") or []
    if isinstance(js, list):
        return js
    if isinstance(js, dict):
        return js.get("features") or []
    return []


def _fetch_dataset_features(
    session: requests.Session,
    dataset_id: int,
    api_key: str,
    page_size: int = 1000,
    sleep_sec: float = 0.0,
    insecure: bool = False,
) -> List[Dict[str, Any]]:
    verify = _verify_arg(insecure)
    version_number, release_number = _fetch_dataset_version(session, dataset_id, api_key, verify)
    total = _fetch_dataset_count(session, dataset_id, api_key, verify)

    print(f"dataset {dataset_id}: version='{version_number}', release='{release_number}'")

    skip = 1
    all_features: List[Dict[str, Any]] = []

    while True:
        url = (
            f"{API_BASE}/datasets/{dataset_id}/features"
            f"?api_key={api_key}"
            f"&$top={page_size}"
            f"&$skip={skip}"
            f"&versionNumber={version_number}"
            f"&releaseNumber={release_number}"
        )

        r = session.get(url, timeout=(20, 240), verify=verify)
        r.raise_for_status()
        js = r.json()
        feats = _extract_features_from_response(js)

        if not feats:
            break

        all_features.extend(feats)
        skip += len(feats)

        if total is not None and len(all_features) >= total:
            break

        if sleep_sec:
            time.sleep(sleep_sec)

        if len(all_features) > 500000:
            break

    print(
        f"dataset {dataset_id}: loaded = {len(all_features)} "
        f"(endpoint=features, total={total}, version={version_number}, release={release_number})"
    )
    return all_features


def _pick_attr(attrs: Dict[str, Any], *keys):
    for k in keys:
        v = attrs.get(k)
        if v is None:
            continue

        if isinstance(v, list):
            if not v:
                continue
            # Для NoiseCategory список значений нужно склеить
            parts = []
            for item in v:
                if isinstance(item, dict):
                    vals = [str(x).strip() for x in item.values() if str(x).strip()]
                    if vals:
                        parts.append(", ".join(vals))
                else:
                    s = str(item).strip()
                    if s:
                        parts.append(s)
            if parts:
                return ", ".join(parts)

        elif isinstance(v, dict):
            vals = [str(x).strip() for x in v.values() if str(x).strip()]
            if vals:
                return ", ".join(vals)

        else:
            s = str(v).strip()
            if s:
                return s

    return ""


def _extract_noise_category(attrs: Dict[str, Any]) -> str:
    return _pick_attr(
        attrs,
        "NoiseCategory",
        "CategoryOfNoiseAppeal",
        "NoiseAppealCategory",
        "Категория обращения по шуму",
        "Category",
        "IssueCategory",
        "Тип обращения",
        "CategoryAppealOfNoise",
    ) or "Не указано"


class Command(BaseCommand):
    help = "Import NOISE complaints into DB (New Moscow excluded)"

    def add_arguments(self, parser):
        parser.add_argument("--api-key", required=True, help="Mos API key")
        parser.add_argument("--districts", default="mapapi/data/moscow_districts.geojson", help="Path to districts geojson")
        parser.add_argument("--page-size", type=int, default=1000)
        parser.add_argument("--sleep", type=float, default=0.0)
        parser.add_argument("--clear", action="store_true", help="Clear existing noise objects before import")
        parser.add_argument("--insecure", action="store_true", help="Disable SSL verification (TEMP)")
        parser.add_argument("--noise-id", type=int, nargs="+", default=DATASET_NOISE)

    @transaction.atomic
    def handle(self, *args, **opts):
        api_key = opts["api_key"]
        districts_path = Path(opts["districts"])
        page_size = opts["page_size"]
        sleep_sec = opts["sleep"]
        do_clear = opts["clear"]
        insecure = opts["insecure"]
        noise_ids = opts["noise_id"]

        self.stdout.write("Ensuring noise layer/categories…")
        noise_layer = _ensure_noise_taxonomy()
        noise_cat = Category.objects.get(slug="noise_points")

        if do_clear:
            self.stdout.write("Clearing existing noise objects…")
            ObjectModel.objects.filter(layer=noise_layer).delete()

        self.stdout.write("Loading district polygons (New Moscow excluded)…")
        district_polys = _load_districts_polygons(districts_path)
        self.stdout.write(f"District polygons loaded: {len(district_polys)}")

        db_districts = {_normalize_ru_name(d.name): d for d in District.objects.all()}

        def get_or_create_district_by_name(name_from_geojson: str):
            key = _normalize_ru_name(name_from_geojson)
            if key in db_districts:
                return db_districts[key]
            obj, _ = District.objects.get_or_create(
                name=key,
                defaults={"slug": key.replace(" ", "-")}
            )
            db_districts[key] = obj
            return obj

        session = _make_session()

        all_features = []
        for ds_id in noise_ids:
            self.stdout.write(f"Fetching noise dataset {ds_id}…")
            feats = _fetch_dataset_features(
                session,
                ds_id,
                api_key,
                page_size=page_size,
                sleep_sec=sleep_sec,
                insecure=insecure,
            )
            all_features.extend(feats)

        created = 0
        skipped = 0
        batch: List[ObjectModel] = []

        for f in all_features:
            geom = _parse_geometry_from_feature_or_row(f)
            if not geom:
                skipped += 1
                continue

            pt = _geom_point(geom)
            if not pt:
                skipped += 1
                continue

            lon, lat = pt
            district_name = _find_district_for_point(lon, lat, district_polys)
            if not district_name:
                skipped += 1
                continue

            d_obj = get_or_create_district_by_name(district_name)

            props = f.get("properties") or {}
            attrs = props.get("attributes") or props.get("Attributes") or {}

            address = _pick_attr(
                attrs,
                "Location",
                "Address",
                "FullAddress",
                "ShortAddress",
                "Адрес",
                "Адрес объекта",
            )

            noise_category = _extract_noise_category(attrs)

            result_text = _pick_attr(
                attrs,
                "Results",
                "ResultsOfVisit",
                "Результаты выезда",
                "Result",
            )

            batch.append(
                ObjectModel(
                    name=str(noise_category)[:200],
                    address=str(address)[:300],
                    layer=noise_layer,
                    category=noise_cat,
                    district=d_obj,
                    geometry=geom,
                    lon=float(lon),
                    lat=float(lat),
                    properties={
                        "noise_category": noise_category,
                        "address": address,
                        "result_text": result_text,
                    },
                )
            )

            if len(batch) >= 1000:
                ObjectModel.objects.bulk_create(batch, ignore_conflicts=True)
                created += len(batch)
                batch = []

        if batch:
            ObjectModel.objects.bulk_create(batch, ignore_conflicts=True)
            created += len(batch)

        self.stdout.write(self.style.SUCCESS(f"Done. Created: {created}, skipped: {skipped}"))