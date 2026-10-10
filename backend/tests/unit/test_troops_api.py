"""兵種數據查詢 API 單元測試."""

import time

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestTroopsAPI:
    """兵種 API 測試."""

    def test_get_troops_list(self) -> None:
        """測試取得所有兵種列表."""
        response = client.get("/api/v1/troops")
        assert response.status_code == 200

        data = response.json()
        assert "total" in data
        assert "troops" in data
        assert data["total"] > 0
        assert len(data["troops"]) == data["total"]

        # 檢查兵種結構
        troop = data["troops"][0]
        assert "troop_id" in troop
        assert "name_zh" in troop
        assert "name_en" in troop
        assert "tribe" in troop
        assert "category" in troop
        assert "attack" in troop
        assert "defense_infantry" in troop
        assert "defense_cavalry" in troop

    def test_get_troops_by_tribe_filter(self) -> None:
        """測試依部族篩選兵種."""
        response = client.get("/api/v1/troops?tribe=romans")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

        # 所有兵種都應該是羅馬部族
        for troop in data["troops"]:
            assert troop["tribe"] == "romans"

    def test_get_troops_by_category_filter(self) -> None:
        """測試依類型篩選兵種."""
        response = client.get("/api/v1/troops?category=infantry")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

        # 所有兵種都應該是步兵類型
        for troop in data["troops"]:
            assert troop["category"] == "infantry"

    def test_get_troops_by_tribe_and_category(self) -> None:
        """測試同時依部族和類型篩選."""
        response = client.get("/api/v1/troops?tribe=romans&category=cavalry")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

        # 所有兵種都應該是羅馬騎兵
        for troop in data["troops"]:
            assert troop["tribe"] == "romans"
            assert troop["category"] == "cavalry"

    def test_get_troops_search_chinese(self) -> None:
        """測試中文名稱搜尋."""
        response = client.get("/api/v1/troops?search=步兵")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

        # 檢查搜尋結果包含關鍵字
        for troop in data["troops"]:
            assert "步兵" in troop["name_zh"]

    def test_get_troops_search_english(self) -> None:
        """測試英文名稱搜尋."""
        response = client.get("/api/v1/troops?search=phalanx")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

    def test_get_troops_by_tribe_path(self) -> None:
        """測試取得特定部族的兵種（路徑參數）."""
        response = client.get("/api/v1/troops/gauls")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

        # 所有兵種都應該是高盧部族
        for troop in data["troops"]:
            assert troop["tribe"] == "gauls"

    def test_get_troops_by_tribe_with_category(self) -> None:
        """測試取得特定部族特定類型的兵種."""
        response = client.get("/api/v1/troops/teutons?category=siege")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] > 0

        # 所有兵種都應該是條頓攻城器械
        for troop in data["troops"]:
            assert troop["tribe"] == "teutons"
            assert troop["category"] == "siege"

    def test_get_troop_detail(self) -> None:
        """測試取得單一兵種詳細資料."""
        response = client.get("/api/v1/troops/romans/legionnaire")
        assert response.status_code == 200

        data = response.json()
        assert data["troop_id"] == "legionnaire"
        assert data["name_zh"] == "古羅馬步兵"  # ts11 遊戲內名稱（P0-18）
        assert data["name_en"] == "Legionnaire"
        assert data["tribe"] == "romans"
        assert data["category"] == "infantry"
        assert data["attack"] == 40
        assert data["defense_infantry"] == 35
        assert data["defense_cavalry"] == 50

        # 檢查成本
        assert "cost_wood" in data
        assert "cost_clay" in data
        assert "cost_iron" in data
        assert "cost_crop" in data
        assert "total_cost" in data

        # 檢查性價比欄位
        assert "attack_per_crop" in data
        assert "defense_infantry_per_crop" in data
        assert "defense_cavalry_per_crop" in data
        assert "attack_per_cost" in data

    def test_get_troop_detail_not_found(self) -> None:
        """測試查詢不存在的兵種."""
        response = client.get("/api/v1/troops/romans/nonexistent_troop")
        assert response.status_code == 404

        data = response.json()
        assert "detail" in data

    def test_get_troop_detail_wrong_tribe(self) -> None:
        """測試查詢錯誤部族的兵種."""
        # legionnaire 是羅馬兵種，查詢高盧應該 404
        response = client.get("/api/v1/troops/gauls/legionnaire")
        assert response.status_code == 404

        data = response.json()
        assert "detail" in data

    def test_compare_troops(self) -> None:
        """測試兵種比較功能."""
        response = client.get(
            "/api/v1/troops/compare?troop_ids=legionnaire,phalanx,clubswinger"
        )
        assert response.status_code == 200

        data = response.json()
        assert "troops" in data
        assert "comparison_summary" in data
        assert len(data["troops"]) == 3

        # 檢查比較摘要
        summary = data["comparison_summary"]
        assert "best_attack" in summary
        assert "best_defense" in summary
        assert "best_speed" in summary
        assert "best_attack_efficiency" in summary

    def test_compare_troops_minimum(self) -> None:
        """測試兵種比較最少需要 2 個."""
        response = client.get("/api/v1/troops/compare?troop_ids=legionnaire")
        assert response.status_code == 400

        data = response.json()
        assert "detail" in data

    def test_compare_troops_maximum(self) -> None:
        """測試兵種比較最多 10 個."""
        # 11 個兵種應該失敗
        ids = ",".join([f"troop{i}" for i in range(11)])
        response = client.get(f"/api/v1/troops/compare?troop_ids={ids}")
        assert response.status_code == 400

        data = response.json()
        assert "detail" in data

    def test_compare_troops_not_found(self) -> None:
        """測試比較不存在的兵種."""
        response = client.get(
            "/api/v1/troops/compare?troop_ids=legionnaire,nonexistent"
        )
        assert response.status_code == 404

        data = response.json()
        assert "detail" in data

    def test_response_time(self) -> None:
        """測試回應時間應小於 200ms."""
        start = time.time()
        response = client.get("/api/v1/troops")
        elapsed = (time.time() - start) * 1000  # 轉換為毫秒

        assert response.status_code == 200
        assert elapsed < 200, f"Response time {elapsed:.2f}ms exceeds 200ms"

    def test_get_all_seven_tribes(self) -> None:
        """測試取得所有 7 個部族的兵種."""
        tribes = [
            "romans",
            "gauls",
            "teutons",
            "huns",
            "egyptians",
            "vikings",
            "spartans",
        ]

        for tribe in tribes:
            response = client.get(f"/api/v1/troops/{tribe}")
            assert response.status_code == 200

            data = response.json()
            assert data["total"] > 0, f"No troops found for tribe {tribe}"

    def test_troop_efficiency_fields(self) -> None:
        """測試兵種效率欄位計算正確."""
        response = client.get("/api/v1/troops/romans/legionnaire")
        assert response.status_code == 200

        data = response.json()

        # 驗證 attack_per_crop 計算
        expected_attack_per_crop = data["attack"] / data["crop_consumption"]
        assert abs(data["attack_per_crop"] - expected_attack_per_crop) < 0.01

        # 驗證 total_cost 計算
        expected_total = (
            data["cost_wood"]
            + data["cost_clay"]
            + data["cost_iron"]
            + data["cost_crop"]
        )
        assert data["total_cost"] == expected_total


def test_viking_detail_carry_is_null_with_reason() -> None:
    """維京運載量留空（P0-23 PM）：API 回 null＋原因，不回 0；其他族照常是數字、沒有原因."""
    for tribe, troop_id in (
        ("vikings", "thrall"),
        ("vikings", "viking_settler"),
    ):
        r = client.get(f"/api/v1/troops/{tribe}/{troop_id}")
        assert r.status_code == 200
        d = r.json()
        assert d["carry_capacity"] is None, troop_id
        assert "還沒核對" in d["carry_capacity_note"]
        assert "不能當成 0" in d["carry_capacity_note"]
    d = client.get("/api/v1/troops/gauls/theutates_thunder").json()
    assert d["carry_capacity"] == 75
    assert d["carry_capacity_note"] is None
    # 斯巴達 2026-10-11 在 ASIA x1 遊戲內說明讀到運載量
    d = client.get("/api/v1/troops/spartans/elpida_rider").json()
    assert d["carry_capacity"] == 110
    assert d["carry_capacity_note"] is None


def test_rag_troop_details_never_print_none_or_zero_for_empty_carry() -> None:
    """知識庫兵種說明：運載量留空時寫「還沒核對」，不印 None 或 0."""
    from app.knowledge_base.rag_service import TravianKnowledgeBase
    from app.knowledge_base.tribes import TRIBES_DATA

    kb = TravianKnowledgeBase.__new__(TravianKnowledgeBase)
    text = kb._format_troop_details(TRIBES_DATA["vikings"]["troops"]["thrall"])
    line = next(x for x in text.splitlines() if x.startswith("載重"))
    assert line == "載重: 還沒核對（官方說明頁沒有），先不提供"
    text = kb._format_troop_details(TRIBES_DATA["gauls"]["troops"]["theutates_thunder"])
    assert "載重: 75" in text
