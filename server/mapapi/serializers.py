from rest_framework import serializers
from .models import (
    District, Layer, Category, Object as ObjectModel, LayerScore, DistrictRating, EcoDistrictStats
)


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ("id", "name", "slug", "created_at")
        read_only_fields = ("id", "created_at")


class LayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Layer
        fields = ("id", "slug", "name", "description", "is_active")
        read_only_fields = ("id",)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "layer")
        read_only_fields = ("id",)


class ObjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjectModel
        fields = ("id", "name", "address", "layer", "category", "district", "geometry", "lon", "lat", "created_at")
        read_only_fields = ("id", "created_at")


class LayerScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = LayerScore
        fields = ("id", "district", "layer", "score", "score_10")
        read_only_fields = ("id",)


class DistrictRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistrictRating
        fields = ("id", "district", "summary_score", "summary_10")
        read_only_fields = ("id",)


class EcoDistrictStatsSerializer(serializers.ModelSerializer):
    district_slug = serializers.CharField(source="district.slug", read_only=True)
    district_name = serializers.CharField(source="district.name", read_only=True)

    class Meta:
        model = EcoDistrictStats
        fields = (
            "district", "district_slug", "district_name",
            "yards", "parks", "hazards_count",
            "green_index", "hazard_index", "hazard_safe_index", "eco_score",
            "updated_at",
        )
        read_only_fields = ("updated_at", "district_slug", "district_name")
