"""計算器 API 單元測試."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestCalculatorAPI:
    """計算器 API 測試."""

    def test_calculator_info(self) -> None:
        """測試計算器端點資訊."""
        response = client.get("/api/v1/calculator/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Travian Calculator API"

    # ============ 建築升級計算器測試 ============

    def test_building_upgrade_basic(self) -> None:
        """測試基本建築升級計算."""
        response = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "main_building",
                "from_level": 0,
                "to_level": 5,
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["building_id"] == "main_building"
        assert data["from_level"] == 0
        assert data["to_level"] == 5
        assert "cost" in data
        assert "total_cost" in data
        assert "build_time_base" in data
        assert "build_time_actual" in data
        assert "build_time_formatted" in data
        assert "population_increase" in data
        assert "culture_points" in data

    def test_building_upgrade_with_main_building_level(self) -> None:
        """測試含本部等級加成的建築升級計算."""
        # 本部等級 1
        response1 = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "barracks",
                "from_level": 0,
                "to_level": 5,
                "main_building_level": 1,
            },
        )
        assert response1.status_code == 200
        data1 = response1.json()

        # 本部等級 10（應該更快）
        response2 = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "barracks",
                "from_level": 0,
                "to_level": 5,
                "main_building_level": 10,
            },
        )
        assert response2.status_code == 200
        data2 = response2.json()

        # 基礎時間應該相同
        assert data1["build_time_base"] == data2["build_time_base"]
        # 實際時間應該更短（本部等級越高越快）
        assert data2["build_time_actual"] < data1["build_time_actual"]

    def test_building_upgrade_with_server_speed(self) -> None:
        """測試含伺服器速度的建築升級計算."""
        # 1x 速度
        response1 = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "warehouse",
                "from_level": 0,
                "to_level": 5,
                "server_speed": 1.0,
            },
        )
        assert response1.status_code == 200
        data1 = response1.json()

        # 3x 速度
        response2 = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "warehouse",
                "from_level": 0,
                "to_level": 5,
                "server_speed": 3.0,
            },
        )
        assert response2.status_code == 200
        data2 = response2.json()

        # 3x 速度應該是 1x 的 1/3 時間
        assert data2["build_time_actual"] < data1["build_time_actual"]

    def test_building_upgrade_invalid_range(self) -> None:
        """測試無效等級範圍."""
        response = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "main_building",
                "from_level": 5,
                "to_level": 3,
            },
        )
        assert response.status_code == 400

    def test_building_upgrade_not_found(self) -> None:
        """測試不存在的建築."""
        response = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "nonexistent_building",
                "from_level": 0,
                "to_level": 5,
            },
        )
        assert response.status_code == 404

    # ============ 資源田 ROI 計算器測試 ============

    def test_resource_roi_basic(self) -> None:
        """測試基本資源田 ROI 計算."""
        response = client.post(
            "/api/v1/calculator/resource/roi",
            json={
                "resource_type": "wood",
                "current_level": 5,
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["resource_type"] == "wood"
        assert data["current_level"] == 5
        assert data["next_level"] == 6
        assert "upgrade_cost" in data
        assert "total_cost" in data
        assert "current_production" in data
        assert "next_production" in data
        assert "production_increase" in data
        assert "roi_hours" in data
        assert "roi_formatted" in data

    def test_resource_roi_with_bonus(self) -> None:
        """測試含加成的 ROI 計算."""
        # 無加成
        response1 = client.post(
            "/api/v1/calculator/resource/roi",
            json={
                "resource_type": "iron",
                "current_level": 5,
            },
        )
        data1 = response1.json()

        # 25% 綠洲加成
        response2 = client.post(
            "/api/v1/calculator/resource/roi",
            json={
                "resource_type": "iron",
                "current_level": 5,
                "oasis_bonus": 25,
            },
        )
        data2 = response2.json()

        # 有加成的產量應該更高
        assert data2["current_production"] > data1["current_production"]
        assert data2["next_production"] > data1["next_production"]

    def test_resource_roi_not_found(self) -> None:
        """測試不存在的資源類型."""
        response = client.post(
            "/api/v1/calculator/resource/roi",
            json={
                "resource_type": "gold",
                "current_level": 5,
            },
        )
        assert response.status_code == 404

    def test_resource_roi_batch(self) -> None:
        """測試批量 ROI 計算."""
        response = client.post(
            "/api/v1/calculator/resource/roi/batch",
            json={
                "resource_fields": [
                    {"resource_type": "wood", "current_level": 3},
                    {"resource_type": "clay", "current_level": 4},
                    {"resource_type": "iron", "current_level": 2},
                    {"resource_type": "crop", "current_level": 5},
                ],
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert "results" in data
        assert "recommended_order" in data
        assert len(data["results"]) == 4
        assert len(data["recommended_order"]) == 4

        # 結果應該按 ROI 排序（回本時間短的優先）
        roi_values = [r["roi_hours"] for r in data["results"]]
        assert roi_values == sorted(roi_values)

    def test_resource_roi_batch_with_oasis_bonus(self) -> None:
        """測試含綠洲加成的批量 ROI 計算."""
        response = client.post(
            "/api/v1/calculator/resource/roi/batch",
            json={
                "resource_fields": [
                    {"resource_type": "wood", "current_level": 5},
                    {"resource_type": "crop", "current_level": 5},
                ],
                "oasis_bonus": {
                    "crop": 25,  # 糧食有 25% 綠洲加成
                },
            },
        )
        assert response.status_code == 200

    # ============ 戰鬥模擬器測試 ============

    def test_battle_simulate_basic(self) -> None:
        """測試基本戰鬥模擬."""
        response = client.post(
            "/api/v1/calculator/battle/simulate",
            json={
                "attacker_troops": [{"troop_id": "legionnaire", "count": 100}],
                "defender_troops": [{"troop_id": "phalanx", "count": 50}],
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert "result" in data
        assert data["result"] in ["attacker_wins", "defender_wins", "draw"]
        assert "attacker_losses" in data
        assert "defender_losses" in data
        assert "attacker_survival_rate" in data
        assert "defender_survival_rate" in data

    def test_battle_simulate_with_wall(self) -> None:
        """測試含城牆的戰鬥模擬."""
        # 無城牆
        response1 = client.post(
            "/api/v1/calculator/battle/simulate",
            json={
                "attacker_troops": [{"troop_id": "imperian", "count": 100}],
                "defender_troops": [{"troop_id": "praetorian", "count": 50}],
                "wall_level": 0,
            },
        )
        data1 = response1.json()

        # 有城牆
        response2 = client.post(
            "/api/v1/calculator/battle/simulate",
            json={
                "attacker_troops": [{"troop_id": "imperian", "count": 100}],
                "defender_troops": [{"troop_id": "praetorian", "count": 50}],
                "wall_level": 10,
            },
        )
        data2 = response2.json()

        # 有城牆時攻擊方損失應該更多
        assert (
            data2["attacker_losses"]["imperian"] >= data1["attacker_losses"]["imperian"]
        )

    def test_battle_simulate_no_defenders(self) -> None:
        """測試無防守部隊的戰鬥模擬."""
        response = client.post(
            "/api/v1/calculator/battle/simulate",
            json={
                "attacker_troops": [{"troop_id": "clubswinger", "count": 50}],
                "defender_troops": [],
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["result"] == "attacker_wins"

    def test_battle_simulate_troop_not_found(self) -> None:
        """測試不存在的兵種."""
        response = client.post(
            "/api/v1/calculator/battle/simulate",
            json={
                "attacker_troops": [{"troop_id": "nonexistent_troop", "count": 100}],
            },
        )
        assert response.status_code == 404

    # ============ 糧食平衡計算器測試 ============

    def test_crop_balance_surplus(self) -> None:
        """測試糧食盈餘情況."""
        response = client.post(
            "/api/v1/calculator/crop/balance",
            json={
                "buildings": [
                    {"building_id": "main_building", "level": 10},
                    {"building_id": "barracks", "level": 10},
                ],
                "troops": [],
                "crop_fields_production": 1000,
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert "population_consumption" in data
        assert "troop_consumption" in data
        assert "total_consumption" in data
        assert "crop_production" in data
        assert "balance" in data
        assert "status" in data
        assert data["status"] == "surplus"

    def test_crop_balance_deficit(self) -> None:
        """測試糧食赤字情況."""
        response = client.post(
            "/api/v1/calculator/crop/balance",
            json={
                "buildings": [
                    {"building_id": "main_building", "level": 15},
                ],
                "troops": [
                    {"troop_id": "legionnaire", "count": 500},
                ],
                "crop_fields_production": 100,
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["balance"] < 0
        assert data["status"] in ["deficit", "critical"]
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0

    def test_crop_balance_with_oasis_bonus(self) -> None:
        """測試含綠洲加成的糧食平衡."""
        # 無加成
        response1 = client.post(
            "/api/v1/calculator/crop/balance",
            json={
                "buildings": [{"building_id": "main_building", "level": 10}],
                "troops": [],
                "crop_fields_production": 500,
                "oasis_bonus": 0,
            },
        )
        data1 = response1.json()

        # 25% 綠洲加成
        response2 = client.post(
            "/api/v1/calculator/crop/balance",
            json={
                "buildings": [{"building_id": "main_building", "level": 10}],
                "troops": [],
                "crop_fields_production": 500,
                "oasis_bonus": 25,
            },
        )
        data2 = response2.json()

        # 有加成的產量應該更高
        assert data2["crop_production"] > data1["crop_production"]


class TestCalculatorHelpers:
    """計算器輔助函數測試."""

    def test_time_formatting(self) -> None:
        """測試時間格式化."""
        # 透過 API 間接測試
        response = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "main_building",
                "from_level": 0,
                "to_level": 1,
            },
        )
        assert response.status_code == 200

        data = response.json()
        # 確認有格式化的時間
        assert (
            "秒" in data["build_time_formatted"]
            or "分" in data["build_time_formatted"]
            or "小時" in data["build_time_formatted"]
        )

    def test_build_time_reduction_formula(self) -> None:
        """測試建造時間減少公式."""
        # 公式：實際時間 = 基礎時間 ÷ (1 + 本部等級 × 0.05)
        response = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "main_building",
                "from_level": 0,
                "to_level": 1,
                "main_building_level": 20,  # 最高等級
                "server_speed": 1.0,
            },
        )
        assert response.status_code == 200

        data = response.json()
        base_time = data["build_time_base"]
        actual_time = data["build_time_actual"]

        # 本部等級 20: 減少 100% (1 + 20 * 0.05 = 2)
        expected_reduction = 1 + 20 * 0.05
        expected_actual = int(base_time / expected_reduction)

        assert actual_time == expected_actual
