import pytest

@pytest.mark.django_db
def test_layers_crud(auth_api):
    # CREATE
    r = auth_api.post("/api/layers/", {"slug": "eco", "name": "Экология", "is_active": True}, format="json")
    assert r.status_code == 201, r.content
    lid = r.data["id"]

    # LIST
    assert auth_api.get("/api/layers/").status_code == 200

    # DETAIL
    r = auth_api.get(f"/api/layers/{lid}/")
    assert r.status_code == 200
    assert r.data["slug"] == "eco"

    # UPDATE
    r = auth_api.patch(f"/api/layers/{lid}/", {"description": "экологический слой"}, format="json")
    assert r.status_code == 200
    assert "эколог" in r.data["description"]

    # DELETE
    r = auth_api.delete(f"/api/layers/{lid}/")
    assert r.status_code == 204
