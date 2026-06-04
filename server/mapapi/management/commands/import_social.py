import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import certifi
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from shapely.geometry import shape

from django.core.management.base import BaseCommand
from django.db import transaction

from mapapi.models import District, Layer, Category, Object as ObjectModel


API_BASE = "https://apidata.mos.ru/v1"

# ===== подключенные датасеты =====
DATASET_EDUCATION = [2263]
DATASET_HEALTH = [517]
DATASET_CULTURE = [531, 495, 526]   # театры, кинотеатры, библиотеки
DATASET_SPORT = [629, 2663]         # спортивные объекты, площадки для выгула/дрессировки собак
DATASET_COMMERCE = [3304]

NEW_MOSCOW_KEYWORDS = ("троиц", "новомосков")


def _is_new_moscow(name: str) -> bool:
    s = (name or "").strip().lower()
    return any(k in s for k in NEW_MOSCOW_KEYWORDS)


def _extract_count(x):
    if isinstance(x, (int, float)):
        return int(x)
    if isinstance(x, str) and x.isdigit():
        return int(x)
    if isinstance(x, dict):
        if isinstance(x.get("Count"), (int, float)):
            return int(x["Count"])
        if isinstance(x.get("ItemsCount"), (int, float)):
            return int(x["ItemsCount"])
        if isinstance(x.get("count"), (int, float)):
            return int(x["count"])
    return None


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
        return float(p.x), float(p.y)  # lon, lat
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


def _ensure_social_taxonomy():
    social_layer, _ = Layer.objects.get_or_create(
        slug="social",
        defaults={"name": "Социальный слой"},
    )

    Category.objects.get_or_create(slug="education", defaults={"name": "Образование", "layer": social_layer})
    Category.objects.get_or_create(slug="health", defaults={"name": "Здоровье", "layer": social_layer})
    Category.objects.get_or_create(slug="culture", defaults={"name": "Культура и досуг", "layer": social_layer})
    Category.objects.get_or_create(slug="sport", defaults={"name": "Спорт", "layer": social_layer})
    Category.objects.get_or_create(slug="commerce", defaults={"name": "Коммерция", "layer": social_layer})

    return social_layer


def _unwrap_cells(row: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(row, dict):
        return {}
    cells = row.get("Cells")
    if isinstance(cells, dict):
        merged = dict(cells)
        if "global_id" not in merged and row.get("global_id") is not None:
            merged["global_id"] = row.get("global_id")
        return merged
    return row


def _parse_geometry_from_row(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    row = _unwrap_cells(row)

    cand = (
        row.get("geoData")
        or row.get("GeoData")
        or row.get("geometry")
        or row.get("Geometry")
        or row.get("GEOMETRY")
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
        v = row.get(k)
        if v is None:
            continue
        try:
            lon = float(v)
            break
        except Exception:
            pass

    for k in lat_keys:
        v = row.get(k)
        if v is None:
            continue
        try:
            lat = float(v)
            break
        except Exception:
            pass

    if lon is not None and lat is not None:
        if abs(lon) > 1000 or abs(lat) > 1000:
            return None
        return {"type": "Point", "coordinates": [lon, lat]}

    return None


def _rows_to_features(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    feats: List[Dict[str, Any]] = []
    for r in rows:
        prepared = _unwrap_cells(r)
        geom = _parse_geometry_from_row(prepared)
        if not geom:
            continue
        feats.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {"Attributes": prepared},
        })
    return feats


def _get_dataset_version(
    session: requests.Session,
    dataset_id: int,
    api_key: str,
    insecure: bool = False,
) -> Tuple[Optional[str], Optional[str]]:
    verify = _verify_arg(insecure)
    url = f"{API_BASE}/datasets/{dataset_id}/version?api_key={api_key}"
    r = session.get(url, timeout=(20, 60), verify=verify)
    r.raise_for_status()
    js = r.json()

    if not isinstance(js, dict):
        return None, None

    version_number = js.get("VersionNumber")
    release_number = js.get("ReleaseNumber")

    if version_number is not None:
        version_number = str(version_number)
    if release_number is not None:
        release_number = str(release_number)

    return version_number, release_number


def _build_dataset_url(
    dataset_id: int,
    endpoint: str,
    api_key: str,
    page_size: int,
    skip: int,
    version_number: Optional[str] = None,
    release_number: Optional[str] = None,
) -> str:
    url = f"{API_BASE}/datasets/{dataset_id}/{endpoint}?api_key={api_key}&$top={page_size}&$skip={skip}"
    if version_number not in (None, ""):
        url += f"&versionNumber={version_number}"
    if release_number not in (None, ""):
        url += f"&releaseNumber={release_number}"
    return url


def _fetch_dataset_features_flexible(
    session: requests.Session,
    dataset_id: int,
    api_key: str,
    page_size: int = 1000,
    sleep_sec: float = 0.0,
    insecure: bool = False,
) -> List[Dict[str, Any]]:
    verify = _verify_arg(insecure)

    version_number, release_number = _get_dataset_version(
        session=session,
        dataset_id=dataset_id,
        api_key=api_key,
        insecure=insecure,
    )

    print(f"dataset {dataset_id}: version={version_number!r}, release={release_number!r}")

    candidate_modes = [
        ("features", version_number, release_number),
        ("rows", version_number, release_number),
        ("features", None, None),
        ("rows", None, None),
    ]

    chosen_endpoint = None
    chosen_version = None
    chosen_release = None
    last_error = None

    # ВАЖНО: API требует $skip >= 1
    test_skip = 1

    for endpoint, vnum, rnum in candidate_modes:
        test_url = _build_dataset_url(
            dataset_id=dataset_id,
            endpoint=endpoint,
            api_key=api_key,
            page_size=1,
            skip=test_skip,
            version_number=vnum,
            release_number=rnum,
        )
        resp = session.get(test_url, timeout=(20, 60), verify=verify)

        if resp.status_code == 200:
            chosen_endpoint = endpoint
            chosen_version = vnum
            chosen_release = rnum
            print(
                f"dataset {dataset_id}: using endpoint={endpoint}, "
                f"version={vnum!r}, release={rnum!r}"
            )
            break

        if resp.status_code in (400, 404):
            last_error = f"{resp.status_code}: {resp.text[:300]}"
            continue

        resp.raise_for_status()

    if chosen_endpoint is None:
        raise requests.HTTPError(
            f"Dataset {dataset_id} could not be opened by any mode. Last error: {last_error}"
        )

    total = None
    try:
        count_url = f"{API_BASE}/datasets/{dataset_id}/count?api_key={api_key}"
        cr = session.get(count_url, timeout=(20, 60), verify=verify)
        if cr.status_code == 200:
            total = _extract_count(cr.json())
    except Exception:
        total = None

    all_features: List[Dict[str, Any]] = []
    skip = 1

    while True:
        url = _build_dataset_url(
            dataset_id=dataset_id,
            endpoint=chosen_endpoint,
            api_key=api_key,
            page_size=page_size,
            skip=skip,
            version_number=chosen_version,
            release_number=chosen_release,
        )

        r = session.get(url, timeout=(20, 240), verify=verify)
        r.raise_for_status()
        js = r.json()

        feats: List[Dict[str, Any]] = []

        if chosen_endpoint == "features":
            if isinstance(js, dict) and js.get("type") == "FeatureCollection":
                feats = js.get("features") or []
            elif isinstance(js, list):
                feats = js
            elif isinstance(js, dict):
                feats = js.get("features") or []
        else:
            rows = []
            if isinstance(js, list):
                rows = js
            elif isinstance(js, dict):
                rows = js.get("rows") or js.get("data") or js.get("Rows") or js.get("Items") or []
            feats = _rows_to_features(rows)

        if not feats:
            break

        all_features.extend(feats)
        skip += len(feats)

        if total is not None and len(all_features) >= total:
            break

        if sleep_sec:
            time.sleep(sleep_sec)

        if len(all_features) > 400000:
            break

    print(
        f"dataset {dataset_id}: loaded = {len(all_features)} "
        f"(endpoint={chosen_endpoint}, total={total}, version={chosen_version}, release={chosen_release})"
    )
    return all_features


class Command(BaseCommand):
    help = "Import SOCIAL objects into DB (New Moscow excluded)"

    def add_arguments(self, parser):
        parser.add_argument("--api-key", required=True, help="Mos API key")
        parser.add_argument("--districts", default="mapapi/data/moscow_districts.geojson", help="Path to districts geojson")
        parser.add_argument("--page-size", type=int, default=1000)
        parser.add_argument("--sleep", type=float, default=0.0)
        parser.add_argument("--clear", action="store_true", help="Clear existing social objects before import")
        parser.add_argument("--insecure", action="store_true", help="Disable SSL verification (TEMP)")

        parser.add_argument("--education-id", type=int, nargs="+", default=DATASET_EDUCATION)
        parser.add_argument("--health-id", type=int, nargs="+", default=DATASET_HEALTH)
        parser.add_argument("--culture-id", type=int, nargs="+", default=DATASET_CULTURE)
        parser.add_argument("--sport-id", type=int, nargs="+", default=DATASET_SPORT)
        parser.add_argument("--commerce-id", type=int, nargs="+", default=DATASET_COMMERCE)

    @transaction.atomic
    def handle(self, *args, **opts):
        api_key = opts["api_key"]
        districts_path = Path(opts["districts"])
        page_size = opts["page_size"]
        sleep_sec = opts["sleep"]
        do_clear = opts["clear"]
        insecure = opts["insecure"]

        education_ids = opts["education_id"]
        health_ids = opts["health_id"]
        culture_ids = opts["culture_id"]
        sport_ids = opts["sport_id"]
        commerce_ids = opts["commerce_id"]

        self.stdout.write("Ensuring social layer/categories…")
        social_layer = _ensure_social_taxonomy()

        cat_education = Category.objects.get(slug="education")
        cat_health = Category.objects.get(slug="health")
        cat_culture = Category.objects.get(slug="culture")
        cat_sport = Category.objects.get(slug="sport")
        cat_commerce = Category.objects.get(slug="commerce")

        if do_clear:
            self.stdout.write("Clearing existing social objects…")
            ObjectModel.objects.filter(layer=social_layer).delete()

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

        created = 0
        skipped = 0

        def import_features(features: List[Dict[str, Any]], category: Category, default_name_prefix: str):
            nonlocal created, skipped
            batch: List[ObjectModel] = []

            for f in features:
                geom = f.get("geometry")
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
                attrs = props.get("Attributes") or props.get("attributes") or props

                name = (
                    attrs.get("Name")
                    or attrs.get("ObjectName")
                    or attrs.get("FullName")
                    or attrs.get("ShortName")
                    or attrs.get("CommonName")
                    or attrs.get("FullNameOfOrganization")
                    or props.get("name")
                    or props.get("title")
                    or ""
                )
                address = (
                    attrs.get("Address")
                    or attrs.get("FullAddress")
                    or attrs.get("ShortAddress")
                    or attrs.get("Location")
                    or attrs.get("ObjectAddress")
                    or attrs.get("AdmArea")
                    or ""
                )

                if not name:
                    name = default_name_prefix

                batch.append(
                    ObjectModel(
                        name=str(name)[:200],
                        address=str(address)[:300],
                        layer=social_layer,
                        category=category,
                        district=d_obj,
                        geometry=geom,
                        lon=float(lon),
                        lat=float(lat),
                    )
                )

                if len(batch) >= 1000:
                    ObjectModel.objects.bulk_create(batch, ignore_conflicts=True)
                    created += len(batch)
                    batch = []

            if batch:
                ObjectModel.objects.bulk_create(batch, ignore_conflicts=True)
                created += len(batch)

        session = _make_session()

        def fetch_many(dataset_ids, label: str):
            all_features = []
            for ds_id in dataset_ids:
                self.stdout.write(f"Fetching {label} dataset {ds_id}…")
                try:
                    feats = _fetch_dataset_features_flexible(
                        session=session,
                        dataset_id=ds_id,
                        api_key=api_key,
                        page_size=page_size,
                        sleep_sec=sleep_sec,
                        insecure=insecure,
                    )
                    all_features.extend(feats)
                except Exception as e:
                    self.stderr.write(f"Skipping dataset {ds_id} ({label}): {e}")
                    continue
            return all_features

        education_features = fetch_many(education_ids, "education")
        health_features = fetch_many(health_ids, "health")
        culture_features = fetch_many(culture_ids, "culture")
        sport_features = fetch_many(sport_ids, "sport")
        commerce_features = fetch_many(commerce_ids, "commerce")

        self.stdout.write("Importing education…")
        import_features(education_features, cat_education, "Объект образования")

        self.stdout.write("Importing health…")
        import_features(health_features, cat_health, "Объект здравоохранения")

        self.stdout.write("Importing culture…")
        import_features(culture_features, cat_culture, "Культура и досуг")

        self.stdout.write("Importing sport…")
        import_features(sport_features, cat_sport, "Спортивный объект")

        self.stdout.write("Importing commerce…")
        import_features(commerce_features, cat_commerce, "Коммерческий объект")

        self.stdout.write(self.style.SUCCESS(f"Done. Created: {created}, skipped: {skipped}"))