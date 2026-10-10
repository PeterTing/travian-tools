"""建築、部族、兵種中文名一律是 ts11 遊戲內名稱（#33）.

前後端都讀 data/static/ingame_names.json（scripts/game_data/gen_game_data.py 產生，來源是
evidence/ts11_manual_2026-10-10.json）；以前用過的名字只在 aliases，給搜尋用。
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
ROOT = Path(__file__).resolve().parents[3]
STATIC = ROOT / "backend/data/static"
NAMES = json.loads((STATIC / "ingame_names.json").read_text(encoding="utf-8"))
MANUAL = json.loads(
    (ROOT / "scripts/game_data/evidence/ts11_manual_2026-10-10.json").read_text(
        encoding="utf-8"
    )
)


def _load(name: str) -> dict:
    return json.loads((STATIC / name).read_text(encoding="utf-8"))


def test_table_is_the_in_game_help():
    for row in NAMES["buildings"].values():
        assert row["zh"] == MANUAL["buildings"][str(row["gid"])]["name_zh"]
    for row in NAMES["units"].values():
        if row["game_id"] is not None:
            assert row["zh"] == MANUAL["troops"][str(row["game_id"])]["name_zh"]
    assert NAMES["buildings"]["blacksmith"]["zh"] == "盔甲廠"
    assert NAMES["tribes"]["teutons"]["zh"] == "日耳曼人"


def test_buildings_resources_troops_use_the_table():
    buildings = _load("buildings.json")["buildings"]
    for bid, b in buildings.items():
        assert b["name_zh"] == NAMES["buildings"][bid]["zh"], bid
    assert "armoury" not in buildings  # T3 防具工坊，T4 遊戲裡沒有
    fields = {
        "wood": "woodcutter",
        "clay": "clay_pit",
        "iron": "iron_mine",
        "crop": "cropland",
    }
    for rtype, r in _load("resources.json")["resource_fields"].items():
        assert r["name_zh"] == NAMES["buildings"][fields[rtype]]["zh"]
    for tid, t in _load("troops.json")["troops"].items():
        if tid in NAMES["units"]:
            assert t["name_zh"] == NAMES["units"][tid]["zh"], tid


def test_each_unit_has_one_name_in_every_backend_file():
    speeds = _load("unit_speeds.json")["tribes"]
    troops = _load("troops.json")["troops"]
    for rows in speeds.values():
        for r in rows:
            u = NAMES["units"].get(r["troop_id"])
            if not u:
                continue
            seen = {u["zh"], troops[r["troop_id"]]["name_zh"]}
            if r["stats"]:
                seen.add(r["stats"]["name_zh"])
            assert seen == {u["zh"]}, r["troop_id"]


def test_old_names_still_find_the_building_and_unit():
    res = client.get("/api/v1/buildings", params={"search": "鐵匠鋪"})
    assert [b["building_id"] for b in res.json()["buildings"]] == ["blacksmith"]
    assert res.json()["buildings"][0]["name_zh"] == "盔甲廠"
    res = client.get("/api/v1/troops", params={"search": "草原騎兵"})
    assert [t["name_zh"] for t in res.json()["troops"]] == ["草原騎士"]


def test_reverse_ts_lists_in_game_unit_and_tribe_names():
    res = client.post(
        "/api/v1/advanced-calculator/path-speed-ts",
        json={
            "attacker_x": 0,
            "attacker_y": 0,
            "target_x": 16,
            "target_y": 0,
            "travel_time_seconds": 3600,
            "server_speed": 1,
        },
    )
    m16 = next(
        m
        for m in res.json()["possible_matches"]
        if m["unit_speed"] == 16 and m["tournament_square_level"] == 0
    )
    zh = m16["possible_units_zh"]
    assert "草原騎士（匈奴）" in zh
    assert "使者騎士（羅馬人）" in zh
    assert "探險者索普杜（埃及人）" in zh


def _old_names() -> list[str]:
    ingame = {
        r["zh"] for sec in ("buildings", "units", "tribes") for r in NAMES[sec].values()
    }
    al = {
        a
        for sec in ("buildings", "units")
        for r in NAMES[sec].values()
        for a in r["aliases"]
    }
    return sorted((al | {"條頓"}) - ingame)


def test_no_old_name_in_backend_text():
    """舊名只能出現在 aliases_zh；遊戲文字解析器（parsers/）要認得舊譯名，不算；knowledge_base 沒有接到 API（P0-23 移除）."""
    ingame = sorted(
        {
            r["zh"]
            for sec in ("buildings", "units", "tribes")
            for r in NAMES[sec].values()
        },
        key=len,
        reverse=True,
    )
    old = _old_names()
    files = [
        p
        for p in (ROOT / "backend/app").rglob("*.py")
        if "parsers" not in p.parts and "knowledge_base" not in p.parts
    ]
    files += [p for p in STATIC.glob("*.json") if p.name != "ingame_names.json"]
    bad = []
    for p in files:
        text = p.read_text(encoding="utf-8")
        text = re.sub(r'"aliases_zh": \[[^\]]*\]', "", text)
        for n in ingame:
            text = text.replace(n, "＿")
        hits = [a for a in old if a in text]
        if hits:
            bad.append(f"{p.relative_to(ROOT)}: {hits}")
    assert bad == []
