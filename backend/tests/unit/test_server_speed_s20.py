"""伺服器倍速 → 兵速倍率照官方 S20（不是直接乘倍速）.

S20「Game Versions and Speed」的表：Troops speed X1 Normal、X2 *2、X3 *2、X5 *2、X10 *4。
出處檔：scripts/game_data/evidence/official_s20_speed_2026-10-11.json（全文＋sha256）。
"""

import hashlib
import json
from pathlib import Path

import pytest

from app.utils.travian_formulas import (
    TROOP_SPEED_MULTIPLIER,
    calculate_travel_seconds,
    is_troop_speed_multiplier_verified,
    troop_speed_multiplier,
)

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = json.loads(
    (ROOT / "scripts/game_data/evidence/official_s20_speed_2026-10-11.json").read_text(
        encoding="utf-8"
    )
)
S20 = EVIDENCE["articles"]["s20"]
CASES = json.loads(
    (ROOT / "docs/knowledge/travel-speed-cases.json").read_text(encoding="utf-8")
)["cases"]
S20_CASES = [c for c in CASES if "derivation" in c]


def test_evidence_full_text_sha256_recomputable() -> None:
    assert "text_method" in EVIDENCE
    assert len(S20["text"]) > 1000
    assert hashlib.sha256(S20["text"].encode("utf-8")).hexdigest() == S20["text_sha256"]
    assert len(S20["html_sha256"]) == 64


def test_troop_speed_row_is_in_the_official_text() -> None:
    # 表格欄位順序 X1 X2 X3 X5 X10
    assert "Speed.\nX1\nX2\nX3\nX5\nX10\n" in S20["text"]
    assert "Troops speed:\nNormal\n*2\n*2\n*2\n*4\n" in S20["text"]


def test_table_matches_evidence() -> None:
    assert {
        int(k): v for k, v in S20["troop_speed_multiplier"].items()
    } == TROOP_SPEED_MULTIPLIER


@pytest.mark.parametrize(
    ("server_speed", "expected"), [(1, 1), (2, 2), (3, 2), (5, 2), (10, 4)]
)
def test_listed_speeds(server_speed: int, expected: int) -> None:
    assert troop_speed_multiplier(server_speed) == expected
    assert is_troop_speed_multiplier_verified(server_speed)


@pytest.mark.parametrize(
    ("server_speed", "expected"), [(0, 1), (-3, 1), (4, 2), (7, 2), (20, 4), (2.5, 2)]
)
def test_unlisted_speeds_fall_back_conservatively(
    server_speed: float, expected: int
) -> None:
    """表上沒有的倍速 → 待驗證，用不超過它的最大表上倍速（行軍時間寧長勿短）."""
    assert troop_speed_multiplier(server_speed) == expected
    if server_speed > 1:
        assert not is_troop_speed_multiplier_verified(server_speed)


def test_one_case_per_speed_each_with_arena_and_boots() -> None:
    assert sorted(c["serverSpeed"] for c in S20_CASES) == [1, 2, 3, 5, 10]
    for c in S20_CASES:
        assert c["arenaLevel"] > 0 and c["bootsPercent"] > 0


@pytest.mark.parametrize(
    "case", S20_CASES, ids=[f"x{c['serverSpeed']}" for c in S20_CASES]
)
def test_s20_cases(case: dict) -> None:
    # 每個案例的 derivation 寫了怎麼從 S20（兵速倍率）＋S71（20 格後 ×(1+0.2×競技場+靴子%)）算出 seconds
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


def test_x3_is_no_longer_multiplied_by_three() -> None:
    # 舊版 80 格、速度 10、x3、競技場 10、靴子 50% 算出 4457 秒（直接 ×3）；S20 是 ×2 → 6686 秒
    assert calculate_travel_seconds(80, 10, 3, 10, 50) == 6686
    assert calculate_travel_seconds(80, 10, 3, 10, 50) == calculate_travel_seconds(
        80, 10, 2, 10, 50
    )
