# Сериализаторы — это "переводчики" между моделями Django и JSON.
# Они:
# 1) Превращают объекты моделей в JSON (на выдачу фронту).
# 2) Проверяют входящий JSON и создают/обновляют записи в БД.

from rest_framework import serializers
from .models import (
    District, Layer, Category, Object as ObjectModel, LayerScore, DistrictRating
)

class DistrictSerializer(serializers.ModelSerializer):
    # ModelSerializer умеет сам настраиваться по модели (типы полей, ограничения)
    class Meta:
        model = District
        # Поля, которые отдадим/примем по API
        fields = ("id", "name", "slug", "created_at")
        # Эти поля фронт НЕ должен задавать руками
        read_only_fields = ("id", "created_at")

class LayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Layer
        fields = ("id", "slug", "name", "description", "is_active")
        read_only_fields = ("id",)

class CategorySerializer(serializers.ModelSerializer):
    # По умолчанию DRF ожидает id связанных объектов (layer_id),
    # поэтому поле "layer" будет числовым id в JSON.
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "layer")
        read_only_fields = ("id",)

class ObjectSerializer(serializers.ModelSerializer):
    # Объект (POI) привязан к слою, категории и (опционально) району — тоже по id
    class Meta:
        model = ObjectModel
        fields = ("id", "name", "address", "layer", "category", "district", "created_at")
        read_only_fields = ("id", "created_at")

class LayerScoreSerializer(serializers.ModelSerializer):
    # Оценка слоя для конкретного района (score 0..1 и score_10 0..10)
    class Meta:
        model = LayerScore
        fields = ("id", "district", "layer", "score", "score_10")
        read_only_fields = ("id",)

class DistrictRatingSerializer(serializers.ModelSerializer):
    # Сводная оценка района (агрегированная по слоям)
    class Meta:
        model = DistrictRating
        fields = ("id", "district", "summary_score", "summary_10")
        read_only_fields = ("id",)
