import pytest

@pytest.mark.django_db
def test_districts_crud(auth_api):
    # CREATE
    r = auth_api.post("/api/districts/", {"name": "Сокол", "slug": "sokol"}, format="json")
    assert r.status_code == 201, r.content
    did = r.data["id"]

    # LIST
    r = auth_api.get("/api/districts/")
    assert r.status_code == 200
    assert any(d["id"] == did for d in r.json())

    # DETAIL
    r = auth_api.get(f"/api/districts/{did}/")
    assert r.status_code == 200
    assert r.data["slug"] == "sokol"

    # UPDATE (PATCH)
    r = auth_api.patch(f"/api/districts/{did}/", {"name": "Сокол (обновл.)"}, format="json")
    assert r.status_code == 200
    assert "обновл" in r.data["name"]

    # DELETE
    r = auth_api.delete(f"/api/districts/{did}/")
    assert r.status_code == 204
