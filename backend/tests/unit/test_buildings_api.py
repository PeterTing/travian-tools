"""建築數據查詢 API 單元測試."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestBuildingsAPI:
    """建築 API 測試."""

    def test_get_buildings_list(self) -> None:
        """測試取得所有建築列表."""
        response = client.get("/api/v1/buildings")
        assert response.status_code == 200

        data = response.json()
        assert "total" in data
        assert "buildings" in data
        assert data["total"] > 0
        assert len(data["buildings"]) == data["total"]

        # 檢查建築結構
        building = data["buildings"][0]
        assert "building_id" in building
        assert "name_zh" in building
        assert "name_en" in building
        assert "category" in building
        assert "max_level" in building

    def test_get_buildings_by_category(self) -> None:
        """測試依類別篩選建築."""
        response = client.get("/api/v1/buildings?category=military")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

        # 所有建築都應該是軍事類
        for building in data["buildings"]:
            assert building["category"] == "military"

    def test_get_buildings_search_chinese(self) -> None:
        """測試中文名稱搜尋."""
        response = client.get("/api/v1/buildings?search=兵營")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

        # 檢查搜尋結果包含關鍵字
        for building in data["buildings"]:
            assert (
                "兵營" in building["name_zh"] or "barracks" in building["building_id"]
            )

    def test_get_buildings_search_english(self) -> None:
        """測試英文名稱搜尋."""
        response = client.get("/api/v1/buildings?search=barracks")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

    def test_get_building_detail(self) -> None:
        """測試取得單一建築詳細資料."""
        response = client.get("/api/v1/buildings/main_building")
        assert response.status_code == 200

        data = response.json()
        assert data["building_id"] == "main_building"
        assert data["name_zh"] == "本部"
        assert data["name_en"] == "Main Building"
        assert data["category"] == "infrastructure"
        assert data["max_level"] == 20
        assert "levels" in data
        assert len(data["levels"]) == 20

    def test_get_building_detail_not_found(self) -> None:
        """測試查詢不存在的建築."""
        response = client.get("/api/v1/buildings/nonexistent_building")
        assert response.status_code == 404

        data = response.json()
        assert "detail" in data

    def test_get_building_level(self) -> None:
        """測試取得建築特定等級資料."""
        response = client.get("/api/v1/buildings/main_building/levels/10")
        assert response.status_code == 200

        data = response.json()
        assert data["building_id"] == "main_building"
        assert data["level"] == 10
        assert "cost_wood" in data
        assert "cost_clay" in data
        assert "cost_iron" in data
        assert "cost_crop" in data
        assert "total_cost" in data
        assert "build_time_base" in data
        assert "population" in data
        assert "culture_points" in data

        # 驗證 total_cost 計算正確
        expected_total = (
            data["cost_wood"]
            + data["cost_clay"]
            + data["cost_iron"]
            + data["cost_crop"]
        )
        assert data["total_cost"] == expected_total

    def test_get_building_level_invalid_level(self) -> None:
        """測試查詢無效等級."""
        # 等級太低
        response = client.get("/api/v1/buildings/main_building/levels/0")
        assert response.status_code == 400

        # 等級太高
        response = client.get("/api/v1/buildings/main_building/levels/21")
        assert response.status_code == 400

    def test_get_building_level_not_found(self) -> None:
        """測試查詢不存在建築的等級."""
        response = client.get("/api/v1/buildings/nonexistent/levels/1")
        assert response.status_code == 404

    def test_get_upgrade_cost(self) -> None:
        """測試計算升級成本."""
        response = client.get(
            "/api/v1/buildings/main_building/upgrade-cost?from_level=0&to_level=5"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["building_id"] == "main_building"
        assert data["from_level"] == 0
        assert data["to_level"] == 5
        assert "cost" in data
        assert "total_cost" in data

        # 驗證成本結構
        cost = data["cost"]
        assert "wood" in cost
        assert "clay" in cost
        assert "iron" in cost
        assert "crop" in cost

        # 驗證 total_cost
        expected_total = cost["wood"] + cost["clay"] + cost["iron"] + cost["crop"]
        assert data["total_cost"] == expected_total

    def test_get_upgrade_cost_invalid_range(self) -> None:
        """測試無效的等級範圍."""
        # from_level >= to_level
        response = client.get(
            "/api/v1/buildings/main_building/upgrade-cost?from_level=5&to_level=3"
        )
        assert response.status_code == 400

    def test_get_upgrade_cost_building_not_found(self) -> None:
        """測試查詢不存在建築的升級成本."""
        response = client.get(
            "/api/v1/buildings/nonexistent/upgrade-cost?from_level=0&to_level=5"
        )
        assert response.status_code == 404

    def test_response_time(self) -> None:
        """測試回應時間應小於 200ms."""
        import time

        start = time.time()
        response = client.get("/api/v1/buildings")
        elapsed = (time.time() - start) * 1000  # 轉換為毫秒

        assert response.status_code == 200
        assert elapsed < 200, f"Response time {elapsed:.2f}ms exceeds 200ms"

    def test_get_building_with_prerequisites(self) -> None:
        """測試取得有前置需求的建築."""
        # 兵營需要本部和集結點
        response = client.get("/api/v1/buildings/barracks")
        assert response.status_code == 200

        data = response.json()
        assert "prerequisites" in data
        # 檢查前置需求結構
        for prereq in data["prerequisites"]:
            assert "building_id" in prereq
            assert "level" in prereq

    def test_get_tribe_specific_building(self) -> None:
        """測試取得種族限定建築."""
        # 羅馬城牆
        response = client.get("/api/v1/buildings/city_wall")
        assert response.status_code == 200

        data = response.json()
        assert data["category"] == "defense"
