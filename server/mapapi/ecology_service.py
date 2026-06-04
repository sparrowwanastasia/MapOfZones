import json
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

import requests
from django.core.cache import cache
from django.conf import settings

from shapely.geometry import shape, Point, mapping
from shapely.ops import unary_union

MOS_API_BASE = "https://apidata.mos.ru/v1"
MOS_API_KEY = "57e7712f-ddc6-4e7a-9242-6f1a37b7af47"
PAGE_SIZE = 1000

DATA_DIR = Path(__file__).resolve().parent / "data"
DISTRICTS_PATH = DATA_DIR / "moscow_districts.geojson"
HAZARDS_PATH = DATA_DIR / "hazards.geojson"

# dataset ids
DATASET_YARDS = 64036
DATASET_PARKS = 1465


def _read_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _slugify_ru(name: str) -> str:
    # простой slug: lower + пробелы/тире -> "-"
    s = (name or "").strip().lower()
    s = s.replace("район", "").strip()
    s = s.replace("ё", "е")
    for ch in [",", ".", "(", ")", "\"", "«", "»", ":", ";"]:
        s = s.replace(ch, "")
    s = "-".join([p for p in s.replace("_", "-").split() if p])
    return s


def _district_name_from_feature(feat: Dict[str, Any]) -> str:
    props = feat.get("properties") or {}
    return props.get("district") or props.get("DISTRICT") or props.get("name") or "Unknown"


def _fetch_mos_count(dataset_id: int) -> int:
    url = f"{MOS_API_BASE}/datasets/{dataset_id}/count?api_key={MOS_API_KEY}"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    j = r.json()
    if isinstance(j, int):
        return j
    if isinstance(j, dict):
        if isinstance(j.get("Count"), int):
            return j["Count"]
        if isinstance(j.get("ItemsCount"), int):
            return j["ItemsCount"]
    return 0


def _fetch_mos_features(dataset_id: int) -> Dict[str, Any]:
    """
    Возвращает FeatureCollection (все features).
    Кэшируем на сутки, чтобы не тянуть 24k каждый раз.
    """
    cache_key = f"mos_dataset_fc_{dataset_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    total = _fetch_mos_count(dataset_id)
    features: List[Dict[str, Any]] = []
    skip = 0

    # небольшой retry
    for _ in range(1):
        pass

    while True:
        url = (
            f"{MOS_API_BASE}/datasets/{dataset_id}/features"
            f"?api_key={MOS_API_KEY}&$top={PAGE_SIZE}&$skip={skip}"
        )
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        j = r.json()

        page = []
        if isinstance(j, dict) and j.get("type") == "FeatureCollection":
            page = j.get("features") or []
        elif isinstance(j, list):
            page = j
        else:
            page = []

        if not page:
            break

        features.extend(page)
        skip += len(page)

        if total and skip >= total:
            break

        if skip > 200000:
            break

    fc = {"type": "FeatureCollection", "features": features}
    cache.set(cache_key, fc, timeout=60 * 60 * 24)  # 24h
    return fc


def _load_districts() -> List[Dict[str, Any]]:
    cache_key = "districts_geojson_features"
    cached = cache.get(cache_key)
    if cached:
        return cached

    data = _read_json(DISTRICTS_PATH)
    feats = data.get("features") or []
    # добавим slug в properties
    for f in feats:
        nm = _district_name_from_feature(f)
        clean = nm.replace("район", "").strip()
        f.setdefault("properties", {})
        f["properties"]["slug"] = _slugify_ru(clean)
        f["properties"]["display_name"] = clean[:1].upper() + clean[1:] if clean else nm

    cache.set(cache_key, feats, timeout=60 * 60 * 24)
    return feats


def _load_hazards() -> Dict[str, Any]:
    cache_key = "hazards_fc"
    cached = cache.get(cache_key)
    if cached:
        return cached
    if not HAZARDS_PATH.exists():
        fc = {"type": "FeatureCollection", "features": []}
        cache.set(cache_key, fc, timeout=60 * 60 * 24)
        return fc
    fc = _read_json(HAZARDS_PATH)
    cache.set(cache_key, fc, timeout=60 * 60 * 24)
    return fc


def _hazard_meta(tags: Dict[str, Any]) -> Tuple[str, float]:
    power = tags.get("power")
    landuse = tags.get("landuse")
    man_made = tags.get("man_made")
    building = tags.get("building")

    if power == "plant":
        return "Электростанция", 3.0
    if landuse == "landfill":
        return "Мусорный полигон", 3.0
    if man_made == "wastewater_plant":
        return "Очистные сооружения", 2.5
    if man_made == "works":
        return "Промышленное предприятие", 2.0
    if building == "industrial":
        return "Промышленное здание", 1.5
    if landuse == "industrial":
        return "Промзона", 1.2
    if building == "warehouse":
        return "Склад / логистический комплекс", 1.0

    return "Опасный объект", 1.0


def _eco_color(score10: float) -> str:
    if score10 >= 8:
        return "#2ecc71"
    if score10 >= 6:
        return "#f1c40f"
    if score10 >= 4:
        return "#f39c12"
    if score10 >= 2:
        return "#e67e22"
    return "#e74c3c"


def _feature_center(feat: Dict[str, Any]) -> Point:
    g = shape(feat.get("geometry"))
    # centroid для полигонов, точка для point
    if g.geom_type == "Point":
        return g
    return g.centroid


def compute_summary() -> List[Dict[str, Any]]:
    """
    Быстрый summary: {slug, name, ecoScore, greenIndex, hazardIndex, yards, parks, hazardsCount, color}
    Кэшируем на сутки.
    """
    cache_key = "eco_summary_v1"
    cached = cache.get(cache_key)
    if cached:
        return cached

    districts = _load_districts()
    yards_fc = _fetch_mos_features(DATASET_YARDS)
    parks_fc = _fetch_mos_features(DATASET_PARKS)
    hazards_fc = _load_hazards()

    # заранее посчитаем центры объектов
    yards_centers = [(f, _feature_center(f)) for f in yards_fc.get("features", [])]
    parks_centers = [(f, _feature_center(f)) for f in parks_fc.get("features", [])]
    hazards_centers = [(f, _feature_center(f)) for f in hazards_fc.get("features", [])]

    out: List[Dict[str, Any]] = []

    for d in districts:
        props = d.get("properties") or {}
        slug = props.get("slug")
        name = props.get("display_name") or _district_name_from_feature(d)

        poly = shape(d.get("geometry"))
        if poly.is_empty:
            continue

        yards = 0
        parks = 0
        hazards_count = 0
        hazard_risk = 0.0

        # дворы (по центру)
        for _, c in yards_centers:
            if poly.contains(c):
                yards += 1

        # парки (по центру)
        for _, c in parks_centers:
            if poly.contains(c):
                parks += 1

        # hazards (по центру)
        for hf, c in hazards_centers:
            if poly.contains(c):
                hazards_count += 1
                tags = (hf.get("properties") or {}).get("tags") or (hf.get("properties") or {})
                _, w = _hazard_meta(tags)
                hazard_risk += w

        green_raw = yards + 2 * parks
        GREEN_SMOOTHING = 50
        green_index = 10 * (green_raw / (green_raw + GREEN_SMOOTHING)) if green_raw > 0 else 0.0

        HAZARD_SMOOTHING = 5
        hazard_index = 10 * (hazard_risk / (hazard_risk + HAZARD_SMOOTHING)) if hazard_risk > 0 else 0.0

        hazard_safe = 10 - hazard_index
        eco_score = 0.6 * green_index + 0.4 * hazard_safe

        item = {
            "slug": slug,
            "name": name,
            "yards": yards,
            "parks": parks,
            "hazardsCount": hazards_count,
            "greenIndex": round(green_index, 1),
            "hazardIndex": round(hazard_index, 1),
            "ecoScore": round(eco_score, 1),
            "color": _eco_color(eco_score),
        }
        out.append(item)

    cache.set(cache_key, out, timeout=60 * 60 * 24)
    return out


def compute_district_detail(slug: str) -> Dict[str, Any]:
    """
    Детальный ответ по району:
    - stats (как в summary)
    - geojson объектов (yards/paks полигоны (клип), hazards точки)
    Кэшируем на 1 час.
    """
    cache_key = f"eco_district_detail_{slug}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    districts = _load_districts()
    district_feat = None
    for d in districts:
        if (d.get("properties") or {}).get("slug") == slug:
            district_feat = d
            break
    if not district_feat:
        return {"error": "district_not_found"}

    poly = shape(district_feat.get("geometry"))
    props = district_feat.get("properties") or {}
    name = props.get("display_name") or _district_name_from_feature(district_feat)

    # берём stats из summary, чтобы не пересчитывать
    summary = compute_summary()
    stats = next((x for x in summary if x["slug"] == slug), None)

    yards_fc = _fetch_mos_features(DATASET_YARDS)
    parks_fc = _fetch_mos_features(DATASET_PARKS)
    hazards_fc = _load_hazards()

    def clip_polygons(fc: Dict[str, Any]) -> Dict[str, Any]:
        feats = []
        for f in fc.get("features", []):
            g = shape(f.get("geometry"))
            # точка не клипается как полигон
            if g.geom_type == "Point":
                continue
            # быстрый фильтр по центру
            if not poly.contains(g.centroid):
                continue
            inter = g.intersection(poly)
            if inter.is_empty:
                continue
            nf = dict(f)
            nf["geometry"] = mapping(inter)
            feats.append(nf)
        return {"type": "FeatureCollection", "features": feats}

    def filter_points(fc: Dict[str, Any]) -> Dict[str, Any]:
        feats = []
        for f in fc.get("features", []):
            g = shape(f.get("geometry"))
            if g.geom_type != "Point":
                # если вдруг полигон — тоже можно по центру
                c = g.centroid
            else:
                c = g
            if poly.contains(c):
                feats.append(f)
        return {"type": "FeatureCollection", "features": feats}

    yards_in = clip_polygons(yards_fc)
    parks_in = clip_polygons(parks_fc)
    hazards_in = filter_points(hazards_fc)

    payload = {
        "district": {"slug": slug, "name": name},
        "stats": stats,
        "objects": {
            "yards": yards_in,
            "parks": parks_in,
            "hazards": hazards_in,
        },
    }

    cache.set(cache_key, payload, timeout=60 * 60)  # 1h
    return payload
