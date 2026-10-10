"""Generated game data: one set of numbers, calibrated against ts11.

- backend/data/static/{buildings,resources,culture_points}.json and
  frontend/src/data/gameData.gen.json come from scripts/game_data/gen_game_data.py
- ts11 evidence: /workspace/travian/review/realtest/tool-verification.md
- official CP table: tests/fixtures/official/culture_points_villages.txt
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.game_data_service import get_game_data_service
from app.utils.culture_points import (
    celebration_cap,
    celebration_cp,
    is_verified,
    start_cp,
    village_requirements,
)
from app.utils.travian_formulas import calculate_build_time

ROOT = Path(__file__).resolve().parents[3]
GEN = ROOT / "scripts" / "game_data" / "gen_game_data.py"
FIXTURE = (
    Path(__file__).resolve().parents[1]
    / "fixtures"
    / "official"
    / "culture_points_villages.txt"
)

client = TestClient(app)


def _gen_module():
    spec = importlib.util.spec_from_file_location("gen_game_data", GEN)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _b(bid: str):
    b = get_game_data_service().buildings.get_building(bid)
    assert b is not None
    return b


def _lv(bid: str, level: int):
    lv = _b(bid).get_level(level)
    assert lv is not None
    return lv


# ─── single source ────────────────────────────────────────────────


@pytest.mark.skipif(not GEN.exists(), reason="generator not shipped in this checkout")
def test_generated_files_are_up_to_date() -> None:
    """Committed JSON must equal a fresh run of the generator (no hand edits)."""
    mod = _gen_module()
    for path, text in mod.outputs().items():
        assert path.read_text(encoding="utf-8") == text, (
            f"stale: {path} — rerun the generator"
        )


def test_frontend_copy_matches_backend_buildings() -> None:
    fe = json.loads(
        (ROOT / "frontend/src/data/gameData.gen.json").read_text(encoding="utf-8")
    )
    be = json.loads(
        (ROOT / "backend/data/static/buildings.json").read_text(encoding="utf-8")
    )
    for bid, b in be["buildings"].items():
        rows = [
            [
                lv["cost_wood"],
                lv["cost_clay"],
                lv["cost_iron"],
                lv["cost_crop"],
                lv["build_time_base"],
                lv["culture_points"],
            ]
            for lv in b["levels"]
        ]
        assert fe["buildings"][bid] == rows, bid
    cp = json.loads(
        (ROOT / "backend/data/static/culture_points.json").read_text(encoding="utf-8")
    )
    assert fe["villageRequirements"] == cp["village_requirements"]


# ─── ts11 calibration: build time (MB applied, rounded to 10 s) ───

TS11_TIMES = [
    # (building, level, MB level, game seconds, evidence)
    ("main_building", 2, 1, 2620, "A1 0:43:40"),
    ("main_building", 3, 2, 3220, "A1-8 0:53:40"),
    ("main_building", 4, 3, 3880, "10/08 1:04:40"),
    ("warehouse", 1, 2, 1930, "A1-9 0:32:10"),
    ("warehouse", 2, 3, 2430, "10/08 0:40:30"),
    ("granary", 1, 2, 1540, "A1-10 0:25:40"),
    ("granary", 2, 2, 2080, "10/06 0:34:40"),
    ("granary", 3, 3, 2600, "10/08 0:43:20"),
    ("granary", 4, 3, 3300, "10/08 0:55:00"),
    ("cranny", 1, 2, 290, "A1-11 0:04:50"),
    ("cranny", 2, 3, 600, "10/08 0:10:00"),
    ("palisade", 1, 2, 1930, "A1-13 0:32:10"),
    ("embassy", 1, 2, 1930, "A1-12 0:32:10"),
    ("embassy", 1, 3, 1860, "10/08 0:31:00"),
    ("marketplace", 1, 3, 1670, "10/08 0:27:50"),
    ("barracks", 1, 3, 1860, "A1-15 ≈0:31:09"),
    ("woodcutter", 1, 1, 260, "A1-3 0:04:20"),
    ("woodcutter", 3, 1, 1190, "A1-4 0:19:50"),
    ("clay_pit", 1, 1, 220, "A1-5 0:03:40"),
    ("clay_pit", 2, 1, 550, "A1-5 0:09:10"),
    ("iron_mine", 1, 1, 450, "A1-6 0:07:30"),
    ("cropland", 1, 1, 150, "A1-7 0:02:30"),
    ("cropland", 3, 1, 900, "A1-7 0:15:00"),
    ("cropland", 3, 2, 870, "A2-3 0:14:30"),
]


@pytest.mark.parametrize(("bid", "level", "mb", "game", "evidence"), TS11_TIMES)
def test_build_time_matches_ts11(
    bid: str, level: int, mb: int, game: int, evidence: str
) -> None:
    assert calculate_build_time(_lv(bid, level).build_time_base, mb) == game, evidence


# ─── ts11 calibration: cost ───────────────────────────────────────

TS11_COSTS = [
    ("main_building", 2, (90, 50, 75, 25)),
    ("main_building", 3, (115, 65, 100, 35)),
    ("main_building", 4, (145, 85, 125, 40)),
    ("rally_point", 2, (140, 205, 115, 90)),
    ("warehouse", 1, (130, 160, 90, 40)),
    ("warehouse", 2, (165, 205, 115, 50)),
    ("granary", 2, (100, 130, 90, 25)),
    ("granary", 3, (130, 165, 115, 35)),
    ("granary", 4, (170, 210, 145, 40)),
    ("cranny", 1, (40, 50, 30, 10)),
    ("cranny", 2, (50, 65, 40, 15)),
    ("palisade", 1, (160, 100, 80, 60)),
    ("embassy", 1, (180, 130, 150, 80)),
    ("marketplace", 1, (80, 70, 120, 70)),
    ("barracks", 1, (210, 140, 260, 120)),
    ("woodcutter", 3, (110, 280, 140, 165)),
    ("cropland", 2, (115, 150, 115, 35)),
    ("cropland", 3, (195, 250, 195, 55)),
]


@pytest.mark.parametrize(("bid", "level", "cost"), TS11_COSTS)
def test_cost_matches_ts11(
    bid: str, level: int, cost: tuple[int, int, int, int]
) -> None:
    lv = _lv(bid, level)
    assert (lv.cost_wood, lv.cost_clay, lv.cost_iron, lv.cost_crop) == cost


def test_smithy_l2_uses_t4_cost_not_t3() -> None:
    lv = _lv("blacksmith", 2)
    assert (lv.cost_wood, lv.cost_clay, lv.cost_iron, lv.cost_crop) == (
        230,
        320,
        640,
        205,
    )


def test_hero_mansion_l1_from_ts11_manual() -> None:
    """P0-19: ts11 manual/building/37 L1 = 700/670/700/240, 2300 s, pop 2.
    (80/120/70/90 is the trapper's L1, manual/building/36.)"""
    lv = _lv("heros_mansion", 1)
    assert (lv.cost_wood, lv.cost_clay, lv.cost_iron, lv.cost_crop) == (
        700,
        670,
        700,
        240,
    )
    assert lv.build_time_base == 2300
    tr = _lv("trapper", 1)
    assert (tr.cost_wood, tr.cost_clay, tr.cost_iron, tr.cost_crop) == (80, 120, 70, 90)


@pytest.mark.skipif(not GEN.exists(), reason="generator not shipped in this checkout")
def test_every_l1_matches_ts11_manual() -> None:
    """L1 cost / time of all 35 buildings + 4 fields equal the ts11 in-game help."""
    mod = _gen_module()
    pops = mod.check_l1_against_manual()
    assert len(pops) == 35
    assert _lv("workshop", 1).population == 3
    assert _lv("town_hall", 1).population == 4
    assert _lv("brickyard", 1).build_time_base == 2240


# ─── ts11 calibration: CP ─────────────────────────────────────────

TS11_CP = [
    ("embassy", 1, 5),
    ("residence", 1, 2),
    ("palace", 1, 6),
    ("stonemasons_lodge", 1, 1),
    ("treasury", 1, 7),
    ("town_hall", 1, 6),
    ("cranny", 1, 1),
    ("cranny", 2, 1),
    ("palisade", 1, 1),
    ("woodcutter", 2, 1),
    ("cropland", 2, 1),
    ("granary", 3, 2),
    ("granary", 4, 2),
    ("main_building", 3, 3),
    ("main_building", 4, 4),
    ("marketplace", 1, 4),
]


@pytest.mark.parametrize(("bid", "level", "cp"), TS11_CP)
def test_cp_matches_ts11(bid: str, level: int, cp: int) -> None:
    assert _lv(bid, level).culture_points == cp


def test_cp_never_decreases_and_cp_per_day_matches() -> None:
    for bid, b in get_game_data_service().buildings.buildings.items():
        prev = 0
        for lv in b.levels:
            assert lv.culture_points >= prev, (bid, lv.level)
            assert lv.cp_per_day == lv.culture_points, (bid, lv.level)
            prev = lv.culture_points


@pytest.mark.parametrize(
    ("bid", "frm", "to", "delta"),
    [
        ("clay_pit", 1, 2, 0),
        ("cropland", 2, 3, 1),
        ("main_building", 2, 3, 0),
        ("iron_mine", 0, 1, 1),
    ],
)
def test_upgrade_cp_per_day_delta_ts11(bid: str, frm: int, to: int, delta: int) -> None:
    r = client.post(
        "/api/v1/calculator/building/upgrade",
        json={
            "building_id": bid,
            "from_level": frm,
            "to_level": to,
            "main_building_level": 3,
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["culture_points_per_day"] == delta


# ─── other known bugs ─────────────────────────────────────────────


def test_marketplace_needs_granary_1() -> None:
    pre = {(p.building_id, p.level) for p in _b("marketplace").prerequisites}
    assert pre == {("main_building", 3), ("warehouse", 1), ("granary", 1)}


def test_main_building_effect_is_0964_power() -> None:
    assert _lv("main_building", 3).effect_value == 0.929
    assert _lv("main_building", 4).effect_value == 0.896
    assert "93%" in (_lv("main_building", 3).effect_description or "")


# ─── culture points: one source ───────────────────────────────────


def _official() -> dict[int, list[int]]:
    cols: dict[int, list[int]] = {1: [], 2: [], 3: [], 5: [], 10: []}
    for line in FIXTURE.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        _, *vals = (int(x) for x in line.split())
        for speed, v in zip(cols, vals, strict=True):
            cols[speed].append(v)
    return cols


@pytest.mark.parametrize("speed", [1, 2, 3, 5, 10])
def test_village_requirements_match_official_table(speed: int) -> None:
    assert village_requirements(speed) == _official()[speed]


def test_strategies_kb_uses_the_single_source() -> None:
    from app.knowledge_base.strategies import CULTURE_POINTS_GUIDE

    ex = CULTURE_POINTS_GUIDE["village_requirements"]["example"]
    assert [e["cp_needed"] for e in ex] == [2000, 8000, 20000, 39000]


def test_advanced_calculator_uses_the_single_source() -> None:
    from app.services.advanced_calculator_service import CP_REQUIREMENTS

    assert CP_REQUIREMENTS == village_requirements(1)[:20]


def test_celebration_rule() -> None:
    assert celebration_cp(12, "small") == 12  # ts11 day 4: 12 CP/day
    assert celebration_cp(531, "small") == 500
    assert celebration_cp(5000, "great") == 2000
    assert [celebration_cap("small", s) for s in (1, 2, 3, 5, 10)] == [
        500,
        500,
        250,
        250,
        125,
    ]
    assert [celebration_cap("great", s) for s in (1, 2, 3, 5, 10)] == [
        2000,
        2000,
        1000,
        1000,
        500,
    ]
    assert [start_cp(s) for s in (1, 2, 3, 5, 10)] == [500, 250, 167, 100, 50]


def test_every_village_threshold_is_verified_against_official_s51() -> None:
    """P0-19: all 50 villages x 5 speeds equal the official S51 table."""
    for speed in (1, 2, 3, 5, 10):
        for village in (2, 3, 10, 50):
            assert is_verified(village, speed), (village, speed)
    assert not is_verified(51, 1)
    assert not is_verified(2, 4)


# ─── 待驗證 follows the per-building verified flag ────────────────


@pytest.mark.skipif(not GEN.exists(), reason="generator not shipped in this checkout")
def test_every_building_is_verified_against_the_official_knowledge_base() -> None:
    """P0-23: every level of every building comes from the official knowledge base
    table (the page the ts11 in-game help links to), so nothing is 待驗證."""
    mod = _gen_module()
    fe = json.loads(
        (ROOT / "frontend/src/data/gameData.gen.json").read_text(encoding="utf-8")
    )
    assert fe["pending"] == {}
    backend = json.loads(
        (ROOT / "backend/data/static/buildings.json").read_text(encoding="utf-8")
    )["buildings"]
    for bid, b in backend.items():
        rows = mod._kb_levels(bid)
        assert rows, bid
        pop = 0
        for lv in b["levels"]:
            k = rows[lv["level"]]
            pop += lv["population"]
            cost = [lv["cost_wood"], lv["cost_clay"], lv["cost_iron"], lv["cost_crop"]]
            assert cost == k["cost"], (bid, lv["level"])
            assert pop == k["pop_total"], (bid, lv["level"])
            assert lv["culture_points"] == k["cp"], (bid, lv["level"])
            if bid != "main_building":
                assert lv["build_time_base"] == k["time_s"], (bid, lv["level"])
            elif lv["level"] > 1:  # KB times the MB with the previous MB level
                t = lv["build_time_base"] * mod.MB_FACTOR ** (lv["level"] - 2)
                assert abs(t - k["time_s"]) <= 10, lv["level"]


@pytest.mark.skipif(not GEN.exists(), reason="generator not shipped in this checkout")
def test_values_corrected_by_the_official_table() -> None:
    """P0-23 corrections: brewery cost, hero mansion / trapper build times."""
    b = json.loads(
        (ROOT / "backend/data/static/buildings.json").read_text(encoding="utf-8")
    )["buildings"]
    lv2 = b["brewery"]["levels"][1]
    cost = [lv2["cost_wood"], lv2["cost_clay"], lv2["cost_iron"], lv2["cost_crop"]]
    assert cost == [3980, 2540, 3410, 4750]
    assert b["heros_mansion"]["levels"][1]["build_time_base"] == 2670
    assert b["trapper"]["levels"][1]["build_time_base"] == 2320


@pytest.mark.skipif(not GEN.exists(), reason="generator not shipped in this checkout")
def test_building_without_official_table_is_still_pending() -> None:
    mod = _gen_module()
    p = dict(mod.PARAMS["stable"])
    assert mod.pending_fields("not_in_knowledge_base", p) == ["cost", "time"]
    mod.KB_VERIFIED.add("stable")
    assert mod.pending_fields("stable", p) == []
    p["verified"] = True
    assert mod.pending_fields("not_in_knowledge_base", p) == []


@pytest.mark.skipif(not GEN.exists(), reason="generator not shipped in this checkout")
def test_viking_units_follow_official_s139() -> None:
    """Vikings: cost / upkeep / training time / attack / defence from S139."""
    t = json.loads(
        (ROOT / "backend/data/static/troops.json").read_text(encoding="utf-8")
    )["troops"]
    vik = [r for r in t.values() if r.get("tribe") == "vikings"]
    assert len(vik) == 10
    assert all(r["stats_source"] == "official" for r in vik)
    jarl = next(r for r in vik if r["troop_id"].endswith("jarl"))
    assert (jarl["attack"], jarl["defense_infantry"], jarl["defense_cavalry"]) == (
        40,
        40,
        60,
    )
    assert jarl["training_time_base"] == 70500
    settler = next(r for r in vik if r["troop_id"].endswith("settler"))
    assert settler["attack"] == 10
    cost = [settler[f"cost_{k}"] for k in ("wood", "clay", "iron", "crop")]
    assert cost == [5800, 4600, 4800, 4800]
    assert settler["training_time_base"] == 31000
