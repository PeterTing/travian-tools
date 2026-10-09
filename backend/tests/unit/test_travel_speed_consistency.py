"""P0-21：同樣的距離、速度、競技場、靴子 → 每個工具算出的秒數完全一樣.

案例在 docs/knowledge/travel-speed-cases.json（前端 travianFormulas.test.ts 讀同一份）。
"""

import json
from datetime import datetime
from pathlib import Path

import pytest

from app.domain.schemas.advanced_calculator import (
    AttackerProfile,
    InterceptionRequest,
    PathCalculatorRequest,
    PathSpeedTsRequest,
    SaveTroopsRequest,
    TsOptimizerRequest,
)
from app.services.advanced_calculator_service import AdvancedCalculatorService
from app.utils.travian_formulas import (
    calculate_travel_seconds,
    distance_for_travel_hours,
    travel_hours,
)

CASES_PATH = (
    Path(__file__).resolve().parents[3]
    / "docs"
    / "knowledge"
    / "travel-speed-cases.json"
)
CASES = json.loads(CASES_PATH.read_text(encoding="utf-8"))["cases"]
IDS = [
    f"d{c['distance']}-v{c['unitSpeed']}x{c['serverSpeed']}-ts{c['arenaLevel']}-b{c['bootsPercent']}"
    for c in CASES
]

svc = AdvancedCalculatorService()


def _hms(text: str) -> int:
    """'1h 2m 3s' 或 '1:02:03' → 秒."""
    if ":" in text:
        h, m, s = (int(x) for x in text.split(":"))
    else:
        h, m, s = (int(x[:-1]) for x in text.split())
    return h * 3600 + m * 60 + s


@pytest.fixture(params=CASES, ids=IDS)
def case(request: pytest.FixtureRequest) -> dict:
    return request.param


def test_shared_formula(case: dict) -> None:
    assert (
        calculate_travel_seconds(
            distance=case["distance"],
            unit_speed=case["unitSpeed"],
            server_speed=case["serverSpeed"],
            tournament_square_level=case["arenaLevel"],
            hero_bonus_percent=case["bootsPercent"],
        )
        == case["seconds"]
    )


def test_march_time(case: dict) -> None:
    r = svc.calculate_path(
        PathCalculatorRequest(
            start_x=0,
            start_y=0,
            target_x=case["distance"],
            target_y=0,
            unit_speed=case["unitSpeed"],
            server_speed=case["serverSpeed"],
            tournament_square_level=case["arenaLevel"],
            hero_bonus=case["bootsPercent"],
        )
    )
    assert r.travel_time_seconds == case["seconds"]


def test_interception_catcher_and_attacker_return(case: dict) -> None:
    d = case["distance"]
    r = svc.calculate_interception(
        InterceptionRequest(
            attacker_x=0,
            attacker_y=0,
            defender_x=d,
            defender_y=0,
            attack_arrival_time="00:00:00",
            attacker_speed=case["unitSpeed"],
            attacker_ts_level=case["arenaLevel"],
            attacker_hero_bonus=case["bootsPercent"],
            catcher_x=0,
            catcher_y=d,
            catcher_speed=case["unitSpeed"],
            catcher_ts_level=case["arenaLevel"],
            catcher_hero_bonus=case["bootsPercent"],
            server_speed=case["serverSpeed"],
        )
    )
    # 攔截者行進時間
    assert _hms(r.travel_time_formatted) == case["seconds"]
    # 攻擊方回程：到家時間 − 攻擊到達時間（只有時分秒，超過 24 小時取餘數）
    back = datetime.strptime(r.attacker_return_time, "%H:%M:%S")
    back_secs = back.hour * 3600 + back.minute * 60 + back.second
    assert back_secs == case["seconds"] % 86400


def test_ts_optimizer(case: dict) -> None:
    r = svc.calculate_ts_optimizer(
        TsOptimizerRequest(
            target_x=0,
            target_y=0,
            target_arrival="2030-01-01T12:00:00+00:00",
            server_speed=case["serverSpeed"],
            attackers=[
                AttackerProfile(
                    village_label="A",
                    x=case["distance"],
                    y=0,
                    unit_speed=case["unitSpeed"],
                    ts_level=case["arenaLevel"],
                    hero_bonus=case["bootsPercent"],
                )
            ],
        )
    )
    assert _hms(r.results[0].travel_time_formatted) == case["seconds"]


def test_reverse_ts_finds_the_exact_seconds(case: dict) -> None:
    r = svc.calculate_path_speed_ts(
        PathSpeedTsRequest(
            attacker_x=0,
            attacker_y=0,
            target_x=case["distance"],
            target_y=0,
            travel_time_seconds=case["seconds"],
            server_speed=case["serverSpeed"],
            hero_bonus=case["bootsPercent"],
        )
    )
    hits = [
        m.calculated_travel_time_seconds
        for m in r.possible_matches
        if m.unit_speed == case["unitSpeed"]
        and (
            m.tournament_square_level == case["arenaLevel"]
            # 20 格以內競技場沒差：每一級算出來都一樣
            or case["distance"] <= 20
        )
    ]
    assert hits and all(h == case["seconds"] for h in hits)


def test_save_troops_is_the_inverse(case: dict) -> None:
    """躲兵：走「單程時間」那麼久 → 理想距離回到同一個距離."""
    hours = travel_hours(
        case["distance"],
        case["unitSpeed"],
        case["serverSpeed"],
        case["arenaLevel"],
        case["bootsPercent"],
    )
    r = svc.calculate_save_troops(
        SaveTroopsRequest(
            village_x=0,
            village_y=0,
            unit_speed=case["unitSpeed"],
            offline_hours=hours * 2,
            server_speed=case["serverSpeed"],
            tournament_square_level=case["arenaLevel"],
            hero_bonus=case["bootsPercent"],
        )
    )
    assert r.ideal_distance == pytest.approx(case["distance"], abs=0.01)
    assert distance_for_travel_hours(
        hours,
        case["unitSpeed"],
        case["serverSpeed"],
        case["arenaLevel"],
        case["bootsPercent"],
    ) == pytest.approx(case["distance"])
    assert _hms(r.send_time_formatted) == case["seconds"]


def test_intercept_attacker_return_uses_arena_beyond_20() -> None:
    """舊算法：回程 = 距離 ÷（速度 × 伺服器速度），沒算競技場（P0-21 之前）."""
    base: dict = {
        "attacker_x": 0,
        "attacker_y": 0,
        "defender_x": 50,
        "defender_y": 0,
        "attack_arrival_time": "12:00:00",
        "attacker_speed": 7,
        "catcher_x": 0,
        "catcher_y": 30,
        "catcher_speed": 10,
        "catcher_ts_level": 5,
    }
    old = svc.calculate_interception(InterceptionRequest(**base))
    assert old.attacker_return_time == "19:08:34"  # 50/7 h，競技場 0 跟以前一樣
    new = svc.calculate_interception(InterceptionRequest(**base, attacker_ts_level=5))
    assert new.attacker_return_time == "17:00:00"  # 20/7 + 30/(7×2) = 5 h
    assert new.send_time == "14:30:00"
