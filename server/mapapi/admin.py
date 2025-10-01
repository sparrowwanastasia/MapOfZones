from django.contrib import admin
from .models import District, Layer, Category, Object  # импортируем модели, которые хотим видеть в админке

# Регистрируем модель "Район" в админке
@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    # какие поля показывать в таблице списка районов
    list_display = ("name", "slug", "created_at")
    search_fields = ("name", "slug")

@admin.register(Layer)
class LayerAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    search_fields = ("name", "slug")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):

    list_display = ("name", "slug", "layer")
    list_filter = ("layer",)
    search_fields = ("name", "slug")

@admin.register(Object)
class ObjectAdmin(admin.ModelAdmin):
    list_display = ("name", "layer", "category", "district","created_at")
    list_filter = ("layer", "category", "district")
    search_fields = ("name", "address", "source_name")
