import pytest

@pytest.mark.django_db
def test_objects_crud(auth_api):
    # зависимости: layer, category, district
    layer = auth_api.post("/api/layers/", {"slug": "eco", "name": "Экология"}, format="json").data
    cat = auth_api.post("/api/categories/", {"name": "Парки", "slug": "parks", "layer": layer["id"]}, format="json").data
    dist = auth_api.post("/api/districts/", {"name": "Сокол", "slug": "sokol"}, format="json").data

    # CREATE
    payload = {
        "name": "Парк им. Чапаева",
        "address": "ул. Ленина, 1",
        "layer": layer["id"],
        "category": cat["id"],
        "district": dist["id"],
    }
    r = auth_api.post("/api/objects/", payload, format="json")
    assert r.status_code == 201, r.content
    oid = r.data["id"]

    # LIST + фильтры
    assert auth_api.get("/api/objects/").status_code == 200
    assert auth_api.get(f"/api/objects/?district={dist['id']}").status_code == 200
    assert auth_api.get(f"/api/objects/?layer={layer['id']}").status_code == 200
    assert auth_api.get(f"/api/objects/?category={cat['id']}").status_code == 200

    # DETAIL
    assert auth_api.get(f"/api/objects/{oid}/").status_code == 200

    # UPDATE
    r = auth_api.patch(f"/api/objects/{oid}/", {"name": "Парк Чапаева"}, format="json")
    assert r.status_code == 200
    assert "Чапаев" in r.data["name"]

    # DELETE
    assert auth_api.delete(f"/api/objects/{oid}/").status_code == 204
