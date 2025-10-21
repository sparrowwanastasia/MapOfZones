import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

@pytest.fixture
def api():
    """
    Неавторизованный клиент: можно читать (GET),
    но POST/PUT/PATCH/DELETE будет 403 (если стоит IsAuthenticatedOrReadOnly).
    """
    return APIClient()

@pytest.fixture
def auth_user(db):
    """
    Создаём обычного пользователя для авторизации.
    Если для записи нужны права staff/superuser — просто поменяй флаги ниже.
    """
    User = get_user_model()
    user = User.objects.create_user(
        username="tester", password="pass12345", is_staff=True
    )
    return user

@pytest.fixture
def auth_api(api, auth_user):
    """
    Авторизованный клиент (сессионная аутентификация).
    Подходит, если во views стоит IsAuthenticatedOrReadOnly.
    """
    api.login(username="tester", password="pass12345")
    return api
