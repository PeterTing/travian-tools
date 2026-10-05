"""進階計算器服務單元測試."""

import pytest

from app.domain.schemas.advanced_calculator import (
    CulturePointsRequest,
    InterceptionRequest,
    NpcCalculatorRequest,
    PathCalculatorRequest,
    PathSpeedTsRequest,
    SaveTroopsRequest,
    TechnologyRequest,
)
from app.services.advanced_calculator_service import (
    AdvancedCalculatorService,
    _calculate_distance,
    _calculate_travel_time,
    _format_travel_time,
)


@pytest.fixture
def service() -> AdvancedCalculatorService:
    """建立 AdvancedCalculatorService 實例."""
    return AdvancedCalculatorService()


# ============ 工具函式測試 ============


class TestHelperFunctions:
    """輔助函式測試."""

    def test_calculate_distance_same_point(self) -> None:
        """相同座標距離為 0."""
        assert _calculate_distance(0, 0, 0, 0) == 0.0

    def test_calculate_distance_simple(self) -> None:
        """簡單距離計算."""
        d = _calculate_distance(0, 0, 3, 4)
        assert d == pytest.approx(5.0)

    def test_calculate_distance_negative_coords(self) -> None:
        """負座標距離計算."""
        d = _calculate_distance(-10, -10, -7, -6)
        assert d == pytest.approx(5.0)

    def test_calculate_distance_wrapping(self) -> None:
        """地圖環繞距離（跨邊界更近）."""
        # 401x401 地圖，-200 到 200
        # 從 x=190 到 x=-190 直線距離 380，但環繞距離 21
        d = _calculate_distance(190, 0, -190, 0)
        assert d < 100  # 環繞比直線近
        assert d == pytest.approx(21.0)

    def test_format_travel_time_seconds_only(self) -> None:
        """格式化：僅秒數."""
        assert _format_travel_time(45) == "0h 0m 45s"

    def test_format_travel_time_minutes_seconds(self) -> None:
        """格式化：分秒."""
        assert _format_travel_time(125) == "0h 2m 5s"

    def test_format_travel_time_hours(self) -> None:
        """格式化：時分秒."""
        assert _format_travel_time(3661) == "1h 1m 1s"

    def test_format_travel_time_negative(self) -> None:
        """格式化：負值."""
        assert _format_travel_time(-5) == "0h 0m 0s"

    def test_calculate_travel_time_basic(self) -> None:
        """基本行進時間計算."""
        # distance=10, speed=5 → 2 hours
        t = _calculate_travel_time(10, 5)
        assert t == pytest.approx(2.0)

    def test_calculate_travel_time_with_server_speed(self) -> None:
        """含伺服器速度的行進時間."""
        # distance=10, speed=5, server_speed=2 → 1 hour
        t = _calculate_travel_time(10, 5, server_speed=2)
        assert t == pytest.approx(1.0)

    def test_calculate_travel_time_with_ts(self) -> None:
        """含競技場的行進時間（距離 > 20；S71：僅超過 20 格加速）."""
        # 20/10 + 80/(10*3) = 2 + 2.666... = 4.666... hours
        t = _calculate_travel_time(100, 10, tournament_square_level=10)
        assert t == pytest.approx(20 / 10 + 80 / (10 * 3))

    def test_calculate_travel_time_ts_no_effect_short_distance(self) -> None:
        """競技場對短距離（<= 20）無效."""
        t_no_ts = _calculate_travel_time(15, 10, tournament_square_level=0)
        t_with_ts = _calculate_travel_time(15, 10, tournament_square_level=20)
        assert t_no_ts == t_with_ts

    def test_calculate_travel_time_with_artifact(self) -> None:
        """含神器加成的行進時間."""
        base = _calculate_travel_time(100, 10)
        with_artifact = _calculate_travel_time(100, 10, artifact_bonus="unique_2x")
        assert with_artifact == pytest.approx(base / 2)

    def test_calculate_travel_time_with_hero_bonus(self) -> None:
        """含英雄速度加成的行進時間."""
        base = _calculate_travel_time(100, 10)
        with_hero = _calculate_travel_time(100, 10, hero_bonus=50)
        assert with_hero == pytest.approx(base / 1.5)


# ============ Path Calculator 測試 ============


class TestPathCalculator:
    """路徑計算器測試."""

    def test_basic_path(self, service: AdvancedCalculatorService) -> None:
        """基本路徑計算."""
        req = PathCalculatorRequest(
            start_x=0, start_y=0, target_x=3, target_y=4, unit_speed=5
        )
        res = service.calculate_path(req)
        assert res.distance == pytest.approx(5.0)
        # 5 fields / 5 speed = 1 hour = 3600 seconds
        assert res.travel_time_seconds == 3600
        assert "1h" in res.travel_time_formatted

    def test_path_with_ts(self, service: AdvancedCalculatorService) -> None:
        """含 TS 的路徑計算."""
        req = PathCalculatorRequest(
            start_x=0,
            start_y=0,
            target_x=50,
            target_y=0,
            unit_speed=10,
            tournament_square_level=10,
        )
        res = service.calculate_path(req)
        assert res.distance == pytest.approx(50.0)
        # S71: 20/10 + 30/(10*3) hours = 2 + 1 = 3h = 10800s
        assert res.travel_time_seconds == 10800

    def test_path_with_artifact(self, service: AdvancedCalculatorService) -> None:
        """含神器加成的路徑計算."""
        req = PathCalculatorRequest(
            start_x=0,
            start_y=0,
            target_x=10,
            target_y=0,
            unit_speed=10,
            artifact_bonus="unique_2x",
        )
        res = service.calculate_path(req)
        # 10/(10*2) = 0.5h = 1800s
        assert res.travel_time_seconds == 1800

    def test_path_server_speed(self, service: AdvancedCalculatorService) -> None:
        """伺服器速度倍率影響."""
        req = PathCalculatorRequest(
            start_x=0,
            start_y=0,
            target_x=10,
            target_y=0,
            unit_speed=10,
            server_speed=3,
        )
        res = service.calculate_path(req)
        # 10 / (10 * 3) = 1/3 hour ≈ 1200s
        assert res.travel_time_seconds == 1200


# ============ Interception Calculator 測試 ============


class TestInterceptionCalculator:
    """攔截計算器測試."""

    def test_basic_interception(self, service: AdvancedCalculatorService) -> None:
        """基本攔截計算."""
        req = InterceptionRequest(
            attacker_x=0,
            attacker_y=0,
            defender_x=10,
            defender_y=0,
            attack_arrival_time="12:00:00",
            attacker_speed=10,
            catcher_x=5,
            catcher_y=0,
            catcher_speed=10,
        )
        res = service.calculate_interception(req)
        # 攻擊者回程 10/10 = 1h → 回到家 13:00:00
        assert res.attacker_return_time == "13:00:00"
        # 攔截者距離 5 / 10 speed = 0.5h → 發送 12:30:00
        assert res.send_time == "12:30:00"
        assert res.distance_to_attacker == pytest.approx(5.0)

    def test_interception_with_ts(self, service: AdvancedCalculatorService) -> None:
        """含 TS 的攔截計算."""
        req = InterceptionRequest(
            attacker_x=0,
            attacker_y=0,
            defender_x=50,
            defender_y=0,
            attack_arrival_time="10:00:00",
            attacker_speed=10,
            catcher_x=100,
            catcher_y=0,
            catcher_speed=10,
            catcher_ts_level=10,
        )
        res = service.calculate_interception(req)
        # 攻擊者回程 50/10 = 5h → 15:00:00
        assert res.attacker_return_time == "15:00:00"
        # 攔截者距離 100, speed 10, TS 10 (factor=3.0)
        # 100/10 = 10h, /3 = 3.333h
        assert res.distance_to_attacker == pytest.approx(100.0)


# ============ Culture Points Calculator 測試 ============


class TestCulturePointsCalculator:
    """文化點計算器測試."""

    def test_basic_culture_points(self, service: AdvancedCalculatorService) -> None:
        """基本文化點計算."""
        req = CulturePointsRequest(
            current_culture_points=0,
            cp_production_per_day=100,
            current_villages=1,
        )
        res = service.calculate_culture_points(req)
        assert len(res.villages) == 20

        # 第 1 村已擁有
        assert res.villages[0].village_number == 1
        assert res.villages[0].cp_remaining == 0

        # 第 2 村需 2000 CP
        v2 = res.villages[1]
        assert v2.village_number == 2
        assert v2.cp_required == 2000
        assert v2.cp_remaining == 2000
        assert v2.days_until == pytest.approx(20.0)

    def test_culture_points_with_existing_cp(
        self, service: AdvancedCalculatorService
    ) -> None:
        """已有文化點時的計算."""
        req = CulturePointsRequest(
            current_culture_points=5000,
            cp_production_per_day=500,
            current_villages=2,
        )
        res = service.calculate_culture_points(req)

        # 第 2 村已擁有
        assert res.villages[1].cp_remaining == 0

        # 第 3 村需 8000, 已有 5000, 剩 3000
        v3 = res.villages[2]
        assert v3.cp_remaining == 3000
        assert v3.days_until == pytest.approx(6.0)

    def test_culture_points_no_production(
        self, service: AdvancedCalculatorService
    ) -> None:
        """無產量時天數為 None."""
        req = CulturePointsRequest(
            current_culture_points=0,
            cp_production_per_day=0,
            current_villages=1,
        )
        res = service.calculate_culture_points(req)
        assert res.villages[1].days_until is None
        assert res.villages[1].date is None


# ============ Technology Calculator 測試 ============


class TestTechnologyCalculator:
    """科技計算器測試."""

    def test_romans_technology(self, service: AdvancedCalculatorService) -> None:
        """羅馬兵種科技計算."""
        req = TechnologyRequest(tribe="romans", research_levels=[0, 10, 20])
        res = service.calculate_technology(req)
        assert res.tribe == "romans"
        assert res.levels == [0, 10, 20]
        assert len(res.troops) > 0

        # 驗證第一個兵種（Legionnaire）
        leg = next(t for t in res.troops if t.troop_id == "legionnaire")
        assert leg.attack_values[0] == 40  # base, level 0
        from app.utils.travian_formulas import (
            round_smithy_display,
            smithy_improved_value,
        )

        # Legends smithy (KIR / S187), upkeep 1 for legionnaire
        assert leg.attack_values[1] == round_smithy_display(
            smithy_improved_value(40, 1, 10)
        )
        assert leg.attack_values[2] == round_smithy_display(
            smithy_improved_value(40, 1, 20)
        )

    def test_unknown_tribe_returns_empty(
        self, service: AdvancedCalculatorService
    ) -> None:
        """不存在的部族回傳空列表."""
        req = TechnologyRequest(tribe="unknown", research_levels=[0, 10])
        res = service.calculate_technology(req)
        assert res.troops == []


# ============ NPC Calculator 測試 ============


class TestNpcCalculator:
    """NPC 計算器測試."""

    def test_equal_distribution(self, service: AdvancedCalculatorService) -> None:
        """等比分配."""
        req = NpcCalculatorRequest(
            wood=1000,
            clay=2000,
            iron=3000,
            crop=4000,
            desired_ratios={"wood": 1, "clay": 1, "iron": 1, "crop": 1},
        )
        res = service.calculate_npc(req)
        assert res.total_resources == 10000
        # 10000/4 = 2500 each
        assert res.result["wood"] == 2500
        assert res.result["clay"] == 2500
        assert res.result["iron"] == 2500
        assert res.result["crop"] == 2500

    def test_weighted_distribution(self, service: AdvancedCalculatorService) -> None:
        """加權分配."""
        req = NpcCalculatorRequest(
            wood=0,
            clay=0,
            iron=0,
            crop=10000,
            desired_ratios={"wood": 1, "clay": 1, "iron": 1, "crop": 3},
        )
        res = service.calculate_npc(req)
        assert res.total_resources == 10000
        # 6 parts total: wood=1666, clay=1666, iron=1666, crop=5002
        assert res.result["wood"] == int(10000 * 1 / 6)
        assert res.result["crop"] == 10000 - 3 * int(10000 * 1 / 6)

    def test_difference_calculation(self, service: AdvancedCalculatorService) -> None:
        """差異計算正確."""
        req = NpcCalculatorRequest(
            wood=100,
            clay=200,
            iron=300,
            crop=400,
            desired_ratios={"wood": 1, "clay": 1, "iron": 1, "crop": 1},
        )
        res = service.calculate_npc(req)
        assert res.difference["wood"] == res.result["wood"] - 100
        assert res.difference["clay"] == res.result["clay"] - 200
        assert res.difference["iron"] == res.result["iron"] - 300
        assert res.difference["crop"] == res.result["crop"] - 400

    def test_zero_ratios_defaults_equal(
        self, service: AdvancedCalculatorService
    ) -> None:
        """比例全為零時預設等比分配."""
        req = NpcCalculatorRequest(
            wood=400,
            clay=400,
            iron=400,
            crop=400,
            desired_ratios={"wood": 0, "clay": 0, "iron": 0, "crop": 0},
        )
        res = service.calculate_npc(req)
        assert res.result["wood"] == 400
        assert res.result["crop"] == 400


# ============ Save Troops Calculator 測試 ============


class TestSaveTroopsCalculator:
    """避兵計算器測試."""

    def test_basic_save_troops(self, service: AdvancedCalculatorService) -> None:
        """基本避兵計算."""
        req = SaveTroopsRequest(
            village_x=0,
            village_y=0,
            unit_speed=10,
            offline_hours=8,
        )
        res = service.calculate_save_troops(req)
        # 單程 4h, speed 10 → 距離 40
        assert res.ideal_distance == pytest.approx(40.0)
        assert "4h" in res.send_time_formatted
        assert "8h" in res.return_time_formatted

    def test_save_troops_with_server_speed(
        self, service: AdvancedCalculatorService
    ) -> None:
        """含伺服器速度的避兵計算."""
        req = SaveTroopsRequest(
            village_x=0,
            village_y=0,
            unit_speed=10,
            offline_hours=4,
            server_speed=3,
        )
        res = service.calculate_save_troops(req)
        # 單程 2h, speed 10*3=30 → 距離 60
        assert res.ideal_distance == pytest.approx(60.0)

    def test_save_troops_with_ts(self, service: AdvancedCalculatorService) -> None:
        """含 TS 的避兵計算，距離 > 20 時 TS 生效."""
        req = SaveTroopsRequest(
            village_x=0,
            village_y=0,
            unit_speed=10,
            offline_hours=8,
            tournament_square_level=10,
        )
        res = service.calculate_save_troops(req)
        # one_way 4h, speed 10: time_to_20 = 2h; far 2h at 3× → +60; total 20+60=80
        assert res.ideal_distance == pytest.approx(80.0)


# ============ Path-Speed-TS Calculator 測試 ============


class TestPathSpeedTsCalculator:
    """TS 反推計算器測試."""

    def test_exact_match(self, service: AdvancedCalculatorService) -> None:
        """精確匹配."""
        # distance=100, speed=10, no TS → 10h = 36000s
        req = PathSpeedTsRequest(
            attacker_x=0,
            attacker_y=0,
            target_x=100,
            target_y=0,
            travel_time_seconds=36000,
        )
        res = service.calculate_path_speed_ts(req)
        assert res.distance == pytest.approx(100.0)

        # 應該找到 speed=10, TS=0 的匹配
        match = next(
            (
                m
                for m in res.possible_matches
                if m.unit_speed == 10 and m.tournament_square_level == 0
            ),
            None,
        )
        assert match is not None
        assert abs(match.calculated_travel_time_seconds - 36000) <= 30

    def test_multiple_matches(self, service: AdvancedCalculatorService) -> None:
        """可能有多個匹配."""
        req = PathSpeedTsRequest(
            attacker_x=0,
            attacker_y=0,
            target_x=50,
            target_y=0,
            travel_time_seconds=5000,
        )
        res = service.calculate_path_speed_ts(req)
        # 可能有多個速度 + TS 組合
        assert isinstance(res.possible_matches, list)

    def test_no_match(self, service: AdvancedCalculatorService) -> None:
        """無匹配結果."""
        req = PathSpeedTsRequest(
            attacker_x=0,
            attacker_y=0,
            target_x=1,
            target_y=0,
            travel_time_seconds=1,  # 不可能的旅行時間
        )
        res = service.calculate_path_speed_ts(req)
        assert res.possible_matches == []
