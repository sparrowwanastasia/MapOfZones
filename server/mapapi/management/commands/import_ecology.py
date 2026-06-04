# server/mapapi/management/commands/import_ecology.py
import json
import time
from pathlib import Path
from typing import Optional, Tuple

from shapely.geometry import shape

import certifi
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from django.core.management.base import BaseCommand
from django.db import transaction

from mapapi.models import District, Layer, Category, Object as ObjectModel


API_BASE = "https://apidata.mos.ru/v1"

# ВАЖНО: parks dataset id (а geoJson=2838 — это отдельный параметр, НЕ dataset id)
DEFAULT_PARKS_DATASET = 1465
DEFAULT_PAGE_SIZE = 1000

# Новая Москва: Троицкий и Новомосковский АО (по названиям в geojson чаще всего так)
NEW_MOSCOW_KEYWORDS = ("троиц", "новомосков")


def _normalize_ru_name(s: str) -> str:
    if not s:
        return ""
    s = str(s).strip().lower()
    if s.startswith("район "):
        s = s.replace("район ", "", 1).strip()
    if s.endswith(" район"):
        s = s.replace(" район", "").strip()
    return s


def _is_new_moscow_district(name: str) -> bool:
    s = _normalize_ru_name(name)
    return any(k in s for k in NEW_MOSCOW_KEYWORDS)


def _extract_count(x):
    if isinstance(x, (int, float)):
        return int(x)
    if isinstance(x, dict):
        if isinstance(x.get("Count"), (int, float)):
            return int(x["Count"])
        if isinstance(x.get("ItemsCount"), (int, float)):
            return int(x["ItemsCount"])
    return None


def _geom_point(geometry) -> Optional[Tuple[float, float]]:
    """
    Берём representative_point() — он гарантированно лежит внутри полигона,
    а для Point просто вернёт сам Point.
    """
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


def _load_districts_polygons(districts_geojson_path: Path, exclude_new_moscow=True):
    data = json.loads(districts_geojson_path.read_text(encoding="utf-8"))
    out = []

    for f in data.get("features", []):
        props = f.get("properties") or {}
        name = props.get("district") or props.get("DISTRICT") or props.get("name") or "Unknown"
        if exclude_new_moscow and _is_new_moscow_district(name):
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


def _ensure_taxonomy():
    eco_layer, _ = Layer.objects.get_or_create(slug="eco", defaults={"name": "Экология"})
    Category.objects.get_or_create(slug="parks", defaults={"name": "Парковые территории", "layer": eco_layer})
    Category.objects.get_or_create(slug="hazards", defaults={"name": "Опасные объекты", "layer": eco_layer})
    Category.objects.get_or_create(slug="forests", defaults={"name": "Леса", "layer": eco_layer})
    return eco_layer


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


def _verify_arg(insecure: bool):
    return False if insecure else certifi.where()


def _fetch_dataset_features(
    session: requests.Session,
    dataset_id: int,
    api_key: str,
    *,
    page_size=1000,
    sleep_sec=0.0,
    insecure=False,
    geojson_param: Optional[int] = None,
):

    verify = _verify_arg(insecure)

    total = None
    count_url = f"{API_BASE}/datasets/{dataset_id}/count?api_key={api_key}"

    try:
        count_res = session.get(count_url, timeout=(20, 60), verify=verify)

        if count_res.status_code == 200:
            total = _extract_count(count_res.json())
        else:
            print(f"dataset {dataset_id}: count endpoint returned {count_res.status_code}, continue without total")
            total = None

    except Exception as e:
        print(f"dataset {dataset_id}: count endpoint failed ({e}), continue without total")
        total = None

    self_total = total if total is not None else "?"
    print(f"dataset {dataset_id}: total = {self_total}")

    all_features = []
    skip = 0
    page_idx = 0

    while True:
        page_idx += 1
        extra = f"&geoJson={int(geojson_param)}" if geojson_param else ""
        url = f"{API_BASE}/datasets/{dataset_id}/features?api_key={api_key}&$top={page_size}&$skip={skip}{extra}"

        r = session.get(url, timeout=(20, 240), verify=verify)
        r.raise_for_status()
        js = r.json()

        feats = None
        if isinstance(js, dict) and js.get("type") == "FeatureCollection":
            feats = js.get("features")
        elif isinstance(js, list):
            feats = js
        elif isinstance(js, dict):
            feats = js.get("features")

        if not feats:
            print(f"dataset {dataset_id}: page {page_idx} empty -> stop")
            break

        all_features.extend(feats)
        skip += len(feats)

        print(f"dataset {dataset_id}: page {page_idx} loaded {skip}/{self_total} (+{len(feats)})")

        if total is not None and skip >= total:
            break

        if sleep_sec:
            time.sleep(sleep_sec)

        if skip > 400000:
            print("safety break: too many records")
            break

    return all_features


class Command(BaseCommand):
    help = "Import ecology objects (parks from Mos API + hazards/forests from local geojson) into DB"

    def add_arguments(self, parser):
        parser.add_argument("--api-key", required=True, help="Mos API key")
        parser.add_argument("--districts", default="mapapi/data/moscow_districts.geojson")
        parser.add_argument("--hazards", default="mapapi/data/hazards.geojson")
        parser.add_argument("--forests", default="mapapi/data/forests.geojson")

        parser.add_argument("--parks-id", type=int, default=DEFAULT_PARKS_DATASET)
        parser.add_argument("--parks-geojson", type=int, default=None, help="Optional geoJson param (e.g. 2838)")
        parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE)
        parser.add_argument("--sleep", type=float, default=0.0)
        parser.add_argument("--clear", action="store_true")
        parser.add_argument("--insecure", action="store_true", help="Disable SSL verification (TEMP)")

    @transaction.atomic
    def handle(self, *args, **opts):
        api_key = opts["api_key"]
        districts_path = Path(opts["districts"])
        hazards_path = Path(opts["hazards"])
        forests_path = Path(opts["forests"])

        parks_id = int(opts["parks_id"])
        parks_geojson = opts["parks_geojson"]
        page_size = int(opts["page_size"])
        sleep_sec = float(opts["sleep"])
        do_clear = bool(opts["clear"])
        insecure = bool(opts["insecure"])

        self.stdout.write("Ensuring layer/categories…")
        eco_layer = _ensure_taxonomy()
        parks_cat = Category.objects.get(slug="parks")
        hazards_cat = Category.objects.get(slug="hazards")
        forests_cat = Category.objects.get(slug="forests")

        if do_clear:
            self.stdout.write("Clearing existing eco objects…")
            ObjectModel.objects.filter(layer=eco_layer).delete()

        self.stdout.write("Loading district polygons (New Moscow excluded)…")
        district_polys = _load_districts_polygons(districts_path, exclude_new_moscow=True)
        self.stdout.write(f"District polygons loaded: {len(district_polys)}")

        # справочник районов БД — ДО импортов
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

        def import_features(features, category: Category, default_name_prefix: str):
            nonlocal created, skipped
            batch = []

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

                # защита: если вдруг пришёл excluded — пропускаем
                if _is_new_moscow_district(district_name):
                    skipped += 1
                    continue

                d_obj = get_or_create_district_by_name(district_name)

                props = f.get("properties") or {}
                attrs = props.get("Attributes") or props.get("attributes") or props

                name = (
                    attrs.get("Name")
                    or attrs.get("ObjectName")
                    or attrs.get("FullName")
                    or props.get("name")
                    or props.get("title")
                    or ""
                )
                address = (
                    attrs.get("Address")
                    or attrs.get("FullAddress")
                    or attrs.get("ShortAddress")
                    or attrs.get("Location")
                    or ""
                )

                if not name:
                    name = default_name_prefix

                batch.append(ObjectModel(
                    name=str(name)[:200],
                    address=str(address)[:300],
                    layer=eco_layer,
                    category=category,
                    district=d_obj,
                    geometry=geom,
                    properties={
                        "raw_properties": props,
                        "raw_attributes": attrs,
                    },
                    lon=float(lon),
                    lat=float(lat),
                ))

                if len(batch) >= 1000:
                    ObjectModel.objects.bulk_create(batch, ignore_conflicts=True)
                    created += len(batch)
                    batch = []

            if batch:
                ObjectModel.objects.bulk_create(batch, ignore_conflicts=True)
                created += len(batch)

        # --- parks (Mos API) ---
        session = _make_session()
        self.stdout.write(f"Fetching parks dataset {parks_id}…")
        parks_features = _fetch_dataset_features(
            session,
            parks_id,
            api_key,
            page_size=page_size,
            sleep_sec=sleep_sec,
            insecure=insecure,
            geojson_param=parks_geojson,
        )

        # --- hazards local ---
        self.stdout.write("Loading hazards geojson…")
        hazards_features = []
        if hazards_path.exists():
            hazards_geojson = json.loads(hazards_path.read_text(encoding="utf-8"))
            hazards_features = hazards_geojson.get("features", [])
        else:
            self.stdout.write(self.style.WARNING(f"Hazards file not found: {hazards_path} (skip)"))

        # --- forests local ---
        self.stdout.write("Loading forests geojson…")
        forests_features = []
        if forests_path.exists():
            forests_geojson = json.loads(forests_path.read_text(encoding="utf-8"))
            forests_features = forests_geojson.get("features", [])
        else:
            self.stdout.write(self.style.WARNING(f"Forests file not found: {forests_path} (skip)"))

        # --- import ---
        self.stdout.write("Importing parks…")
        import_features(parks_features, parks_cat, "Парковая территория")

        self.stdout.write("Importing hazards…")
        import_features(hazards_features, hazards_cat, "Опасный объект")

        if forests_features:
            self.stdout.write("Importing forests…")
            import_features(forests_features, forests_cat, "Лес")

        self.stdout.write(self.style.SUCCESS(f"Done. Created: {created}, skipped: {skipped}"))
