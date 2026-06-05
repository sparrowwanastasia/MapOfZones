from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import os
import requests
from django.conf import settings
from django.shortcuts import get_object_or_404

from rest_framework.response import Response

from django.core.management import call_command
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly


from .models import (
    District,
    Layer,
    Category,
    Object as ObjectModel,
    EcoDistrictStats,
    SocialDistrictStats,
    NoiseDistrictStats,
    DistrictRating,
)


NEW_MOSCOW_KEYWORDS = ("троиц", "новомосков")


def _is_new_moscow(name: str) -> bool:
    s = (name or "").strip().lower()
    return any(k in s for k in NEW_MOSCOW_KEYWORDS)


def _get_eco_layer() -> Optional[Layer]:
    try:
        return Layer.objects.get(slug="eco")
    except Layer.DoesNotExist:
        return None


def _get_social_layer() -> Optional[Layer]:
    try:
        return Layer.objects.get(slug="social")
    except Layer.DoesNotExist:
        return None


def _get_noise_layer() -> Optional[Layer]:
    try:
        return Layer.objects.get(slug="noise")
    except Layer.DoesNotExist:
        return None


def _obj_to_feature(obj: ObjectModel) -> Optional[Dict[str, Any]]:
    geom = obj.geometry
    if not geom and obj.lon is not None and obj.lat is not None:
        geom = {"type": "Point", "coordinates": [float(obj.lon), float(obj.lat)]}
    if not geom:
        return None

    props = {
        "id": obj.id,
        "name": obj.name or "",
        "address": obj.address or "",
        "layer": getattr(obj.layer, "slug", None),
        "category": getattr(obj.category, "slug", None),
        "district": getattr(obj.district, "slug", None),
    }

    if isinstance(obj.properties, dict):
        props.update(obj.properties)

    return {"type": "Feature", "geometry": geom, "properties": props}


def _feature_collection(objs: List[ObjectModel]) -> Dict[str, Any]:
    feats: List[Dict[str, Any]] = []
    for o in objs:
        ft = _obj_to_feature(o)
        if ft:
            feats.append(ft)
    return {"type": "FeatureCollection", "features": feats}


def _fallback_total_summary10(district: District) -> float:
    scores = []

    eco = getattr(district, "eco_stats", None)
    if eco and eco.eco_score is not None:
        scores.append(float(eco.eco_score))

    social = getattr(district, "social_stats", None)
    if social and social.social_score is not None:
        scores.append(float(social.social_score))

    noise = getattr(district, "noise_stats", None)
    if noise and noise.noise_score is not None:
        scores.append(float(noise.noise_score))

    if not scores:
        return 0.0

    return round(sum(scores) / len(scores), 1)


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def geo_districts(request):
    path = Path(settings.BASE_DIR) / "mapapi" / "data" / "moscow_districts.geojson"
    if not path.exists():
        return Response({"detail": f"GeoJSON not found: {path}"}, status=404)

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        feats = data.get("features", [])

        filtered = []
        for f in feats:
            props = f.get("properties") or {}
            name = props.get("district") or props.get("DISTRICT") or props.get("name") or ""
            if _is_new_moscow(name):
                continue
            filtered.append(f)

        data["features"] = filtered
        return Response(data)
    except Exception as e:
        return Response({"detail": f"Failed to read geojson: {e}"}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def districts_list(request):
    qs = District.objects.all().order_by("name")
    qs = [d for d in qs if not _is_new_moscow(d.name)]
    return Response([{"id": d.id, "name": d.name, "slug": d.slug} for d in qs])


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def district_rating_summary(request):
    qs = (
        District.objects
        .select_related("eco_stats", "social_stats", "noise_stats")
        .prefetch_related("ratings")
        .order_by("name")
    )

    out = []
    for d in qs:
        if _is_new_moscow(d.name):
            continue

        rating = d.ratings.order_by("-id").first()
        if rating and rating.summary_10 is not None:
            total_score = round(float(rating.summary_10), 1)
        else:
            total_score = _fallback_total_summary10(d)

        out.append({
            "slug": d.slug,
            "name": d.name,
            "summary10": total_score,
        })

    return Response(out)


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def eco_summary(request):
    qs = EcoDistrictStats.objects.select_related("district").order_by("district__name")
    out = []
    for s in qs:
        if _is_new_moscow(s.district.name):
            continue
        out.append({
            "slug": s.district.slug,
            "name": s.district.name,
            "ecoScore": round(float(s.eco_score), 1),
            "greenIndex": round(float(s.green_index), 1),
            "hazardIndex": round(float(s.hazard_index), 1),
            "parks": int(s.parks),
            "forests": int(s.forests),
            "hazardsCount": int(s.hazards_count),
            "updatedAt": s.updated_at.isoformat(),
        })
    return Response(out)


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def eco_district_detail(request, slug: str):
    district = get_object_or_404(District, slug=slug)
    if _is_new_moscow(district.name):
        return Response({"detail": "District excluded"}, status=404)

    stats = EcoDistrictStats.objects.filter(district=district).first()
    eco_layer = _get_eco_layer()

    if not eco_layer:
        return Response({
            "district": {"slug": district.slug, "name": district.name},
            "stats": None,
            "objects": {
                "parks": {"type": "FeatureCollection", "features": []},
                "forests": {"type": "FeatureCollection", "features": []},
                "hazards": {"type": "FeatureCollection", "features": []},
            },
        })

    cats = {c.slug: c for c in Category.objects.filter(layer=eco_layer)}
    parks_cat = cats.get("parks")
    forests_cat = cats.get("forests")
    hazards_cat = cats.get("hazards")

    base_qs = ObjectModel.objects.select_related("layer", "category", "district").filter(
        district=district, layer=eco_layer
    )

    parks_objs = list(base_qs.filter(category=parks_cat)) if parks_cat else []
    forests_objs = list(base_qs.filter(category=forests_cat)) if forests_cat else []
    hazards_objs = list(base_qs.filter(category=hazards_cat)) if hazards_cat else []

    return Response({
        "district": {"slug": district.slug, "name": district.name},
        "stats": {
            "ecoScore": round(float(stats.eco_score), 1) if stats else 0.0,
            "greenIndex": round(float(stats.green_index), 1) if stats else 0.0,
            "hazardIndex": round(float(stats.hazard_index), 1) if stats else 0.0,
            "parks": int(stats.parks) if stats else len(parks_objs),
            "forests": int(stats.forests) if stats else len(forests_objs),
            "hazardsCount": int(stats.hazards_count) if stats else len(hazards_objs),
        },
        "objects": {
            "parks": _feature_collection(parks_objs),
            "forests": _feature_collection(forests_objs),
            "hazards": _feature_collection(hazards_objs),
        },
    })


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def social_summary(request):
    qs = SocialDistrictStats.objects.select_related("district").order_by("district__name")
    out = []
    for s in qs:
        if _is_new_moscow(s.district.name):
            continue
        out.append({
            "slug": s.district.slug,
            "name": s.district.name,
            "socialScore": round(float(s.social_score), 1),
            "education": int(s.education),
            "health": int(s.health),
            "culture": int(s.culture),
            "sport": int(s.sport),
            "commerce": int(s.commerce),
            "updatedAt": s.updated_at.isoformat(),
        })
    return Response(out)


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def social_district_detail(request, slug: str):
    district = get_object_or_404(District, slug=slug)
    if _is_new_moscow(district.name):
        return Response({"detail": "District excluded"}, status=404)

    stats = SocialDistrictStats.objects.filter(district=district).first()
    social_layer = _get_social_layer()

    if not social_layer:
        return Response({
            "district": {"slug": district.slug, "name": district.name},
            "stats": None,
            "objects": {
                k: {"type": "FeatureCollection", "features": []}
                for k in ["education", "health", "culture", "sport", "commerce"]
            },
        })

    cats = {c.slug: c for c in Category.objects.filter(layer=social_layer)}

    base_qs = ObjectModel.objects.select_related("layer", "category", "district").filter(
        district=district, layer=social_layer
    )

    def fc(cat_slug: str):
        cat = cats.get(cat_slug)
        if not cat:
            return {"type": "FeatureCollection", "features": []}
        objs = list(base_qs.filter(category=cat))
        return _feature_collection(objs)

    return Response({
        "district": {"slug": district.slug, "name": district.name},
        "stats": {
            "socialScore": round(float(stats.social_score), 1) if stats else 0.0,
            "education": int(stats.education) if stats else 0,
            "health": int(stats.health) if stats else 0,
            "culture": int(stats.culture) if stats else 0,
            "sport": int(stats.sport) if stats else 0,
            "commerce": int(stats.commerce) if stats else 0,
        },
        "objects": {
            "education": fc("education"),
            "health": fc("health"),
            "culture": fc("culture"),
            "sport": fc("sport"),
            "commerce": fc("commerce"),
        },
    })


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def noise_summary(request):
    qs = NoiseDistrictStats.objects.select_related("district").order_by("district__name")
    out = []
    for s in qs:
        if _is_new_moscow(s.district.name):
            continue
        out.append({
            "slug": s.district.slug,
            "name": s.district.name,
            "noiseScore": round(float(s.noise_score), 1),
            "totalComplaints": int(s.total_complaints),
            "updatedAt": s.updated_at.isoformat(),
        })
    return Response(out)


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def noise_district_detail(request, slug: str):
    district = get_object_or_404(District, slug=slug)
    if _is_new_moscow(district.name):
        return Response({"detail": "District excluded"}, status=404)

    stats = NoiseDistrictStats.objects.filter(district=district).first()
    noise_layer = _get_noise_layer()

    if not noise_layer:
        return Response({
            "district": {"slug": district.slug, "name": district.name},
            "stats": {
                "noiseScore": 0.0,
                "totalComplaints": 0,
                "categories": [],
            },
            "objects": {
                "measurements": {"type": "FeatureCollection", "features": []},
            },
        })

    cats = {c.slug: c for c in Category.objects.filter(layer=noise_layer)}
    noise_cat = cats.get("noise_points")

    base_qs = ObjectModel.objects.select_related("layer", "category", "district").filter(
        district=district,
        layer=noise_layer
    )

    objs = list(base_qs.filter(category=noise_cat)) if noise_cat else list(base_qs)

    categories_map: Dict[str, int] = {}
    for obj in objs:
        props = obj.properties or {}
        name = (props.get("noise_category") or obj.name or "").strip()
        if not name:
            name = "Не указано"
        categories_map[name] = categories_map.get(name, 0) + 1

    categories = [
        {"name": name, "count": count}
        for name, count in sorted(categories_map.items(), key=lambda x: (-x[1], x[0]))
    ]

    return Response({
        "district": {"slug": district.slug, "name": district.name},
        "stats": {
            "noiseScore": round(float(stats.noise_score), 1) if stats else 0.0,
            "totalComplaints": int(stats.total_complaints) if stats else len(objs),
            "categories": categories,
        },
        "objects": {
            "measurements": _feature_collection(objs),
        },
    })
@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def update_stats(request):
    try:
        call_command("compute_eco_stats")
        call_command("compute_social_stats")
        call_command("compute_noise_stats")

        return Response({
            "status": "ok",
            "message": "Показатели успешно пересчитаны"
        })

    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)


@api_view(["GET"])
@permission_classes([AllowAny])
def district_recommendation(request, slug: str):
    district = get_object_or_404(District, slug=slug)

    eco = EcoDistrictStats.objects.filter(district=district).first()
    social = SocialDistrictStats.objects.filter(district=district).first()
    noise = NoiseDistrictStats.objects.filter(district=district).first()

    eco_score = float(eco.eco_score) if eco and eco.eco_score is not None else None
    social_score = float(social.social_score) if social and social.social_score is not None else None
    noise_score = float(noise.noise_score) if noise and noise.noise_score is not None else None
    available_scores = [
        value for value in [eco_score, social_score, noise_score]
        if value is not None
    ]

    total_score = round(sum(available_scores) / len(available_scores), 1) if available_scores else None

    payload = {
        "district": district.name,
        "slug": district.slug,
        "scores": {
            "eco": eco_score,
            "social": social_score,
            "noise": noise_score,
            "total": total_score,
        },
        "eco": {
            "greenIndex": float(eco.green_index) if eco and eco.green_index is not None else None,
            "hazardIndex": float(eco.hazard_index) if eco and eco.hazard_index is not None else None,
            "hazardSafeIndex": float(eco.hazard_safe_index) if eco and eco.hazard_safe_index is not None else None,
            "parks": int(eco.parks) if eco else None,
            "forests": int(eco.forests) if eco else None,
            "hazardsCount": int(eco.hazards_count) if eco else None,
        },
        "social": {
            "education": int(social.education) if social else None,
            "health": int(social.health) if social else None,
            "culture": int(social.culture) if social else None,
            "sport": int(social.sport) if social else None,
            "commerce": int(social.commerce) if social else None,
        },
        "noise": {
            "totalComplaints": int(noise.total_complaints) if noise else None,
        },
    }

    webhook_url = os.getenv(
        "N8N_RECOMMENDATION_WEBHOOK_URL",
        "http://127.0.0.1:5678/webhook-test/district-ai-analysis"
    )

    try:
        response = requests.post(webhook_url, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        return Response({
            "status": "error",
            "message": f"Не удалось получить AI-разбор района: {e}",
            "payload": payload,
        }, status=502)

    return Response({
        "status": "ok",
        "district": district.name,
        "slug": district.slug,
        "scores": payload["scores"],
        "recommendation": data.get("recommendation", data),
    })

import os
from io import StringIO

from django.core.management import call_command
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


def run_command(command_name, *args, **kwargs):
    output = StringIO()
    call_command(command_name, *args, stdout=output, stderr=output, **kwargs)
    return output.getvalue()


@api_view(["GET"])
@permission_classes([AllowAny])
def admin_import_ecology(request):
    api_key = os.environ.get("DATA_MOS_API_KEY")

    if not api_key:
        return Response({"error": "DATA_MOS_API_KEY is not set"}, status=500)

    result = run_command("import_ecology", api_key=api_key)

    return Response({
        "status": "ok",
        "step": "import_ecology",
        "result": result,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def admin_import_social(request):
    api_key = os.environ.get("DATA_MOS_API_KEY")

    if not api_key:
        return Response({"error": "DATA_MOS_API_KEY is not set"}, status=500)

    result = run_command("import_social", api_key=api_key)

    return Response({
        "status": "ok",
        "step": "import_social",
        "result": result,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def admin_import_noise(request):
    api_key = os.environ.get("DATA_MOS_API_KEY")

    if not api_key:
        return Response({"error": "DATA_MOS_API_KEY is not set"}, status=500)

    result = run_command("import_noise", api_key=api_key)

    return Response({
        "status": "ok",
        "step": "import_noise",
        "result": result,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def admin_compute_stats(request):
    eco_result = run_command("compute_eco_stats")
    social_result = run_command("compute_social_stats")
    noise_result = run_command("compute_noise_stats")

    return Response({
        "status": "ok",
        "step": "compute_stats",
        "eco": eco_result,
        "social": social_result,
        "noise": noise_result,
    })