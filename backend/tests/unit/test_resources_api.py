"""資源田數據查詢 API 單元測試."""

import time

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestResourcesAPI:
    """資源田 API 測試."""

    def test_get_resources_list(self) -> None:
        """測試取得所有資源田列表."""
        response = client.get("/api/v1/resources")
        assert response.status_code == 200

        data = response.json()
        assert "total" in data
        assert "resource_fields" in data
        assert data["total"] == 4  # wood, clay, iron, crop

        # 檢查資源田結構
        rf = data["resource_fields"][0]
        assert "resource_type" in rf
        assert "name_zh" in rf
        assert "name_en" in rf
        assert "max_level" in rf
        assert "max_level_capital" in rf

    def test_get_all_resource_types(self) -> None:
        """測試取得所有 4 種資源田類型."""
        response = client.get("/api/v1/resources")
        assert response.status_code == 200

        data = response.json()
        types = [rf["resource_type"] for rf in data["resource_fields"]]

        assert "wood" in types
        assert "clay" in types
        assert "iron" in types
        assert "crop" in types

    def test_get_resource_field_detail(self) -> None:
        """測試取得特定資源田詳細資料."""
        response = client.get("/api/v1/resources/wood")
        assert response.status_code == 200

        data = response.json()
        assert data["resource_type"] == "wood"
        assert data["name_zh"] == "伐木場"
        assert data["name_en"] == "Woodcutter"
        assert data["max_level"] == 10
        assert data["max_level_capital"] == 20
        assert "levels" in data
        assert len(data["levels"]) == 21  # Level 0-20

    def test_get_resource_field_all_types(self) -> None:
        """測試取得所有資源田類型詳情."""
        types = ["wood", "clay", "iron", "crop"]
        expected_names = {
            "wood": ("伐木場", "Woodcutter"),
            "clay": ("黏土坑", "Clay Pit"),
            "iron": ("鐵礦場", "Iron Mine"),
            "crop": ("農田", "Cropland"),
        }

        for res_type in types:
            response = client.get(f"/api/v1/resources/{res_type}")
            assert response.status_code == 200

            data = response.json()
            assert data["resource_type"] == res_type
            assert data["name_zh"] == expected_names[res_type][0]
            assert data["name_en"] == expected_names[res_type][1]

    def test_get_resource_level(self) -> None:
        """測試取得資源田特定等級資料."""
        response = client.get("/api/v1/resources/wood/levels/5")
        assert response.status_code == 200

        data = response.json()
        assert data["resource_type"] == "wood"
        assert data["level"] == 5
        assert "production_per_hour" in data
        assert "cost_wood" in data
        assert "cost_clay" in data
        assert "cost_iron" in data
        assert "cost_crop" in data
        assert "total_cost" in data
        assert "build_time_base" in data
        assert "population" in data
        assert "culture_points" in data
        assert "roi_hours" in data  # ROI 計算欄位

        # 驗證 total_cost 計算正確
        expected_total = (
            data["cost_wood"]
            + data["cost_clay"]
            + data["cost_iron"]
            + data["cost_crop"]
        )
        assert data["total_cost"] == expected_total

    def test_get_resource_level_zero(self) -> None:
        """測試取得等級 0 資料."""
        response = client.get("/api/v1/resources/wood/levels/0")
        assert response.status_code == 200

        data = response.json()
        assert data["level"] == 0
        assert data["production_per_hour"] == 2  # 基礎產量
        assert data["total_cost"] == 0  # 等級 0 無成本

    def test_get_resource_level_max(self) -> None:
        """測試取得最高等級 20 資料."""
        response = client.get("/api/v1/resources/wood/levels/20")
        assert response.status_code == 200

        data = response.json()
        assert data["level"] == 20
        assert data["roi_hours"] is None  # 最高等級無 ROI

    def test_get_resource_level_invalid(self) -> None:
        """測試查詢無效等級."""
        # 等級太低
        response = client.get("/api/v1/resources/wood/levels/-1")
        assert response.status_code == 400

        # 等級太高
        response = client.get("/api/v1/resources/wood/levels/21")
        assert response.status_code == 400

    def test_get_resource_upgrade_cost(self) -> None:
        """測試計算升級成本."""
        response = client.get(
            "/api/v1/resources/wood/upgrade-cost?from_level=0&to_level=5"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["resource_type"] == "wood"
        assert data["from_level"] == 0
        assert data["to_level"] == 5
        assert "cost" in data
        assert "total_cost" in data
        assert "total_build_time" in data
        assert "production_increase" in data

        # 驗證成本結構
        cost = data["cost"]
        assert "wood" in cost
        assert "clay" in cost
        assert "iron" in cost
        assert "crop" in cost

        # 驗證 total_cost
        expected_total = cost["wood"] + cost["clay"] + cost["iron"] + cost["crop"]
        assert data["total_cost"] == expected_total

    def test_get_resource_upgrade_cost_invalid_range(self) -> None:
        """測試無效的等級範圍."""
        # from_level >= to_level
        response = client.get(
            "/api/v1/resources/wood/upgrade-cost?from_level=5&to_level=3"
        )
        assert response.status_code == 400

    def test_get_resource_roi(self) -> None:
        """測試 ROI 計算."""
        response = client.get("/api/v1/resources/wood/roi")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

        # 檢查 ROI 資料結構
        roi_item = data[0]
        assert "from_level" in roi_item
        assert "to_level" in roi_item
        assert "roi_hours" in roi_item
        assert "upgrade_cost" in roi_item
        assert "production_increase" in roi_item

    def test_get_resource_roi_with_max_level(self) -> None:
        """測試指定最高等級的 ROI 計算."""
        response = client.get("/api/v1/resources/crop/roi?max_level=20")
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 20  # Level 0->1 到 Level 19->20

    def test_roi_calculation_correctness(self) -> None:
        """測試 ROI 計算正確性."""
        response = client.get("/api/v1/resources/wood/levels/5")
        assert response.status_code == 200

        data = response.json()
        roi_hours = data["roi_hours"]

        # 取得升級到下一等級的資料
        response_next = client.get("/api/v1/resources/wood/levels/6")
        next_data = response_next.json()

        # ROI = 升級成本 / 產量增加
        production_increase = (
            next_data["production_per_hour"] - data["production_per_hour"]
        )
        expected_roi = next_data["total_cost"] / production_increase

        # 允許小數點誤差
        assert abs(roi_hours - expected_roi) < 0.01

    def test_response_time(self) -> None:
        """測試回應時間應小於 200ms."""
        start = time.time()
        response = client.get("/api/v1/resources")
        elapsed = (time.time() - start) * 1000  # 轉換為毫秒

        assert response.status_code == 200
        assert elapsed < 200, f"Response time {elapsed:.2f}ms exceeds 200ms"

    def test_production_increases_with_level(self) -> None:
        """測試產量隨等級增加."""
        response = client.get("/api/v1/resources/iron")
        assert response.status_code == 200

        data = response.json()
        levels = data["levels"]

        for i in range(1, len(levels)):
            assert (
                levels[i]["production_per_hour"] > levels[i - 1]["production_per_hour"]
            )
