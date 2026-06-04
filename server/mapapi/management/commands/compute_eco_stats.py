# server/mapapi/management/commands/compute_eco_stats.py
import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from shapely.geometry import shape, Point
from shapely.ops import unary_union

from mapapi.models import District, Layer, Category, Object as ObjectModel, EcoDistrictStats


# -----------------------------
# ПАРАМЕТРЫ МОДЕЛИ
# -----------------------------

# веса итогового eco score
GREEN_WEIGHT = 0.6
HAZARD_WEIGHT = 0.4

# вклад двух частей опасности
HAZARD_OVERLAP_WEIGHT = 0.7
HAZARD_COUNT_WEIGHT = 0.3

# единый радиус влияния опасного объекта в метрах
DEFAULT_HAZARD_RADIUS_M = 1000.0

NEW_MOSCOW_KEYWORDS = ("троиц", "новомосков")
DISTRICTS_GEOJSON_PATH = Path(__file__).resolve().parents[2] / "data" / "moscow_districts.geojson"


def is_new_moscow(name: str) -> bool:
    s = (name or "").lower()
    return ("троиц" in s) or ("новомосков" in s)


def normalize_name(s: str) -> str:
    s = (s or "").strip().lower()
    if s.startswith("район "):
        s = s.replace("район ", "", 1).strip()
    if s.endswith(" район"):
        s = s.replace(" район", "").strip()
    return s


def safe_geom(g):
    """
    Пытается исправить невалидную геометрию.
    """
    if g is None:
        return None
    try:
        if not g.is_valid:
            g = g.buffer(0)
        return g
    except Exception:
        return None


def minmax_normalize(values_by_key: dict, reverse: bool = False) -> dict:
    if not values_by_key:
        return {}

    vals = list(values_by_key.values())
    vmin = min(vals)
    vmax = max(vals)

    if vmax == vmin:
        norm = {k: 1.0 for k in values_by_key.keys()}
    else:
        norm = {k: (v - vmin) / (vmax - vmin) for k, v in values_by_key.items()}

    if reverse:
        return {k: 1.0 - v for k, v in norm.items()}
    return norm


def load_district_geometries():
    data = json.loads(DISTRICTS_GEOJSON_PATH.read_text(encoding="utf-8"))
    result = {}

    for feat in data.get("features", []):
        props = feat.get("properties") or {}
        name = props.get("district") or props.get("DISTRICT") or props.get("name") or ""
        if is_new_moscow(name):
            continue

        geom = feat.get("geometry")
        if not geom:
            continue

        try:
            district_shape = safe_geom(shape(geom))
            if district_shape is None or district_shape.is_empty:
                continue
            result[normalize_name(name)] = district_shape
        except Exception:
            continue

    return result


def object_shape(obj: ObjectModel):
    """
    Возвращает shapely geometry из JSON geometry или Point(lon, lat).
    """
    if obj.geometry:
        try:
            g = shape(obj.geometry)
            g = safe_geom(g)
            return g
        except Exception:
            return None

    if obj.lon is not None and obj.lat is not None:
        try:
            return Point(float(obj.lon), float(obj.lat))
        except Exception:
            return None

    return None


def meters_to_degrees(meters: float) -> float:
    """
    Грубое приближение для Москвы: 1 градус ~ 111320 м.
    Для сравнительной районной оценки в дипломном прототипе допустимо.
    """
    return meters / 111320.0


def compute_green_ratio(district_geom, green_objects):
    district_area = district_geom.area
    if district_area <= 0:
        return 0.0

    intersections = []

    for obj in green_objects:
        g = object_shape(obj)
        if g is None or g.is_empty:
            continue

        # точка не дает площади
        if g.geom_type == "Point":
            continue

        try:
            g = safe_geom(g)
            dgeom = safe_geom(district_geom)
            if g is None or dgeom is None or g.is_empty or dgeom.is_empty:
                continue

            inter = g.intersection(dgeom)
            if not inter.is_empty:
                intersections.append(inter)
        except Exception:
            continue

    if not intersections:
        return 0.0

    try:
        green_union = unary_union(intersections)
        green_union = safe_geom(green_union)
        if green_union is None or green_union.is_empty:
            return 0.0
        green_area = green_union.area
        return green_area / district_area
    except Exception:
        return 0.0


def compute_hazard_overlap_ratio(district_geom, hazard_objects):
    district_area = district_geom.area
    if district_area <= 0:
        return 0.0

    buffers = []
    radius_deg = meters_to_degrees(DEFAULT_HAZARD_RADIUS_M)

    for obj in hazard_objects:
        g = object_shape(obj)
        if g is None or g.is_empty:
            continue

        if g.geom_type == "Point":
            source = g
        else:
            try:
                g = safe_geom(g)
                if g is None or g.is_empty:
                    continue
                source = g.representative_point()
            except Exception:
                continue

        try:
            dgeom = safe_geom(district_geom)
            if dgeom is None or dgeom.is_empty:
                continue

            buf = source.buffer(radius_deg)
            buf = safe_geom(buf)
            if buf is None or buf.is_empty:
                continue

            inter = buf.intersection(dgeom)
            if not inter.is_empty:
                buffers.append(inter)
        except Exception:
            continue

    if not buffers:
        return 0.0

    try:
        hazards_union = unary_union(buffers)
        hazards_union = safe_geom(hazards_union)
        if hazards_union is None or hazards_union.is_empty:
            return 0.0
        overlap_area = hazards_union.area
        return overlap_area / district_area
    except Exception:
        return 0.0


class Command(BaseCommand):
    help = "Compute EcoDistrictStats using green area ratio and hazard buffer/count model"

    @transaction.atomic
    def handle(self, *args, **options):
        eco_layer = Layer.objects.filter(slug="eco").first()
        if not eco_layer:
            self.stderr.write("No Layer(slug='eco') found.")
            return

        cats = {c.slug: c for c in Category.objects.filter(layer=eco_layer)}
        parks_cat = cats.get("parks")
        forests_cat = cats.get("forests")
        hazards_cat = cats.get("hazards")

        if not (parks_cat and forests_cat and hazards_cat):
            self.stderr.write("Missing eco categories. Need parks/forests/hazards.")
            return

        district_geoms = load_district_geometries()

        eco_objects = list(
            ObjectModel.objects.filter(layer=eco_layer).select_related("district", "category")
        )

        by_district = {}
        for obj in eco_objects:
            if not obj.district_id:
                continue

            by_district.setdefault(obj.district_id, {
                "parks": [],
                "forests": [],
                "hazards": [],
            })

            if obj.category_id == parks_cat.id:
                by_district[obj.district_id]["parks"].append(obj)
            elif obj.category_id == forests_cat.id:
                by_district[obj.district_id]["forests"].append(obj)
            elif obj.category_id == hazards_cat.id:
                by_district[obj.district_id]["hazards"].append(obj)

        green_raw = {}
        hazard_overlap_raw = {}
        hazard_count_density_raw = {}

        districts = list(District.objects.all())

        for d in districts:
            if is_new_moscow(d.name):
                continue

            district_geom = district_geoms.get(normalize_name(d.name))
            if district_geom is None:
                continue

            district_area = district_geom.area
            if district_area <= 0:
                continue

            bucket = by_district.get(d.id, {"parks": [], "forests": [], "hazards": []})

            green_objects = bucket["parks"] + bucket["forests"]
            hazard_objects = bucket["hazards"]

            green_ratio = compute_green_ratio(district_geom, green_objects)
            hazard_overlap = compute_hazard_overlap_ratio(district_geom, hazard_objects)
            hazard_count_density = len(hazard_objects) / district_area

            green_raw[d.id] = green_ratio
            hazard_overlap_raw[d.id] = hazard_overlap
            hazard_count_density_raw[d.id] = hazard_count_density

        green_norm = minmax_normalize(green_raw, reverse=False)
        hazard_overlap_norm = minmax_normalize(hazard_overlap_raw, reverse=False)
        hazard_count_norm = minmax_normalize(hazard_count_density_raw, reverse=False)

        created = 0
        updated = 0

        for d in districts:
            if is_new_moscow(d.name):
                continue

            bucket = by_district.get(d.id, {"parks": [], "forests": [], "hazards": []})

            parks_count = len(bucket["parks"])
            forests_count = len(bucket["forests"])
            hazards_count = len(bucket["hazards"])

            green_idx = 10.0 * green_norm.get(d.id, 0.0)

            hazard_penalty = (
                HAZARD_OVERLAP_WEIGHT * hazard_overlap_norm.get(d.id, 0.0)
                + HAZARD_COUNT_WEIGHT * hazard_count_norm.get(d.id, 0.0)
            )

            hazard_idx = 10.0 * hazard_penalty
            hazard_safe_idx = 10.0 - hazard_idx

            eco_score = 10.0 * (
                GREEN_WEIGHT * green_norm.get(d.id, 0.0)
                + HAZARD_WEIGHT * (1.0 - hazard_penalty)
            )

            _, was_created = EcoDistrictStats.objects.update_or_create(
                district=d,
                defaults={
                    "parks": parks_count,
                    "forests": forests_count,
                    "hazards_count": hazards_count,
                    "green_index": round(green_idx, 1),
                    "hazard_index": round(hazard_idx, 1),
                    "hazard_safe_index": round(hazard_safe_idx, 1),
                    "eco_score": round(eco_score, 1),
                },
            )

            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Eco stats recomputed. created={created}, updated={updated}"
            )
        )