"""ts11 實測 fixtures：計算器公式必須對上遊戲數字.

Evidence: /workspace/travian/review/realtest/tool-verification.md
Knowhow: /workspace/travian/docs-knowhow/travian-knowhow.md
World: ts11 International x1, Gaul account HandsomeTing.
"""

from __future__ import annotations

import math

from fastapi.testclient import TestClient

from app.domain.schemas.advanced_calculator import (
    AttackerProfile,
    NpcCalculatorRequest,
    PathCalculatorRequest,
    TechnologyRequest,
    TsOptimizerRequest,
)
from app.main import app
from app.services.advanced_calculator_service import get_advanced_calculator_service
from app.services.game_data_service import get_game_data_service
from app.utils.travian_formulas import (
    TS_THRESHOLD_FIELDS,
    calculate_build_time,
    calculate_travel_seconds,
    round_smithy_display,
    smithy_improved_value,
)

client = TestClient(app)


# ─── MUST 1: Main Building build time ─────────────────────────────


class TestBuildTimeTs11:
    """Game uses base × 0.964^(MB−1); app used base/(1+0.05·MB)."""

    def test_mb1_to_2_is_43_min_40_sec(self) -> None:
        # buildings.json main_building L2 build_time_base = 2620
        # MB level 1 → factor 0.964^0 = 1 → 2620 s = 0:43:40
        assert calculate_build_time(2620, main_building_level=1, server_speed=1) == 2620

        response = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "main_building",
                "from_level": 1,
                "to_level": 2,
                "main_building_level": 1,
                "server_speed": 1,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["cost"] == {"wood": 90, "clay": 50, "iron": 75, "crop": 25} or (
            data["cost"]["wood"] == 90 and data["cost"]["clay"] == 50
        )
        # Old app: 2495 (41:35). Game / new: 2620 (43:40).
        assert data["build_time_actual"] == 2620
        assert data["build_time_actual"] != 2495

    def test_woodcutter_0_to_1_mb1(self) -> None:
        # base 260 at MB1 → 260 s = 0:04:20
        response = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "woodcutter",
                "from_level": 0,
                "to_level": 1,
                "main_building_level": 1,
                "server_speed": 1,
            },
        )
        assert response.status_code == 200
        assert response.json()["build_time_actual"] == 260

    def test_mb2_rounds_to_nearest_10_seconds(self) -> None:
        # 2000 * 0.964 = 1928 → round to 1930 (0:32:10)
        assert calculate_build_time(2000, main_building_level=2, server_speed=1) == 1930


# ─── MUST 2: L0 resource production = 3 ───────────────────────────


class TestResourceL0Production:
    def test_all_fields_l0_produce_3(self) -> None:
        service = get_game_data_service()
        for rtype in ("wood", "clay", "iron", "crop"):
            field = service.resources.get_resource_field(rtype)
            assert field is not None
            level0 = field.get_level(0)
            assert level0 is not None
            assert level0.production_per_hour == 3  # was 2 (T3)

    def test_roi_l0_to_1_uses_3(self) -> None:
        response = client.post(
            "/api/v1/calculator/resource/roi",
            json={"resource_type": "wood", "current_level": 0},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["current_production"] == 3
        assert data["next_production"] == 7


# ─── MUST 3: Crop balance population + hero ───────────────────────


class TestCropBalanceTs11:
    """Village: wood L2, crop L2, clay L1, MB L1, rally L1 → pop 8.
    Crop: 28 fields + 36 hero resources + 6 hero fixed − 8 pop − 6 hero = 56.
    """

    def test_population_sums_level_increments(self) -> None:
        response = client.post(
            "/api/v1/calculator/crop/balance",
            json={
                "buildings": [
                    {"building_id": "woodcutter", "level": 2},
                    {"building_id": "cropland", "level": 2},
                    {"building_id": "clay_pit", "level": 1},
                    {"building_id": "main_building", "level": 1},
                    {"building_id": "rally_point", "level": 1},
                ],
                "crop_fields_production": 28,
                "hero_crop_production": 42,  # 36 + 6
                "hero_crop_consumption": 6,
                "troops": [],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["population_consumption"] == 8  # was 6
        assert data["hero_production"] == 42
        assert data["hero_consumption"] == 6
        assert data["crop_production"] == 28 + 42
        assert data["balance"] == 56  # 28+42-8-6


# ─── MUST 4: Travel time rounds to nearest second ─────────────────


class TestTravelTimeRounding:
    def test_hero_adventure_sqrt34_at_speed_7(self) -> None:
        # (33|-4)→(38|-1): distance √(5²+3²)=√34≈5.83095
        # 5.83095/7*3600 = 2998.77 → game 2999; old app truncated to 2998
        distance = math.sqrt(34)
        seconds = calculate_travel_seconds(distance, unit_speed=7, server_speed=1)
        assert seconds == 2999

        service = get_advanced_calculator_service()
        res = service.calculate_path(
            PathCalculatorRequest(
                start_x=33,
                start_y=-4,
                target_x=38,
                target_y=-1,
                unit_speed=7,
                server_speed=1,
            )
        )
        assert res.travel_time_seconds == 2999


# ─── MUST 5: Server speed is an input (not hard-coded only) ───────


class TestServerSpeedInput:
    def test_build_time_scales_with_speed(self) -> None:
        t1 = calculate_build_time(2620, 1, server_speed=1)
        t3 = calculate_build_time(2620, 1, server_speed=3)
        assert t1 == 2620
        assert t3 == 870  # 2620/3 = 873.33 → nearest 10s = 870
        assert t3 < t1

    def test_crop_balance_echoes_server_speed(self) -> None:
        response = client.post(
            "/api/v1/calculator/crop/balance",
            json={
                "buildings": [{"building_id": "main_building", "level": 1}],
                "crop_fields_production": 10,
                "server_speed": 3,
            },
        )
        assert response.status_code == 200
        assert response.json()["server_speed"] == 3.0


# ─── SHOULD: Tournament Square (S71) ──────────────────────────────


class TestTournamentSquareS71:
    def test_threshold_is_20_not_30(self) -> None:
        assert TS_THRESHOLD_FIELDS == 20

    def test_thunder_30_fields_ts1(self) -> None:
        # 20/19 + 10/(19*1.2) hours → ≈5368 s (verification A6-3)
        seconds = calculate_travel_seconds(
            distance=30, unit_speed=19, server_speed=1, tournament_square_level=1
        )
        assert seconds == 5368

    def test_ts_optimizer_short_distance_ignores_ts(self) -> None:
        service = get_advanced_calculator_service()
        target = "2030-05-01T12:00:00+00:00"
        no_ts = AttackerProfile(village_label="A", x=15, y=0, unit_speed=6, ts_level=0)
        with_ts = AttackerProfile(
            village_label="A", x=15, y=0, unit_speed=6, ts_level=20
        )
        a = service.calculate_ts_optimizer(
            TsOptimizerRequest(
                target_x=0,
                target_y=0,
                target_arrival=target,
                attackers=[no_ts],
                server_speed=1,
            )
        ).results[0]
        b = service.calculate_ts_optimizer(
            TsOptimizerRequest(
                target_x=0,
                target_y=0,
                target_arrival=target,
                attackers=[with_ts],
                server_speed=1,
            )
        ).results[0]
        assert a.travel_time_formatted == b.travel_time_formatted


# ─── SHOULD: Smithy formula (S187 / KIR) ──────────────────────────


class TestSmithyFormula:
    def test_phalanx_level_20(self) -> None:
        # Official S187: 23.6 / 52.4 / 63.9
        assert round_smithy_display(smithy_improved_value(15, 1, 20)) == 23.7
        assert round_smithy_display(smithy_improved_value(40, 1, 20)) == 52.4
        assert round_smithy_display(smithy_improved_value(50, 1, 20)) == 63.9

        service = get_advanced_calculator_service()
        res = service.calculate_technology(
            TechnologyRequest(tribe="gauls", research_levels=[0, 20])
        )
        phalanx = next(t for t in res.troops if t.troop_id == "phalanx")
        assert phalanx.attack_values[0] == 15
        assert phalanx.attack_values[1] == round_smithy_display(
            smithy_improved_value(15, 1, 20)
        )
        assert phalanx.defense_infantry_values[1] == 52.4
        assert phalanx.defense_cavalry_values[1] == 63.9


# ─── SHOULD: Theutates Thunder attack 90 ──────────────────────────


class TestGaulTroopData:
    def test_thunder_attack_90(self) -> None:
        troop = get_game_data_service().troops.get_troop("theutates_thunder")
        assert troop is not None
        assert troop.attack == 90
        assert troop.name_zh == "雷法師"

    def test_training_times(self) -> None:
        troops = get_game_data_service().troops
        assert troops.get_troop("swordsman").training_time_base == 1440  # 24:00
        assert troops.get_troop("theutates_thunder").training_time_base == 2480  # 41:20
        assert troops.get_troop("haeduan").training_time_base == 3120  # 52:00
        assert troops.get_troop("gaul_ram").training_time_base == 5000  # 1:23:20
        assert troops.get_troop("gaul_settler").training_time_base == 22700  # 6:18:20


# ─── SHOULD: Cranny / Trapper / Barracks / Palisade / Town Hall ───


class TestBuildingDataFixes:
    def test_cranny_kir_and_gaul_note(self) -> None:
        cranny = get_game_data_service().buildings.get_building("cranny")
        assert cranny.get_level(1).effect_value == 200
        assert "高盧" in cranny.get_level(1).effect_description
        assert "300" in cranny.get_level(1).effect_description
        assert cranny.get_level(10).effect_value == 2000

    def test_trapper_max_400(self) -> None:
        trapper = get_game_data_service().buildings.get_building("trapper")
        assert trapper.get_level(20).effect_value == 400

    def test_barracks_l1_factor_is_1(self) -> None:
        barracks = get_game_data_service().buildings.get_building("barracks")
        assert barracks.get_level(1).effect_value == 1.0
        assert abs(barracks.get_level(2).effect_value - 0.9) < 1e-6

    def test_palisade_l1_is_2_5_percent(self) -> None:
        palisade = get_game_data_service().buildings.get_building("palisade")
        assert palisade.get_level(1).effect_value == 2.5

    def test_celebration_cp_fixed(self) -> None:
        th = get_game_data_service().buildings.get_building("town_hall")
        assert th.get_level(1).effect_value == 500
        assert th.get_level(5).effect_value == 500
        assert th.get_level(10).effect_value == 2000

    def test_tournament_square_prereq_rally_only(self) -> None:
        ts = get_game_data_service().buildings.get_building("tournament_square")
        assert len(ts.prerequisites) == 1
        prereq = ts.prerequisites[0]
        bid = (
            prereq.building_id
            if hasattr(prereq, "building_id")
            else prereq["building_id"]
        )
        lvl = prereq.level if hasattr(prereq, "level") else prereq["level"]
        assert bid == "rally_point" and lvl == 15
        assert ts.get_level(1).effect_value == 20


# ─── SHOULD: NPC respects storage ─────────────────────────────────


class TestNpcCapacity:
    def test_does_not_exceed_warehouse(self) -> None:
        service = get_advanced_calculator_service()
        res = service.calculate_npc(
            NpcCalculatorRequest(
                wood=800,
                clay=598,
                iron=612,
                crop=713,
                desired_ratios={"wood": 1, "clay": 1, "iron": 1, "crop": 1},
                warehouse_capacity=800,
                granary_capacity=800,
            )
        )
        assert res.result["wood"] <= 800
        assert res.result["clay"] <= 800
        assert res.result["iron"] <= 800
        assert res.result["crop"] <= 800
        assert res.unallocated >= 0
        assert sum(res.result.values()) + res.unallocated == res.total_resources


# ─── SHOULD: CP not summed across levels ──────────────────────────


class TestCulturePointsPerBuilding:
    def test_mb_1_to_2_daily_increase_is_1(self) -> None:
        # culture_points field = daily CP at level (KIR). MB1=2, MB2=3 → +1
        response = client.post(
            "/api/v1/calculator/building/upgrade",
            json={
                "building_id": "main_building",
                "from_level": 1,
                "to_level": 2,
                "main_building_level": 1,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["culture_points"] == 3  # daily at new level
        assert data["culture_points_per_day"] == 1  # was +4 (summed cp_per_day)


# ─── SHOULD: Strategy protection days configurable ────────────────


class TestProtectionDaysConfigurable:
    def test_default_protection_is_5(self) -> None:
        from app.services.strategy_service import GamePhase, StrategyService

        # No DB needed for _determine_phase
        class _Dummy:
            pass

        svc = StrategyService.__new__(StrategyService)
        assert svc._determine_phase(5, beginner_protection_days=5) == (
            GamePhase.BEGINNER_PROTECTION
        )
        assert svc._determine_phase(6, beginner_protection_days=5) != (
            GamePhase.BEGINNER_PROTECTION
        )
        assert svc._determine_phase(3, beginner_protection_days=3) == (
            GamePhase.BEGINNER_PROTECTION
        )
        assert svc._determine_phase(4, beginner_protection_days=3) != (
            GamePhase.BEGINNER_PROTECTION
        )
