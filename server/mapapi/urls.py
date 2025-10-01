

# Здесь мы сопоставляем URL → вью-функции.
# В итоге получаем стандартный CRUD по каждому ресурсу.


from django.urls import path
from . import views
from django.views.generic import RedirectView

app_name = "mapapi"

urlpatterns = [

    # District
    path("api/districts/", views.districts_list_create, name="districts_list_create"),
    path("api/districts/<int:pk>/", views.districts_detail, name="districts_detail"),

    # Layer
    path("api/layers/", views.layers_list_create, name="layers_list_create"),
    path("api/layers/<int:pk>/", views.layers_detail, name="layers_detail"),

    # Category
    path("api/categories/", views.categories_list_create, name="categories_list_create"),
    path("api/categories/<int:pk>/", views.categories_detail, name="categories_detail"),

    # Object (POI)
    path("api/objects/", views.objects_list_create, name="objects_list_create"),
    path("api/objects/<int:pk>/", views.objects_detail, name="objects_detail"),

    # LayerScore
    path("api/layer-scores/", views.layer_scores_list_create, name="layer_scores_list_create"),
    path("api/layer-scores/<int:pk>/", views.layer_scores_detail, name="layer_scores_detail"),

    # DistrictRating
    path("api/district-ratings/", views.district_ratings_list_create, name="district_ratings_list_create"),
    path("api/district-ratings/<int:pk>/", views.district_ratings_detail, name="district_ratings_detail"),
]

