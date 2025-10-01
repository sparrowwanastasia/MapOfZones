# Вью-функции (FBV) — это "контроллеры".
# Каждая функция принимает HTTP-запрос, вызывает нужную логику и возвращает JSON.

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import (
    District, Layer, Category, Object as ObjectModel, LayerScore, DistrictRating
)
from .serializers import (
    DistrictSerializer, LayerSerializer, CategorySerializer,
    ObjectSerializer, LayerScoreSerializer, DistrictRatingSerializer
)

# ---------------------------------------------------
# District (Районы)
# ---------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrReadOnly])  # читать могут все, писать только авторизованные
def districts_list(request):
    if request.method == "GET":
        # Список районов
        qs = District.objects.all()
        data = DistrictSerializer(qs, many=True).data
        return Response(data, status=status.HTTP_200_OK)
def districts_list_sort_by_name(request):
    if request.method == "GET":
        # Список районов, отсортированных по имени
        qs = District.objects.all().order_by("name")
        data = DistrictSerializer(qs, many=True).data
        return Response(data, status=status.HTTP_200_OK)
def districts_list_sort_by_rating(request):
    if request.method == "GET":
        # Список районов, отсортированных по рейтингу
        qs = District.objects.all().order_by("rating")
        data = DistrictSerializer(qs, many=True).data
        return Response(data, status=status.HTTP_200_OK)
def districts_list_create(request):
    # POST — создание нового района из JSON тела запроса
    ser = DistrictSerializer(data=request.data)
    if ser.is_valid():
        ser.save()  # создаст запись в БД
        return Response(ser.data, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
def districts_detail(request, pk: int):
    if request.method == "GET":
        # Получаем район по его первичному ключу (id). Если нет — вернём 404.
        obj = get_object_or_404(District, pk=pk)
        return Response(DistrictSerializer(obj).data)
def districts_detail_update(request, pk: int):
    if request.method in ("PUT", "PATCH"):
        # Получаем район по его первичному ключу (id). Если нет — вернём 404.
        obj = get_object_or_404(District, pk=pk)
        # PUT — полная замена; PATCH — частичное обновление
        partial = (request.method == "PATCH")
        ser = DistrictSerializer(obj, data=request.data, partial=partial)
        if ser.is_valid():
            if ser.save():
                return Response(ser.data)
            else:
                return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
def districts_detail_delete(request, pk: int):
    if request.method == "DELETE":
        # Получаем район по его первичному ключу (id). Если нет — вернём 404.
        obj = get_object_or_404(District, pk=pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticatedOrReadOnly])
def districts_detail(request, pk: int):
    # Берём район по его первичному ключу (id). Если нет — вернём 404.
    obj = get_object_or_404(District, pk=pk)

    if request.method == "GET":
        return Response(DistrictSerializer(obj).data)

    if request.method in ("PUT", "PATCH"):
        # PUT — полная замена; PATCH — частичное обновление
        partial = (request.method == "PATCH")
        ser = DistrictSerializer(obj, data=request.data, partial=partial)
        if ser.is_valid():
            ser.save()  # сохранить изменения
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE — удаление района
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------
# Layer (Слои)
# ---------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def layers_list_create(request):
    if request.method == "GET":
        qs = Layer.objects.all().order_by("name")
        return Response(LayerSerializer(qs, many=True).data)

    ser = LayerSerializer(data=request.data)
    if ser.is_valid():
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticatedOrReadOnly])
def layers_detail(request, pk: int):
    obj = get_object_or_404(Layer, pk=pk)

    if request.method == "GET":
        return Response(LayerSerializer(obj).data)

    if request.method in ("PUT", "PATCH"):
        ser = LayerSerializer(obj, data=request.data, partial=(request.method == "PATCH"))
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------
# Category (Категории объектов внутри слоя)
# ---------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def categories_list_create(request):
    if request.method == "GET":
        qs = Category.objects.all()
        # Простейший фильтр: ?layer=<id> — посмотреть категории только выбранного слоя
        layer_id = request.GET.get("layer")
        if layer_id:
            qs = qs.filter(layer_id=layer_id)
        qs = qs.order_by("name")
        return Response(CategorySerializer(qs, many=True).data)

    ser = CategorySerializer(data=request.data)
    if ser.is_valid():
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticatedOrReadOnly])
def categories_detail(request, pk: int):
    obj = get_object_or_404(Category, pk=pk)

    if request.method == "GET":
        return Response(CategorySerializer(obj).data)

    if request.method in ("PUT", "PATCH"):
        ser = CategorySerializer(obj, data=request.data, partial=(request.method == "PATCH"))
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------
# Object (POI/Объекты слоя в районах)
# ---------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def objects_list_create(request):
    if request.method == "GET":
        # Подтягиваем связи (layer/category/district), чтобы не делать лишние запросы
        qs = ObjectModel.objects.select_related("layer", "category", "district")

        # Фильтры в строке запроса: ?district=<id>&layer=<id>&category=<id>
        d = request.GET.get("district")
        l = request.GET.get("layer")
        c = request.GET.get("category")
        if d: qs = qs.filter(district_id=d)
        if l: qs = qs.filter(layer_id=l)
        if c: qs = qs.filter(category_id=c)

        qs = qs.order_by("name")
        return Response(ObjectSerializer(qs, many=True).data)

    # Создание нового объекта из JSON
    ser = ObjectSerializer(data=request.data)
    if ser.is_valid():
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticatedOrReadOnly])
def objects_detail(request, pk: int):
    obj = get_object_or_404(ObjectModel, pk=pk)

    if request.method == "GET":
        return Response(ObjectSerializer(obj).data)

    if request.method in ("PUT", "PATCH"):
        ser = ObjectSerializer(obj, data=request.data, partial=(request.method == "PATCH"))
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------
# LayerScore (Баллы по слоям в районе)
# ---------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def layer_scores_list_create(request):
    if request.method == "GET":
        qs = LayerScore.objects.select_related("district", "layer")
        # Фильтры: ?district=<id>&layer=<id>
        d = request.GET.get("district")
        l = request.GET.get("layer")
        if d: qs = qs.filter(district_id=d)
        if l: qs = qs.filter(layer_id=l)
        qs = qs.order_by("district__name", "layer__name")
        return Response(LayerScoreSerializer(qs, many=True).data)

    ser = LayerScoreSerializer(data=request.data)
    if ser.is_valid():
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticatedOrReadOnly])
def layer_scores_detail(request, pk: int):
    obj = get_object_or_404(LayerScore, pk=pk)

    if request.method == "GET":
        return Response(LayerScoreSerializer(obj).data)

    if request.method in ("PUT", "PATCH"):
        ser = LayerScoreSerializer(obj, data=request.data, partial=(request.method == "PATCH"))
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------
# DistrictRating (Сводный рейтинг района)
# ---------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def district_ratings_list_create(request):
    if request.method == "GET":
        qs = DistrictRating.objects.select_related("district").order_by("district__name")
        return Response(DistrictRatingSerializer(qs, many=True).data)

    ser = DistrictRatingSerializer(data=request.data)
    if ser.is_valid():
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticatedOrReadOnly])
def district_ratings_detail(request, pk: int):
    obj = get_object_or_404(DistrictRating, pk=pk)

    if request.method == "GET":
        return Response(DistrictRatingSerializer(obj).data)

    if request.method in ("PUT", "PATCH"):
        ser = DistrictRatingSerializer(obj, data=request.data, partial=(request.method == "PATCH"))
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
from django.shortcuts import render

# Create your views here.
