from django.urls import path
from . import views

app_name = "mapapi"

urlpatterns = [
    path("api/geo/districts/", views.geo_districts, name="geo_districts"),
    path("api/districts/", views.districts_list, name="districts_list"),

    path("api/rating/summary/", views.district_rating_summary, name="district_rating_summary"),

    path("api/eco/summary/", views.eco_summary, name="eco_summary"),
    path("api/eco/district/<str:slug>/", views.eco_district_detail, name="eco_district_detail"),

    path("api/social/summary/", views.social_summary, name="social_summary"),
    path("api/social/district/<str:slug>/", views.social_district_detail, name="social_district_detail"),

    path("api/noise/summary/", views.noise_summary, name="noise_summary"),
    path("api/noise/district/<str:slug>/", views.noise_district_detail, name="noise_district_detail"),
path("api/admin/update-stats/", views.update_stats, name="update_stats"),
path(
    "api/recommendation/<str:slug>/",
    views.district_recommendation,
    name="district_recommendation",
),
    path("api/admin/import-ecology/", views.admin_import_ecology),
    path("api/admin/import-social/", views.admin_import_social),
    path("api/admin/import-noise/", views.admin_import_noise),
    path("api/admin/compute-stats/", views.admin_compute_stats),
]