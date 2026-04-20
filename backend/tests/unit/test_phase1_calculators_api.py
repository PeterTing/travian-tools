"""API-level tests for Phase 1 calculator endpoints.

Covers:
- POST /api/v1/advanced-calculator/village-builder
- POST /api/v1/advanced-calculator/crop-scouter
- POST /api/v1/advanced-calculator/ts-optimizer
- POST /api/v1/advanced-calculator/fake-troops
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestVillageBuilderAPI:
    """Village Builder endpoint tests."""

    def test_happy_path_15c(self) -> None:
        payload = {
            "cropper_type": "15c",
            "oases": [],
            "tribe_egyptian": False,
            "gold_plus": False,
            "target_field_level": 18,
        }
        r = client.post("/api/v1/advanced-calculator/village-builder", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["cropper_type"] == "15c"
        assert body["total_steps"] == len(body["build_sequence"])
        assert body["total_steps"] > 0

    def test_invalid_target_level_422(self) -> None:
        """target_field_level outside 10-20 should be rejected by Pydantic."""
        r = client.post(
            "/api/v1/advanced-calculator/village-builder",
            json={"cropper_type": "9c", "target_field_level": 25},
        )
        assert r.status_code == 422


class TestCropScouterAPI:
    """Crop Scouter endpoint tests."""

    def test_happy_path_15c_detection(self) -> None:
        payload = {
            "wood_production": 1000,
            "clay_production": 1000,
            "iron_production": 1000,
            "crop_production": 9000,
            "population": 600,
            "server_speed": 1,
        }
        r = client.post("/api/v1/advanced-calculator/crop-scouter", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["dominant_resource"] == "crop"
        assert body["matches"][0]["cropper_type"] == "15c"


class TestTsOptimizerAPI:
    """TS Optimizer endpoint tests."""

    def test_single_attacker(self) -> None:
        payload = {
            "target_x": 0,
            "target_y": 0,
            "target_arrival": "2030-01-01T12:00:00+00:00",
            "attackers": [
                {
                    "village_label": "A",
                    "x": 10,
                    "y": 0,
                    "unit_speed": 6,
                    "ts_level": 0,
                    "allow_ts_adjustment": False,
                }
            ],
            "wave_spacing_seconds": 1.0,
            "server_speed": 1,
        }
        r = client.post("/api/v1/advanced-calculator/ts-optimizer", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert len(body["results"]) == 1
        assert body["results"][0]["village_label"] == "A"

    def test_empty_attackers_422(self) -> None:
        """Empty attackers list should be rejected."""
        payload = {
            "target_x": 0,
            "target_y": 0,
            "target_arrival": "2030-01-01T12:00:00+00:00",
            "attackers": [],
        }
        r = client.post("/api/v1/advanced-calculator/ts-optimizer", json=payload)
        assert r.status_code == 422


class TestFakeTroopsAPI:
    """Fake Troops endpoint tests."""

    def test_happy_path(self) -> None:
        payload = {
            "target_population": 500,
            "attacker_tribe": "romans",
            "include_catapults": True,
            "include_rams": True,
        }
        r = client.post("/api/v1/advanced-calculator/fake-troops", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["min_infantry"] > 0
        assert body["min_catapults"] > 0

    def test_no_catapults(self) -> None:
        payload = {
            "target_population": 500,
            "attacker_tribe": "teutons",
            "include_catapults": False,
            "include_rams": False,
        }
        r = client.post("/api/v1/advanced-calculator/fake-troops", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["min_catapults"] == 0
        assert body["min_rams"] == 0
