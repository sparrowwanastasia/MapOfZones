from django.db import models

# Create your models here.
class District(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True) 

    class Meta:
        indexes = [models.Index(fields=["slug"])]
        verbose_name = "Район";


    def __str__(self): return self.name
class Layer(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Слой";

    def __str__(self): return self.name

class Category(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    layer = models.ForeignKey(Layer, on_delete=models.CASCADE, related_name="categories")
    class Meta:
        verbose_name = "Категория";

    def __str__(self): return f"{self.layer.slug}:{self.slug}"

class Object(models.Model):
    name = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=300, blank=True)
    layer = models.ForeignKey(Layer, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        verbose_name = "Объект";

class LayerScore(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="layer_scores")
    layer = models.ForeignKey(Layer, on_delete=models.CASCADE, related_name="scores")
    score = models.DecimalField(max_digits=5, decimal_places=3)
    score_10 = models.DecimalField(max_digits=5, decimal_places=2)




class DistrictRating(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="ratings")
    summary_score = models.DecimalField(max_digits=5, decimal_places=3)
    summary_10 = models.DecimalField(max_digits=5, decimal_places=2)




