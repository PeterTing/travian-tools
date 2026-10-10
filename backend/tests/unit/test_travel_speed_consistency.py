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
    ("wrap-" if "from" in c else "")
    + f"d{round(c['distance'], 2)}-v{c['unitSpeed']}x{c['serverSpeed']}-ts{c['arenaLevel']}-b{c['bootsPercent']}"
    for c in CASES
]


def _xy(case: dict) -> tuple[int, int, int, int]:
    """出發、目標座標：有 from／to 用它（跨地圖邊緣），不然 (0,0)→(distance,0)."""
    if "from" in case:
        return (*case["from"], *case["to"])
    return 0, 0, int(case["distance"]), 0


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
    fx, fy, tx, ty = _xy(case)
    r = svc.calculate_path(
        PathCalculatorRequest(
            start_x=fx,
            start_y=fy,
            target_x=tx,
            target_y=ty,
            unit_speed=case["unitSpeed"],
            server_speed=case["serverSpeed"],
            tournament_square_level=case["arenaLevel"],
            hero_bonus=case["bootsPercent"],
        )
    )
    assert r.travel_time_seconds == case["seconds"]
    assert r.distance == round(case["distance"], 2)


def test_interception_catcher_and_attacker_return(case: dict) -> None:
    fx, fy, tx, ty = _xy(case)
    r = svc.calculate_interception(
        InterceptionRequest(
            attacker_x=fx,
            attacker_y=fy,
            defender_x=tx,
            defender_y=ty,
            attack_arrival_time="00:00:00",
            attacker_speed=case["unitSpeed"],
            attacker_ts_level=case["arenaLevel"],
            attacker_hero_bonus=case["bootsPercent"],
            # 攔截者就在被攻擊的村子：到攻擊者家的距離跟回程一樣
            catcher_x=tx,
            catcher_y=ty,
            catcher_speed=case["unitSpeed"],
            catcher_ts_level=case["arenaLevel"],
            catcher_hero_bonus=case["bootsPercent"],
            server_speed=case["serverSpeed"],
        )
    )
    # 攔截者行進時間
    assert _hms(r.travel_time_formatted) == case["seconds"]
    assert r.distance_to_attacker == round(case["distance"], 2)
    # 攻擊方回程：到家時間 − 攻擊到達時間（只有時分秒，超過 24 小時取餘數）
    back = datetime.strptime(r.attacker_return_time, "%H:%M:%S")
    back_secs = back.hour * 3600 + back.minute * 60 + back.second
    assert back_secs == case["seconds"] % 86400


def test_ts_optimizer(case: dict) -> None:
    fx, fy, tx, ty = _xy(case)
    r = svc.calculate_ts_optimizer(
        TsOptimizerRequest(
            target_x=fx,
            target_y=fy,
            target_arrival="2030-01-01T12:00:00+00:00",
            server_speed=case["serverSpeed"],
            attackers=[
                AttackerProfile(
                    village_label="A",
                    x=tx,
                    y=ty,
                    unit_speed=case["unitSpeed"],
                    ts_level=case["arenaLevel"],
                    hero_bonus=case["bootsPercent"],
                )
            ],
        )
    )
    assert _hms(r.results[0].travel_time_formatted) == case["seconds"]
    assert r.results[0].distance == round(case["distance"], 2)


def test_reverse_ts_finds_the_exact_seconds(case: dict) -> None:
    fx, fy, tx, ty = _xy(case)
    r = svc.calculate_path_speed_ts(
        PathSpeedTsRequest(
            attacker_x=fx,
            attacker_y=fy,
            target_x=tx,
            target_y=ty,
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
    assert r.distance == round(case["distance"], 2)


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


class TestNewFieldsEmptyMeansSameAsBefore:
    """PM：新欄位（靴子、攻擊方競技場）不填時，每個工具的結果跟 P0-21 之前一模一樣.

    期望值是改前的程式（main addd065）用同一組輸入算出來的
    （review/p0-21/before_after.py → before.json）。
    """

    def test_march_time(self) -> None:
        r = svc.calculate_path(
            PathCalculatorRequest(
                start_x=0,
                start_y=0,
                target_x=50,
                target_y=0,
                unit_speed=7,
                tournament_square_level=5,
            )
        )
        assert r.travel_time_seconds == 18000

    def test_interception(self) -> None:
        r = svc.calculate_interception(
            InterceptionRequest(
                attacker_x=0,
                attacker_y=0,
                defender_x=50,
                defender_y=0,
                attack_arrival_time="12:00:00",
                attacker_speed=7,
                catcher_x=0,
                catcher_y=30,
                catcher_speed=10,
                catcher_ts_level=5,
            )
        )
        assert r.model_dump() == {
            "attacker_return_time": "19:08:34",
            "send_time": "16:38:34",
            "travel_time_formatted": "2h 30m 0s",
            "distance_to_attacker": 30.0,
            "return_day_offset": 0,
            "send_day_offset": 0,
        }

    def test_ts_optimizer(self) -> None:
        r = svc.calculate_ts_optimizer(
            TsOptimizerRequest(
                target_x=0,
                target_y=0,
                target_arrival="2030-01-01T12:00:00+00:00",
                attackers=[
                    AttackerProfile(
                        village_label="A", x=50, y=0, unit_speed=6, ts_level=5
                    )
                ],
            )
        )
        res = r.results[0]
        assert (res.send_time, res.travel_time_formatted, res.distance) == (
            "2030-01-01T06:10:00+00:00",
            # 跟其他行軍工具同一種寫法（稽核 2026-10-10：時間格式統一）
            "5h 50m 0s",
            50.0,
        )

    def test_reverse_ts(self) -> None:
        r = svc.calculate_path_speed_ts(
            PathSpeedTsRequest(
                attacker_x=0,
                attacker_y=0,
                target_x=50,
                target_y=0,
                travel_time_seconds=18000,
            )
        )
        assert [
            (m.unit_speed, m.tournament_square_level, m.calculated_travel_time_seconds)
            for m in r.possible_matches
            if m.unit_speed == 7
        ] == [(7, 5, 18000)]

    def test_save_troops(self) -> None:
        r = svc.calculate_save_troops(
            SaveTroopsRequest(
                village_x=0,
                village_y=0,
                unit_speed=7,
                offline_hours=8,
                tournament_square_level=5,
            )
        )
        assert r.model_dump() == {
            "ideal_distance": 36.0,
            "send_time_formatted": "4h 0m 0s",
            "return_time_formatted": "8h 0m 0s",
            "max_map_distance": 282.84,
            "exceeds_map": False,
        }

    def test_new_fields_default_to_zero(self) -> None:
        base = {
            "attacker_x": 0,
            "attacker_y": 0,
            "defender_x": 1,
            "defender_y": 0,
            "attack_arrival_time": "12:00:00",
            "attacker_speed": 7,
            "catcher_x": 0,
            "catcher_y": 0,
            "catcher_speed": 7,
        }
        req = InterceptionRequest(**base)
        assert (
            req.attacker_ts_level,
            req.attacker_hero_bonus,
            req.catcher_hero_bonus,
        ) == (0, 0, 0)
        assert (
            AttackerProfile(village_label="A", x=0, y=0, unit_speed=1).hero_bonus == 0
        )
        assert (
            PathSpeedTsRequest(
                attacker_x=0,
                attacker_y=0,
                target_x=1,
                target_y=0,
                travel_time_seconds=1,
            ).hero_bonus
            == 0
        )
        assert (
            SaveTroopsRequest(
                village_x=0, village_y=0, unit_speed=1, offline_hours=1
            ).hero_bonus
            == 0
        )
