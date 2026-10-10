"""稽核 2026-10-10 修正（review/audit-2026-10-10/findings.json）的後端測試."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.domain.schemas.advanced_calculator import (
    AttackerProfile,
    PathSpeedTsRequest,
    SaveTroopsRequest,
    TechnologyRequest,
    TsOptimizerRequest,
    VillageBuilderRequest,
)
from app.main import app
from app.services.advanced_calculator_service import get_advanced_calculator_service
from app.services.strategy_service import (
    StrategyService,
    beginner_protection_days_for_speed,
    x1_equivalent_day,
)
from app.utils.travian_formulas import calculate_build_time

client = TestClient(app)
svc = get_advanced_calculator_service()

INTERCEPT = {
    "attacker_x": 0,
    "attacker_y": 0,
    "defender_x": 50,
    "defender_y": 0,
    "attack_arrival_time": "12:00:00",
    "attacker_speed": 7,
    "catcher_x": 0,
    "catcher_y": 30,
    "catcher_speed": 10,
}


# ─── 攔截：時間格式 422、跨午夜 ────────────────────────────────


@pytest.mark.parametrize("bad", ["25:99", "", "12:00", "ab:cd:ef", "24:00:00"])
def test_interception_bad_time_is_422_on_the_field(bad: str) -> None:
    r = client.post(
        "/api/v1/advanced-calculator/interception",
        json={**INTERCEPT, "attack_arrival_time": bad},
    )
    assert r.status_code == 422
    err = r.json()["detail"][0]
    assert err["loc"][-1] == "attack_arrival_time"
    assert "時:分:秒" in err["msg"]


def test_interception_marks_next_day() -> None:
    # 攻擊 23:50 到，攻方回程 7h8m34s → 隔天 06:58:34；攔截 2h30m → 隔天 04:28:34 發送
    r = client.post(
        "/api/v1/advanced-calculator/interception",
        json={**INTERCEPT, "attack_arrival_time": "23:50:00", "catcher_ts_level": 5},
    )
    body = r.json()
    assert body["attacker_return_time"] == "06:58:34"
    assert body["return_day_offset"] == 1
    assert body["send_day_offset"] == 1


def test_interception_same_day_offsets_zero() -> None:
    body = client.post(
        "/api/v1/advanced-calculator/interception", json=INTERCEPT
    ).json()
    assert body["return_day_offset"] == 0
    assert body["send_day_offset"] == 0


# ─── 神器：未知字串 422、大型 1.5× ───────────────────────────


def test_path_unknown_artifact_422() -> None:
    r = client.post(
        "/api/v1/advanced-calculator/path",
        json={
            "start_x": 0,
            "start_y": 0,
            "target_x": 10,
            "target_y": 0,
            "unit_speed": 10,
            "artifact_bonus": "xyz",
        },
    )
    assert r.status_code == 422


def test_path_account_artifact_1_5x() -> None:
    r = client.post(
        "/api/v1/advanced-calculator/path",
        json={
            "start_x": 0,
            "start_y": 0,
            "target_x": 15,
            "target_y": 0,
            "unit_speed": 10,
            "artifact_bonus": "account_1_5x",
        },
    )
    # 15 / (10 × 1.5) = 1 小時（官方 S102：大型神器 1.5×）
    assert r.json()["travel_time_seconds"] == 3600


# ─── 躲兵：不用村莊座標、超過地圖要標 ─────────────────────────


def test_save_troops_without_village() -> None:
    r = svc.calculate_save_troops(SaveTroopsRequest(unit_speed=10, offline_hours=8))
    assert r.ideal_distance == pytest.approx(40.0)
    assert r.exceeds_map is False


def test_save_troops_beyond_map_is_flagged() -> None:
    r = svc.calculate_save_troops(SaveTroopsRequest(unit_speed=7, offline_hours=1000))
    assert r.ideal_distance > 282.84
    assert r.exceeds_map is True
    assert r.max_map_distance == pytest.approx(282.84, abs=0.01)


# ─── 反推競技場：≤20 格不重複、神器、容差 ─────────────────────


def _reverse(**kw: object) -> list[tuple[int, int]]:
    base = {
        "attacker_x": 0,
        "attacker_y": 0,
        "target_x": 10,
        "target_y": 0,
        "travel_time_seconds": 6000,
    }
    r = svc.calculate_path_speed_ts(PathSpeedTsRequest(**{**base, **kw}))  # type: ignore[arg-type]
    return [(m.unit_speed, m.tournament_square_level) for m in r.possible_matches]


def test_reverse_ts_within_20_fields_one_row_per_speed() -> None:
    rows = _reverse()
    # 10 格 6000 秒 = 速度 6；之前回 21 筆一樣的
    assert rows == [(6, 0)]
    r = svc.calculate_path_speed_ts(
        PathSpeedTsRequest(
            attacker_x=0,
            attacker_y=0,
            target_x=10,
            target_y=0,
            travel_time_seconds=6000,
        )
    )
    assert r.ts_irrelevant is True


def test_reverse_ts_artifact_and_tolerance() -> None:
    # 神器 2×：10 格 3000 秒 → 速度 6 也對得上
    assert (6, 0) in _reverse(travel_time_seconds=3000, artifact_bonus="unique_2x")
    # 容差 0：6010 秒對不到速度 6
    assert _reverse(travel_time_seconds=6010, tolerance_seconds=0) == []
    assert (6, 0) in _reverse(travel_time_seconds=6010, tolerance_seconds=30)


# ─── 盔甲廠等級 0–20 ────────────────────────────────────────


@pytest.mark.parametrize("levels", [[-1], [21], [99], []])
def test_technology_levels_out_of_range(levels: list[int]) -> None:
    with pytest.raises(ValidationError):
        TechnologyRequest(tribe="romans", research_levels=levels)


# ─── OP 規劃：真的找最低競技場等級、照輸入順序 ─────────────────


def _iso(dt: datetime) -> str:
    return dt.isoformat(timespec="seconds")


def test_ts_optimizer_finds_lowest_ts_level_that_still_makes_it() -> None:
    # 100 格、速度 10：TS0 要 10 小時；目標 4.4 小時後到 → 要升競技場（12 級約 4.35 小時；11 級剛好 4.5 小時）
    target = datetime.now(UTC) + timedelta(hours=4.4)
    r = svc.calculate_ts_optimizer(
        TsOptimizerRequest(
            target_x=0,
            target_y=0,
            target_arrival=_iso(target),
            attackers=[AttackerProfile(village_label="A", x=100, y=0, unit_speed=10)],
        )
    )
    res = r.results[0]
    assert res.ts_level_changed is True
    assert res.unreachable is False
    lvl = res.recommended_ts_level

    # 這一級趕得上，低一級趕不上（S71：20/10 + 80/(10×(1+0.2L)) 小時）
    def hours(level: int) -> float:
        return 2 + 80 / (10 * (1 + 0.2 * level))

    assert lvl == 12
    assert hours(lvl) < 4.4
    assert hours(lvl - 1) >= 4.4
    assert datetime.fromisoformat(res.send_time) > datetime.now(UTC)
    assert any("來不及" in w for w in r.warnings)


def test_ts_optimizer_unreachable() -> None:
    target = datetime.now(UTC) + timedelta(minutes=30)
    r = svc.calculate_ts_optimizer(
        TsOptimizerRequest(
            target_x=0,
            target_y=0,
            target_arrival=_iso(target),
            attackers=[AttackerProfile(village_label="A", x=100, y=0, unit_speed=10)],
        )
    )
    assert r.results[0].unreachable is True
    assert any("20 級也趕不上" in w for w in r.warnings)


def test_ts_optimizer_keeps_level_when_in_time_and_respects_input_order() -> None:
    target = datetime(2030, 1, 1, 12, 0, 0, tzinfo=UTC)
    r = svc.calculate_ts_optimizer(
        TsOptimizerRequest(
            target_x=0,
            target_y=0,
            target_arrival=_iso(target),
            wave_spacing_seconds=2,
            attackers=[
                AttackerProfile(village_label="near-clear", x=5, y=0, unit_speed=10),
                AttackerProfile(
                    village_label="far-main", x=50, y=0, unit_speed=10, ts_level=3
                ),
            ],
        )
    )
    a, b = r.results
    assert (a.village_label, a.wave, b.village_label, b.wave) == (
        "near-clear",
        0,
        "far-main",
        1,
    )
    assert a.arrival_time == "2030-01-01T12:00:00+00:00"
    assert b.arrival_time == "2030-01-01T12:00:02+00:00"
    assert (a.recommended_ts_level, b.recommended_ts_level) == (0, 3)
    assert not a.ts_level_changed and not b.ts_level_changed


# ─── 建築計算：升村莊大樓時每級重算、倍速只收 1/2/3/5/10、中文錯誤 ──────


def test_main_building_multi_level_uses_rising_level() -> None:
    r = client.post(
        "/api/v1/calculator/building/upgrade",
        json={"building_id": "main_building", "from_level": 1, "to_level": 4},
    )
    # 蓋 2 級時大樓 1 級、3 級時 2 級、4 級時 3 級（基礎 2620／3339／4173 秒）
    expected = (
        calculate_build_time(2620, 1)
        + calculate_build_time(3339, 2)
        + calculate_build_time(4173, 3)
    )
    assert r.json()["build_time_actual"] == expected


def test_other_building_keeps_given_main_building_level() -> None:
    r = client.post(
        "/api/v1/calculator/building/upgrade",
        json={
            "building_id": "warehouse",
            "from_level": 0,
            "to_level": 2,
            "main_building_level": 5,
        },
    ).json()
    assert r["build_time_actual"] > 0
    assert r["main_building_level"] == 5


@pytest.mark.parametrize("speed", [0.0001, 4, 0])
def test_building_speed_only_official(speed: float) -> None:
    r = client.post(
        "/api/v1/calculator/building/upgrade",
        json={
            "building_id": "warehouse",
            "from_level": 0,
            "to_level": 1,
            "server_speed": speed,
        },
    )
    assert r.status_code == 422


def test_building_errors_in_chinese() -> None:
    r = client.post(
        "/api/v1/calculator/building/upgrade",
        json={"building_id": "cranny", "from_level": 9, "to_level": 11},
    )
    assert r.status_code in (400, 422)
    assert "Level" not in str(r.json()["detail"])
    r2 = client.post(
        "/api/v1/calculator/building/upgrade",
        json={"building_id": "warehouse", "from_level": 3, "to_level": 2},
    )
    assert r2.json()["detail"] == "目標等級要比目前等級高"


# ─── 建造順序（後端）：大樓 5 級在麵包店／鋸木廠之前 ─────────────


def test_village_builder_main_building_5_before_bakery_and_sawmill() -> None:
    res = svc.calculate_village_builder(
        VillageBuilderRequest(cropper_type="9c", target_field_level=10)
    )
    targets = [s.target for s in res.build_sequence]
    mb = targets.index("main_building")
    assert mb < targets.index("bakery")
    assert mb < targets.index("sawmill")


# ─── 健檢：新手保護照 S20、門檻照倍速 ─────────────────────────


@pytest.mark.parametrize(
    ("speed", "days"), [(1, 5), (2, 3), (3, 3), (5, 2), (10, 1), (4, 3), (20, 1)]
)
def test_beginner_protection_s20(speed: int, days: int) -> None:
    assert beginner_protection_days_for_speed(speed) == days


def test_x1_equivalent_day_matches_s20_artefact_day() -> None:
    # S20：神器 x1 第 90 天、x3 第 30 天、x10 第 9 天 → 換算後都是 90
    assert (
        x1_equivalent_day(90, 1)
        == x1_equivalent_day(30, 3)
        == x1_equivalent_day(9, 10)
        == 90
    )


def test_phase_uses_speed() -> None:
    s = StrategyService.__new__(StrategyService)
    # x10 第 2 天：保護期 1 天已過；換算 x1 第 20 天 → 中期擴張，不是「早期發展」
    assert s._determine_phase(2, 1, 10).value == s._determine_phase(20, 5, 1).value
    assert s._determine_phase(1, 1, 10).value == s._determine_phase(1, 5, 1).value


# ---- 糧食平衡：直接填人口、等級檢查 ----
def test_crop_balance_population_direct_overrides_buildings():
    c = client
    r = c.post(
        "/api/v1/calculator/crop/balance",
        json={
            "population": 250,
            "buildings": [{"building_id": "main_building", "level": 20}],
            "crop_fields_production": 400,
            "hero_crop_consumption": 6,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["population_consumption"] == 250
    assert body["total_consumption"] == 256
    assert body["balance"] == 400 - 256


def test_crop_balance_rejects_bad_levels():
    c = client
    for lvl in (0, -5, 99):
        r = c.post(
            "/api/v1/calculator/crop/balance",
            json={"buildings": [{"building_id": "main_building", "level": lvl}]},
        )
        assert r.status_code == 422, lvl
        assert "級" in r.json()["detail"]


def test_opening_checklist_uses_official_slave_militia_spelling() -> None:
    """開局清單的埃及打野兵英文名用官方拼法（troops.json），不是 Excel 的 Malitia。"""
    import json
    from pathlib import Path

    static = Path(__file__).resolve().parents[2] / "data" / "static"
    text = (static / "opening_checklist.json").read_text(encoding="utf-8")
    assert "Malitia" not in text
    troops = json.loads((static / "troops.json").read_text(encoding="utf-8"))
    names = json.dumps(troops, ensure_ascii=False)
    assert '"name_en": "Slave Militia"' in names
