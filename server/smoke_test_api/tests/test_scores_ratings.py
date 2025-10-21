import pytest

@pytest.mark.django_db
def test_scores_and_ratings(auth_api):
    dist = auth_api.post("/api/districts/", {"name": "Сокол", "slug": "sokol"}, format="json").data
    layer = auth_api.post("/api/layers/", {"slug": "eco", "name": "Экология"}, format="json").data

    # LayerScore
    score_payload = {"district": dist["id"], "layer": layer["id"], "score": "0.752", "score_10": "7.52"}
    r = auth_api.post("/api/layer-scores/", score_payload, format="json")
    assert r.status_code == 201, r.content
    sid = r.data["id"]

    assert auth_api.get("/api/layer-scores/").status_code == 200
    assert auth_api.get(f"/api/layer-scores/?district={dist['id']}").status_code == 200
    assert auth_api.get(f"/api/layer-scores/{sid}/").status_code == 200

    # DistrictRating
    rating_payload = {"district": dist["id"], "summary_score": "0.700", "summary_10": "7.00"}
    r = auth_api.post("/api/district-ratings/", rating_payload, format="json")
    assert r.status_code == 201
    rid = r.data["id"]

    assert auth_api.get("/api/district-ratings/").status_code == 200
    assert auth_api.get(f"/api/district-ratings/{rid}/").status_code == 200

    # обновим значения
    assert auth_api.patch(f"/api/district-ratings/{rid}/", {"summary_10": "7.10"}, format="json").status_code == 200

    # удалим оба
    assert auth_api.delete(f"/api/layer-scores/{sid}/").status_code == 204
    assert auth_api.delete(f"/api/district-ratings/{rid}/").status_code == 204
