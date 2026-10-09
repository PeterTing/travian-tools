#!/usr/bin/env python3
"""Generate the single set of Travian game numbers used by backend AND frontend.

One parameter table (below) -> four generated files:

  backend/data/static/buildings.json      cost / build_time_base / culture_points
                                          (+ cp_per_day, MB effect, marketplace prereq)
  backend/data/static/resources.json      field cost / build_time_base / culture_points
  backend/data/static/culture_points.json village CP thresholds, celebration caps
  frontend/src/data/gameData.gen.json     compact copy of all of the above for the UI

Usage:
  python scripts/game_data/gen_game_data.py          # rewrite the files
  python scripts/game_data/gen_game_data.py --check  # exit 1 if any file is stale

Formulas (Travian Legends T4, x1, values before main-building / speed factors):

  cost(L)  = round5(base_cost × k^(L-1))                  per resource
  time(L)  = a × kt^(L-1) − b                              seconds, MB level 1
             buildings: kt = 1.16, b = 1875, a = time(L1) + 1875
             bonus buildings: kt = 1.5, b = 2400
             resource fields: kt = 1.6, b = 1000/3
             the game then multiplies by 0.964^(MB-1) ÷ speed and rounds to 10 s
             (backend app/utils/travian_formulas.calculate_build_time)
  CP(L)    = round(cp_base × 1.2^L)                        daily CP of a building at level L
  village CP threshold(v, speed) = round_u(1600 / speed × (v-1)^2.3),
             u = 1000 on x1, 100 on faster worlds
  celebration CP = daily CP production (small: that village, great: whole
             account), capped per world speed

Where every number comes from is in the PARAMS table "src" field:
  ts11   = measured in our ts11 x1 account (review/realtest/tool-verification.md)
  app    = the app's previous L1 value, already matching the game screen
  public = app value disagreed with the public game formula and ts11 has not
           shown this building yet; corrected, still to be measured in ts11
External calculators (kirilloid, Friso, GetterMap) are NOT copied: no code or
tables from them live here; they were only used afterwards to compare output.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND_BUILDINGS = ROOT / "backend/data/static/buildings.json"
BACKEND_RESOURCES = ROOT / "backend/data/static/resources.json"
BACKEND_CP = ROOT / "backend/data/static/culture_points.json"
FRONTEND_GEN = ROOT / "frontend/src/data/gameData.gen.json"

MB_FACTOR = 0.964
STD = (1.16, 1875.0)  # (kt, b) for normal buildings

# building_id: cost base, cost k, time (a, kt, b), CP base, sources, pending notes
# time a is "L1 seconds + b" for normal buildings.
PARAMS: dict[str, dict] = {
    "main_building":     {"c": (70, 40, 60, 20), "k": 1.28, "t1": 2000, "cp": 2, "src": "ts11"},
    "barracks":          {"c": (210, 140, 260, 120), "k": 1.28, "t1": 2000, "cp": 1, "src": "ts11"},
    "rally_point":       {"c": (110, 160, 90, 70), "k": 1.28, "t1": 2000, "cp": 1, "src": "ts11"},
    "warehouse":         {"c": (130, 160, 90, 40), "k": 1.28, "t1": 2000, "cp": 1, "src": "ts11"},
    "granary":           {"c": (80, 100, 70, 20), "k": 1.28, "t1": 1600, "cp": 1, "src": "ts11"},
    "marketplace":       {"c": (80, 70, 120, 70), "k": 1.28, "t1": 1800, "cp": 3, "src": "ts11"},
    "stable":            {"c": (260, 140, 220, 100), "k": 1.28, "t1": 2200, "cp": 2, "src": "public"},
    "academy":           {"c": (220, 160, 90, 40), "k": 1.28, "t1": 2000, "cp": 4, "src": "public"},
    # T4 smithy (attack + defence upgrades in one building)
    "blacksmith":        {"c": (180, 250, 500, 160), "k": 1.28, "t1": 2000, "cp": 2, "src": "public"},
    # T3-only building kept for old data; T4 worlds do not have it
    "armoury":           {"c": (130, 210, 410, 130), "k": 1.28, "t1": 2000, "cp": 2, "src": "public"},
    "cranny":            {"c": (40, 50, 30, 10), "k": 1.28, "t1": 300, "cp": 1, "src": "ts11"},
    "workshop":          {"c": (460, 510, 600, 320), "k": 1.28, "t1": 3000, "cp": 3, "src": "public"},
    "embassy":           {"c": (180, 130, 150, 80), "k": 1.28, "t1": 2000, "cp": 4, "src": "ts11"},
    "town_hall":         {"c": (1250, 1110, 1260, 600), "k": 1.28, "t1": 12500, "cp": 5, "src": "public"},
    "residence":         {"c": (580, 460, 350, 180), "k": 1.28, "t1": 2000, "cp": 2, "src": "public"},
    "palace":            {"c": (550, 800, 750, 250), "k": 1.28, "t1": 5000, "cp": 5, "src": "public"},
    "treasury":          {"c": (2880, 2740, 2580, 990), "k": 1.26, "t1": 8000, "cp": 6, "src": "public"},
    # T4 cost (80/120/70/90 ×1.33). Not yet seen in ts11 -> 待驗證.
    "heros_mansion":     {"c": (80, 120, 70, 90), "k": 1.33, "t1": 2000, "cp": 1, "src": "public",
                          "pending": ["cost", "time"]},
    "sawmill":           {"c": (520, 380, 290, 90), "k": 1.80, "t1": 3000, "cp": 1, "src": "public", "bonus": True},
    "brickyard":         {"c": (440, 480, 320, 50), "k": 1.80, "t1": 2840, "cp": 1, "src": "public", "bonus": True},
    "iron_foundry":      {"c": (200, 450, 510, 120), "k": 1.80, "t1": 4080, "cp": 1, "src": "public", "bonus": True},
    "grain_mill":        {"c": (500, 440, 380, 1240), "k": 1.80, "t1": 1840, "cp": 1, "src": "public", "bonus": True},
    "bakery":            {"c": (1200, 1480, 870, 1600), "k": 1.80, "t1": 3680, "cp": 1, "src": "public", "bonus": True},
    "stonemasons_lodge": {"c": (155, 130, 125, 70), "k": 1.28, "t1": 1700, "cp": 1, "src": "app",
                          "pending": ["time"]},
    "trade_office":      {"c": (1400, 1330, 1200, 400), "k": 1.28, "t1": 3000, "cp": 3, "src": "public"},
    "tournament_square": {"c": (1750, 2250, 1530, 240), "k": 1.28, "t1": 3500, "cp": 1, "src": "public"},
    "city_wall":         {"c": (70, 90, 170, 70), "k": 1.28, "t1": 2000, "cp": 1, "src": "public"},
    "earth_wall":        {"c": (120, 200, 0, 80), "k": 1.28, "t1": 2000, "cp": 1, "src": "public"},
    "palisade":          {"c": (160, 100, 80, 60), "k": 1.28, "t1": 2000, "cp": 1, "src": "ts11"},
    "great_barracks":    {"c": (630, 420, 780, 360), "k": 1.28, "t1": 2000, "cp": 1, "src": "public"},
    "great_stable":      {"c": (780, 420, 660, 300), "k": 1.28, "t1": 2200, "cp": 2, "src": "public"},
    "trapper":           {"c": (100, 100, 100, 100), "k": 1.28, "t1": 1200, "cp": 1, "src": "app",
                          "pending": ["time"]},
    "brewery":           {"c": (1460, 930, 1250, 1740), "k": 1.40, "t1": 3600, "cp": 4, "src": "app",
                          "pending": ["time"]},
    "horse_drinking_trough": {"c": (780, 420, 660, 540), "k": 1.28, "t1": 4200, "cp": 3, "src": "app",
                              "pending": ["time"]},
    "great_warehouse":   {"c": (650, 800, 450, 200), "k": 1.28, "t1": 9000, "cp": 1, "src": "public"},
    "great_granary":     {"c": (400, 500, 350, 100), "k": 1.28, "t1": 7000, "cp": 1, "src": "public"},
}

# Resource fields: cost k = 1.67, time a × 1.6^(L-1) − 1000/3. ts11 verified L1–L3.
FIELDS: dict[str, dict] = {
    "woodcutter": {"res": "wood", "c": (40, 100, 50, 60), "a": 1780 / 3},
    "clay_pit":   {"res": "clay", "c": (80, 40, 80, 50), "a": 1660 / 3},
    "iron_mine":  {"res": "iron", "c": (100, 80, 30, 60), "a": 2350 / 3},
    "cropland":   {"res": "crop", "c": (70, 90, 70, 20), "a": 1450 / 3},
}
FIELD_K = 1.67
FIELD_B = 1000 / 3

# Celebrations (x1 cost). Small crop 1,340 matches the opening build-order sheet
# (party step = 20,330 total) — not yet seen on a ts11 Town Hall -> 待驗證.
CELEBRATIONS = {
    "small": {"cost": [6400, 6650, 5940, 1340], "min_town_hall": 1, "pending": ["cost_crop"]},
    "great": {"cost": [29700, 33250, 32000, 6700], "min_town_hall": 10, "pending": ["cost"]},
}
# Official "Game Versions and Speed" table (support.travian.com/en/articles/20)
SPEEDS = [1, 2, 3, 5, 10]
CELEBRATION_CAP = {1: (500, 2000), 2: (500, 2000), 3: (250, 1000), 5: (250, 1000), 10: (125, 500)}
START_CP = {1: 500, 2: 250, 3: 167, 5: 100, 10: 50}
MAX_VILLAGES = 50


def round5(x: float) -> int:
    return math.floor(x / 5.0 + 0.5) * 5


def build_cost(base: tuple, k: float, level: int) -> list[int]:
    return [round5(b * k ** (level - 1)) for b in base]


def build_time(t1: float, level: int, bonus: bool = False) -> int:
    kt, b = (1.5, 2400.0) if bonus else STD
    a = t1 + b
    return math.floor(a * kt ** (level - 1) - b + 0.5)


def field_time(a: float, level: int) -> int:
    return math.floor(a * 1.6 ** (level - 1) - FIELD_B + 0.5)


def cp_at(base: int, level: int) -> int:
    if level <= 0:
        return 0
    return math.floor(base * 1.2**level + 0.5)


def village_cp(village: int, speed: int) -> int:
    if village <= 1:
        return 0
    unit = 1000 if speed == 1 else 100
    raw = 1600 / speed * (village - 1) ** 2.3
    return math.floor(raw / unit + 0.5) * unit


def mb_effect(level: int) -> float:
    return round(MB_FACTOR ** (level - 1), 3)


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def gen_buildings(current: dict) -> dict:
    out = json.loads(json.dumps(current))
    for bid, b in out["buildings"].items():
        if bid in FIELDS:
            f = FIELDS[bid]
            for lv in b["levels"]:
                L = lv["level"]
                w, c, i, cr = build_cost(f["c"], FIELD_K, L)
                lv.update(cost_wood=w, cost_clay=c, cost_iron=i, cost_crop=cr,
                          build_time_base=field_time(f["a"], L), culture_points=cp_at(1, L))
                lv["cp_per_day"] = lv["culture_points"]
            continue
        p = PARAMS[bid]
        for lv in b["levels"]:
            L = lv["level"]
            w, c, i, cr = build_cost(p["c"], p["k"], L)
            lv.update(cost_wood=w, cost_clay=c, cost_iron=i, cost_crop=cr,
                      build_time_base=build_time(p["t1"], L, p.get("bonus", False)),
                      culture_points=cp_at(p["cp"], L))
            lv["cp_per_day"] = lv["culture_points"]
            if bid == "main_building":
                eff = mb_effect(L)
                lv["effect_value"] = eff
                lv["effect_description"] = f"建造時間 {round(eff * 100)}%"
    mb = out["buildings"]["main_building"]
    mb["description_zh"] = (
        "村莊的行政中心。建造時間 × 0.964^(等級−1)：2 級 96%、3 級 93%、4 級 90%，20 級約 50%。"
    )
    mb["description_en"] = (
        "Administrative center. Build time × 0.964^(level−1): L2 96%, L3 93%, L4 90%, about 50% at L20."
    )
    cr = out["buildings"]["cranny"]
    if cr.get("description_en"):
        cr["description_en"] = cr["description_en"].replace("Gauls have double", "Gauls get 1.5×")
    th = out["buildings"]["town_hall"]
    th["levels"][0]["effect_value"] = 500
    th["levels"][0]["effect_description"] = "小慶典 CP＝本村每日 CP 產量（x1 上限 500）"
    for lv in th["levels"][1:]:
        if lv["level"] >= 10:
            lv["effect_description"] = "可辦大慶典：CP＝全帳號每日 CP 產量（x1 上限 2000）"
    mk = out["buildings"]["marketplace"]
    if not any(pr["building_id"] == "granary" for pr in mk["prerequisites"]):
        mk["prerequisites"].append({"building_id": "granary", "level": 1})
    return out


def gen_resources(current: dict) -> dict:
    out = json.loads(json.dumps(current))
    by_res = {f["res"]: f for f in FIELDS.values()}
    for rtype, r in out["resource_fields"].items():
        f = by_res[rtype]
        for lv in r["levels"]:
            L = lv["level"]
            if L == 0:
                continue
            w, c, i, cr = build_cost(f["c"], FIELD_K, L)
            lv.update(cost_wood=w, cost_clay=c, cost_iron=i, cost_crop=cr,
                      build_time_base=field_time(f["a"], L), culture_points=cp_at(1, L))
    return out


def gen_culture_points() -> dict:
    return {
        "_generated_by": "scripts/game_data/gen_game_data.py — do not edit by hand",
        "source": "https://support.travian.com/en/articles/51-culture-points-cp ; "
                  "https://support.travian.com/en/articles/20-game-versions-and-speed ; "
                  "https://support.travian.com/en/articles/82-celebrations-and-town-hall",
        "village_requirements": {str(s): [village_cp(v, s) for v in range(1, MAX_VILLAGES + 1)]
                                 for s in SPEEDS},
        "start_cp": {str(s): START_CP[s] for s in SPEEDS},
        "celebration_cap": {str(s): {"small": CELEBRATION_CAP[s][0], "great": CELEBRATION_CAP[s][1]}
                            for s in SPEEDS},
        "celebrations": CELEBRATIONS,
        # Only village 2 on x1 (2,000) has been seen in ts11; everything else
        # is the official table / formula and is labelled 待驗證 in the UI.
        "verified": {"speed": 1, "villages": [1, 2]},
    }


def gen_frontend(buildings: dict, cp: dict) -> dict:
    rows = {}
    for bid, b in buildings["buildings"].items():
        rows[bid] = [[lv["cost_wood"], lv["cost_clay"], lv["cost_iron"], lv["cost_crop"],
                      lv["build_time_base"], lv["culture_points"]] for lv in b["levels"]]
    pending = {bid: p["pending"] for bid, p in PARAMS.items() if p.get("pending")}
    return {
        "_generated_by": "scripts/game_data/gen_game_data.py — do not edit by hand",
        "rowFormat": ["wood", "clay", "iron", "crop", "buildTimeBase", "cp"],
        "buildings": rows,
        "cpBase": {bid: p["cp"] for bid, p in PARAMS.items()} | {fid: 1 for fid in FIELDS},
        "pending": pending,
        "villageRequirements": cp["village_requirements"],
        "startCp": cp["start_cp"],
        "celebrationCap": cp["celebration_cap"],
        "celebrations": cp["celebrations"],
        "verified": cp["verified"],
    }


def render(obj: dict, compact: bool = False) -> str:
    if compact:
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n"
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def outputs() -> dict[Path, str]:
    b = gen_buildings(_load(BACKEND_BUILDINGS))
    r = gen_resources(_load(BACKEND_RESOURCES))
    cp = gen_culture_points()
    return {
        BACKEND_BUILDINGS: render(b),
        BACKEND_RESOURCES: render(r),
        BACKEND_CP: render(cp),
        FRONTEND_GEN: render(gen_frontend(b, cp), compact=True),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    stale = []
    for path, text in outputs().items():
        old = path.read_text(encoding="utf-8") if path.exists() else None
        if old != text:
            stale.append(path)
            if not args.check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text, encoding="utf-8")
    if args.check and stale:
        print("stale:", *[str(p.relative_to(ROOT)) for p in stale], sep="\n  ")
        return 1
    print("updated" if stale and not args.check else "up to date", len(stale))
    return 0


if __name__ == "__main__":
    sys.exit(main())
