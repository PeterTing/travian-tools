"""P0-15 phase 1: unit speeds rebuilt from first-hand sources only.

- One table: scripts/game_data/gen_game_data.py UNIT_SPEEDS
  -> backend/data/static/unit_speeds.json, troops.json (speed fields only),
     frontend/src/data/unitSpeeds.gen.json
- ts11 = ts11 in-game help (manual/troop/N); raw text in
  scripts/game_data/evidence/ts11_manual_troop_speed_2026-10-09.json
- official = support.travian.com; pending = no first-hand source (speed None)
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.knowledge_base.tribes import TRIBES_DATA
from app.main import app
from app.services.game_data_service import get_game_data_service

ROOT = Path(__file__).resolve().parents[3]
GEN = ROOT / "scripts" / "game_data" / "gen_game_data.py"
BE_SPEEDS = ROOT / "backend" / "data" / "static" / "unit_speeds.json"
BE_TROOPS = ROOT / "backend" / "data" / "static" / "troops.json"
FE_SPEEDS = ROOT / "frontend" / "src" / "data" / "unitSpeeds.gen.json"
EVIDENCE = (
    ROOT
    / "scripts"
    / "game_data"
    / "evidence"
    / "ts11_manual_troop_speed_2026-10-09.json"
)

TRIBES = ["romans", "teutons", "gauls", "egyptians", "huns", "spartans", "vikings"]
OFFICIAL_PREFIX = "https://support.travian.com/"
FORBIDDEN = (
    "kirilloid",
    "fandom",
    "friso",
    "gettertools",
    "gettermap",
    "adipiciu",
    "wendeltytan",
    "travian.tools",
    "tinafus",
)

# Read on ts11's in-game help on 2026-10-09 (t1..t10 per tribe). Pinned on purpose:
# changing one of these needs a new ts11 reading, not an edit.
TS11_PINNED = {
    "romans": [6, 5, 7, 16, 14, 10, 4, 3, 4, 5],
    "teutons": [7, 7, 6, 9, 10, 9, 4, 3, 4, 5],
    "gauls": [7, 6, 17, 19, 16, 13, 4, 3, 5, 5],
    "egyptians": [7, 6, 7, 16, 15, 10, 4, 3, 4, 5],
    "huns": [6, 6, 19, 16, 15, 14, 4, 3, 5, 5],
}
OFFICIAL_PINNED = {
    # S139 Viking Units Overview
    "vikings": [7, 7, 5, 9, 12, 9, 4, 3, 5, 5],
    # S187 (infantry + cavalry only); siege / Ephor / settler have no source yet
    "spartans": [6, 9, 8, 6, 16, 9, None, None, None, None],
}

client = TestClient(app)


def _gen():
    spec = importlib.util.spec_from_file_location("gen_game_data", GEN)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _rows(tribe: str) -> list[dict]:
    rows: list[dict] = _load(BE_SPEEDS)["tribes"][tribe]
    return rows


def test_every_unit_of_every_tribe_has_a_speed_with_provenance():
    data = _load(BE_SPEEDS)
    assert list(data["tribes"]) == TRIBES
    for tribe in TRIBES:
        rows = data["tribes"][tribe]
        assert [r["slot"] for r in rows] == list(range(1, 11)), tribe
        for r in rows:
            assert r["source"] in ("ts11", "official", "pending"), r
            if r["source"] == "pending":
                assert r["speed"] is None and r["ref"] is None, r
            else:
                assert isinstance(r["speed"], int) and r["speed"] >= 1, r
                assert r["ref"], r
            if r["source"] == "official":
                assert r["ref"].startswith(OFFICIAL_PREFIX), r
            if r["source"] == "ts11":
                assert r["ref"].startswith("manual/troop/"), r


def test_no_external_player_site_is_cited():
    text = (
        BE_SPEEDS.read_text(encoding="utf-8") + FE_SPEEDS.read_text(encoding="utf-8")
    ).lower()
    for bad in FORBIDDEN:
        assert bad not in text, bad
    gen_text = GEN.read_text(encoding="utf-8").lower()
    table = gen_text[
        gen_text.index("unit_speed_sources = {") : gen_text.index("def round5")
    ]
    for bad in FORBIDDEN:
        assert bad not in table, bad


def test_frontend_and_backend_speed_files_are_identical():
    assert _load(FE_SPEEDS) == _load(BE_SPEEDS)


def test_troops_json_speed_fields_come_from_the_table():
    troops = _load(BE_TROOPS)["troops"]
    seen = set()
    for tribe in TRIBES:
        for r in _rows(tribe):
            t = troops[r["troop_id"]]
            assert t["tribe"] == tribe
            assert t["speed"] == r["speed"], r["troop_id"]
            assert t["speed_source"] == r["source"], r["troop_id"]
            assert t["speed_ref"] == r["ref"], r["troop_id"]
            seen.add(r["troop_id"])
    assert seen == set(troops), "every troop in troops.json must be in UNIT_SPEEDS"


def test_game_data_service_exposes_the_new_speeds():
    svc = get_game_data_service().troops
    assert svc.get_troop("marksman").speed == 15  # old copied value was 16
    assert svc.get_troop("jarl").speed == 5  # old copied value was 4
    ballista = svc.get_troop("ballista")
    assert ballista.speed is None and ballista.speed_source == "pending"


def test_knowledge_base_tribes_use_the_same_speeds():
    for tribe in TRIBES:
        troops = TRIBES_DATA[tribe]["troops"]
        assert len(troops) == 10, tribe
        for r in _rows(tribe):
            kb = troops[r["kb_id"]]
            assert kb["speed"] == r["speed"], (tribe, r["kb_id"])
            assert kb["speed_source"] == r["source"], (tribe, r["kb_id"])


@pytest.mark.parametrize("tribe", list(TS11_PINNED))
def test_ts11_values_are_pinned_and_match_the_captured_in_game_help(tribe: str):
    evidence = _load(EVIDENCE)["troops"]
    rows = _rows(tribe)
    assert [r["speed"] for r in rows] == TS11_PINNED[tribe]
    for r in rows:
        assert r["source"] == "ts11"
        manual_id = r["ref"].removeprefix("manual/troop/")
        assert evidence[manual_id]["speed"] == r["speed"], (tribe, manual_id)
        assert evidence[manual_id]["speed_text"].startswith(f"{r['speed']} 格"), (
            manual_id
        )


@pytest.mark.parametrize("tribe", list(OFFICIAL_PINNED))
def test_official_values_are_pinned(tribe: str):
    assert [r["speed"] for r in _rows(tribe)] == OFFICIAL_PINNED[tribe]


def test_ts11_agrees_with_official_s187_except_known_difference():
    mod = _gen()
    for tribe, s187 in mod.S187_SPEED.items():
        speeds = [r["speed"] for r in _rows(tribe)][:6]
        for i, (ours, official) in enumerate(zip(speeds, s187, strict=True)):
            if (tribe, i) in mod.S187_KNOWN_DIFF:
                assert ours != official
            else:
                assert ours == official, (tribe, i + 1)


def test_reverse_ts_reads_new_speeds_and_skips_pending_units():
    # 15 fields at speed 15 (Hun Marksman, Egyptian Anhur Guard) = 1 h, no TS
    res = client.post(
        "/api/v1/advanced-calculator/path-speed-ts",
        json={
            "attacker_x": 0,
            "attacker_y": 0,
            "target_x": 15,
            "target_y": 0,
            "travel_time_seconds": 3600,
            "server_speed": 1,
        },
    )
    assert res.status_code == 200
    body = res.json()
    m15 = [
        m
        for m in body["possible_matches"]
        if m["unit_speed"] == 15 and m["tournament_square_level"] == 0
    ]
    assert m15 and "Marksman" in m15[0]["possible_units"]
    assert "Anhur Guard" in m15[0]["possible_units"]
    for m in body["possible_matches"]:
        if m["unit_speed"] == 16:
            assert "Marksman" not in m["possible_units"]
    # the four Spartan units without a first-hand source
    assert sorted(body["unverified_units"]) == [
        "Ballista (spartans)",
        "Ephor (spartans)",
        "Ram (spartans)",
        "Settler (spartans)",
    ]


def test_troop_endpoints_return_speed_source():
    res = client.get("/api/v1/troops/spartans")
    assert res.status_code == 200
    items = {t["troop_id"]: t for t in res.json()["troops"]}
    assert (
        items["hoplite"]["speed"] == 6
        and items["hoplite"]["speed_source"] == "official"
    )
    assert (
        items["ephor"]["speed"] is None and items["ephor"]["speed_source"] == "pending"
    )
    detail = client.get("/api/v1/troops/gauls/phalanx").json()
    assert detail["speed"] == 7 and detail["speed_source"] == "ts11"
    assert detail["speed_ref"] == "manual/troop/21"
    cmp_ = client.get("/api/v1/troops/compare?troop_ids=ephor,ballista").json()
    assert cmp_["comparison_summary"]["best_speed"] == "待驗證"
