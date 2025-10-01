import sys
import os
import pytest
from jsonschema import validate
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.client import ApiClient
from src.schemas import list_users_schema, single_user_schema, created_user_schema, not_found_schema

# здесь мы задаем опцию base-url для тестов
@pytest.fixture(scope="module")
def base_url(pytestconfig):
    return pytestconfig.getoption("--base-url")

# здесь мы задаем фикстуру, которая создает экземпляр клиента и принимает как параметр наш base-url
@pytest.fixture(scope="module")
def client(base_url):
    # в headers при желании можно добавить заголовок авторизации Authorization и в тело вставить ключ, который отдал сервак
    return ApiClient(base_url=base_url, headers={"x-api-key": "reqres-free-v1"})

# здесь мы задаем фикстуру, которая запускается перед каждым тестом
@pytest.mark.api
def test_list_users_ok(client):
    resp = client.get("/users")
    # resp = client.get("/users")
    assert resp.status_code == 200
    data = resp.json()
    validate(instance=data, schema=list_users_schema)
    assert data["page"] == 1
    assert len(data["data"]) > 0

@pytest.mark.api
def test_single_user_ok(client):
    resp = client.get("/users/2", params={"x-api-key": "reqres-free-v1"})
    assert resp.status_code == 200
    data = resp.json()
    validate(instance=data, schema=single_user_schema)
    assert data["data"]["id"] == 2

@pytest.mark.api
def test_create_user_ok(client):
    payload = {"name": "morpheus", "job": "leader"}
    resp = client.post("/users", json=payload)
    assert resp.status_code in (200, 201)
    data = resp.json()
    # merge for required fields check
    merged = {**data, **payload}
    validate(instance=merged, schema=created_user_schema)
    assert data["id"]
    assert "createdAt" in data

@pytest.mark.api
@pytest.mark.negative
def test_user_not_found_404(client):
    resp = client.get("/users/23")
    assert resp.status_code == 404
    data = resp.json()
    validate(instance=data, schema=not_found_schema)

@pytest.mark.api
def test_delete_user_204(client):
    resp = client.delete("/users/2")
    assert resp.status_code in (204, 200)
    txt = resp.text.strip()
    assert txt == "" or txt.startswith("{") or txt.startswith("[")
