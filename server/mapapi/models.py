from django.db import models


class District(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["slug"])]
        verbose_name = "Район"

    def __str__(self):
        return self.name


class Layer(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Слой"

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    layer = models.ForeignKey(Layer, on_delete=models.CASCADE, related_name="categories")

    class Meta:
        verbose_name = "Категория"

    def __str__(self):
        return f"{self.layer.slug}:{self.slug}"


class Object(models.Model):
    """
    Универсальные объекты слоя (POI/полигоны).
    GeoJSON geometry храним в JSONField (без PostGIS).
    """
    name = models.CharField(max_length=200, blank=True)
    address = models.CharField(max_length=300, blank=True)

    layer = models.ForeignKey(Layer, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True)

    geometry = models.JSONField(null=True, blank=True)
    properties = models.JSONField(default=dict, blank=True)

    lon = models.FloatField(null=True, blank=True)
    lat = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Объект"
        indexes = [
            models.Index(fields=["district", "layer", "category"]),
            models.Index(fields=["layer", "category"]),
        ]

    def __str__(self):
        return self.name or f"Object {self.pk}"


class LayerScore(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="layer_scores")
    layer = models.ForeignKey(Layer, on_delete=models.CASCADE, related_name="scores")
    score = models.DecimalField(max_digits=5, decimal_places=3)      # 0..1
    score_10 = models.DecimalField(max_digits=5, decimal_places=2)   # 0..10

    class Meta:
        indexes = [models.Index(fields=["district", "layer"])]

    def __str__(self):
        return f"{self.district.slug}:{self.layer.slug}={self.score_10}"


class DistrictRating(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="ratings")
    summary_score = models.DecimalField(max_digits=5, decimal_places=3)
    summary_10 = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        indexes = [models.Index(fields=["district"])]

    def __str__(self):
        return f"{self.district.slug}:{self.summary_10}"


class EcoDistrictStats(models.Model):
    district = models.OneToOneField(District, on_delete=models.CASCADE, related_name="eco_stats")

    parks = models.IntegerField(default=0)
    forests = models.IntegerField(default=0)
    hazards_count = models.IntegerField(default=0)

    green_index = models.FloatField(default=0.0)
    hazard_index = models.FloatField(default=0.0)
    hazard_safe_index = models.FloatField(default=0.0)
    eco_score = models.FloatField(default=0.0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Eco статистика района"

    def __str__(self):
        return f"{self.district.slug}: {self.eco_score}"


class SocialDistrictStats(models.Model):
    district = models.OneToOneField(District, on_delete=models.CASCADE, related_name="social_stats")

    education = models.IntegerField(default=0)
    health = models.IntegerField(default=0)
    culture = models.IntegerField(default=0)
    sport = models.IntegerField(default=0)
    commerce = models.IntegerField(default=0)

    social_score = models.FloatField(default=0.0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Social статистика района"

    def __str__(self):
        return f"{self.district.slug}: {self.social_score}"


class NoiseDistrictStats(models.Model):
    """
    Шумовой слой = обращения по шуму.
    Считаем только количество обращений и их типы.
    """
    district = models.OneToOneField(District, on_delete=models.CASCADE, related_name="noise_stats")

    total_complaints = models.IntegerField(default=0)

    construction_count = models.IntegerField(default=0)
    road_repair_count = models.IntegerField(default=0)
    ventilation_count = models.IntegerField(default=0)
    loading_count = models.IntegerField(default=0)
    other_count = models.IntegerField(default=0)

    noise_score = models.FloatField(default=0.0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Noise статистика района"

    def __str__(self):
        return f"{self.district.slug}: {self.noise_score}"