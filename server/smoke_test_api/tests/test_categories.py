import pytest

@pytest.mark.django_db
def test_categories_crud(auth_api):
    # зависимость: Layer
    l = auth_api.post("/api/layers/", {"slug": "eco", "name": "Экология"}, format="json").data

    # CREATE
    payload = {"name": "Парки", "slug": "parks", "layer": l["id"]}
    r = auth_api.post("/api/categories/", payload, format="json")
    assert r.status_code == 201, r.content
    cid = r.data["id"]

    # LIST (+ фильтр по слою)
    assert auth_api.get("/api/categories/").status_code == 200
    assert auth_api.get(f"/api/categories/?layer={l['id']}").status_code == 200

    # DETAIL
    assert auth_api.get(f"/api/categories/{cid}/").status_code == 200

    # UPDATE
    r = auth_api.patch(f"/api/categories/{cid}/", {"name": "Парковые зоны"}, format="json")
    assert r.status_code == 200
    assert "Парков" in r.data["name"]

    # DELETE
    assert auth_api.delete(f"/api/categories/{cid}/").status_code == 204
