#!/usr/bin/env python3
"""Generate the single set of Travian game numbers used by backend AND frontend.

One parameter table (below) -> four generated files:

  backend/data/static/buildings.json      cost / build_time_base / culture_points
                                          (+ cp_per_day, MB effect, marketplace prereq)
  backend/data/static/resources.json      field cost / build_time_base / culture_points
  backend/data/static/culture_points.json village CP thresholds, celebration caps
  frontend/src/data/gameData.gen.json     compact copy of all of the above for the UI

Unit speeds (P0-15 phase 1) — one table (UNIT_SPEEDS below) -> three files:

  backend/data/static/unit_speeds.json    speed + provenance per unit (all 7 tribes)
  backend/data/static/troops.json         only the speed / speed_source / speed_ref
                                          fields are rewritten; other stats untouched
  frontend/src/data/unitSpeeds.gen.json   same content as unit_speeds.json

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
  ingame = 遊戲內數值（T4），ts11 未實測
  app    = 遊戲內數值（T4），ts11 未實測; L1 time kept from the app's previous
           data because the T4 value is uncertain
No external calculator code or data tables are copied here.

Unit speed provenance ("source" field in UNIT_SPEEDS):
  ts11     = read on our ts11 x1 server from the in-game help (Travian.Game.Manual,
             GET /api/v1/manual/troop/N); raw text kept in
             scripts/game_data/evidence/ts11_manual_troop_speed_2026-10-09.json
  official = support.travian.com article (URL in UNIT_SPEED_SOURCES)
  official_pending = number from an official page that itself says its numbers
             come from a third-party calculator (S187) -> value kept, but shown
             「待驗證」 and left out of reverse TS (PM decision 2026-10-09)
  pending  = no first-hand source yet -> speed is null and the UI shows 「待驗證」
  When the in-game value and an official page disagree, the in-game value wins.

Each PARAMS entry also has "verified": True only when ts11 has confirmed its
cost base, multiplier and L1 time (src "ts11"). Every other building has
verified=False, so its cost AND build time are 「待驗證」 in the UI; flip it to
True after measuring in ts11 (and rerun this script) to remove the chip.

P0-23 (2026-10-10): every level of every building and resource field is now
taken from the official knowledge base tables
(scripts/game_data/evidence/official_kb_buildings_2026-10-10.json — the page the
ts11 in-game help links to as 「知識庫」, also embedded in support.travian.com
article 33). Level 1 of 43 of the 44 buildings there equals the ts11 in-game
help exactly (check_kb_against_manual). Cost, population, CP and build time per
level come from that table; a building whose levels are all in the table counts
as verified. The formulas above stay as a cross-check (and for levels the table
does not list).
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

# building_id: cost base, cost k, L1 time, CP base, source, verified, pending notes
# time a is "L1 seconds + b" for normal buildings.
PARAMS: dict[str, dict] = {
    "main_building":     {"c": (70, 40, 60, 20), "k": 1.28, "t1": 2000, "cp": 2, "src": "ts11", "verified": True},
    "barracks":          {"c": (210, 140, 260, 120), "k": 1.28, "t1": 2000, "cp": 1, "src": "ts11", "verified": True},
    "rally_point":       {"c": (110, 160, 90, 70), "k": 1.28, "t1": 2000, "cp": 1, "src": "ts11", "verified": True},
    "warehouse":         {"c": (130, 160, 90, 40), "k": 1.28, "t1": 2000, "cp": 1, "src": "ts11", "verified": True},
    "granary":           {"c": (80, 100, 70, 20), "k": 1.28, "t1": 1600, "cp": 1, "src": "ts11", "verified": True},
    "marketplace":       {"c": (80, 70, 120, 70), "k": 1.28, "t1": 1800, "cp": 3, "src": "ts11", "verified": True},
    "stable":            {"c": (260, 140, 220, 100), "k": 1.28, "t1": 2200, "cp": 2, "src": "ingame", "verified": False},
    "academy":           {"c": (220, 160, 90, 40), "k": 1.28, "t1": 2000, "cp": 4, "src": "ingame", "verified": False},
    # T4 smithy (attack + defence upgrades in one building)
    "blacksmith":        {"c": (180, 250, 500, 160), "k": 1.28, "t1": 2000, "cp": 2, "src": "ingame", "verified": False},
    # T3-only building kept for old data; T4 worlds do not have it
    "cranny":            {"c": (40, 50, 30, 10), "k": 1.28, "t1": 300, "cp": 1, "src": "ts11", "verified": True},
    "workshop":          {"c": (460, 510, 600, 320), "k": 1.28, "t1": 3000, "cp": 3, "src": "ingame", "verified": False},
    "embassy":           {"c": (180, 130, 150, 80), "k": 1.28, "t1": 2000, "cp": 4, "src": "ts11", "verified": True},
    "town_hall":         {"c": (1250, 1110, 1260, 600), "k": 1.28, "t1": 12500, "cp": 5, "src": "ingame", "verified": False},
    "residence":         {"c": (580, 460, 350, 180), "k": 1.28, "t1": 2000, "cp": 2, "src": "ingame", "verified": False},
    "palace":            {"c": (550, 800, 750, 250), "k": 1.28, "t1": 5000, "cp": 5, "src": "ingame", "verified": False},
    "treasury":          {"c": (2880, 2740, 2580, 990), "k": 1.26, "t1": 8000, "cp": 6, "src": "ingame", "verified": False},
    # L1 700/670/700/240, 2300 s read from ts11 manual/building/37 (P0-19); the old
    # 80/120/70/90 was the trapper's L1. Every level: official knowledge base (P0-23).
    "heros_mansion":     {"c": (700, 670, 700, 240), "k": 1.33, "t1": 2300, "cp": 1, "src": "ingame", "verified": False},
    "sawmill":           {"c": (520, 380, 290, 90), "k": 1.80, "t1": 3000, "cp": 1, "src": "ingame", "verified": False, "bonus": True},
    "brickyard":         {"c": (440, 480, 320, 50), "k": 1.80, "t1": 2240, "cp": 1, "src": "ingame", "verified": False, "bonus": True},
    "iron_foundry":      {"c": (200, 450, 510, 120), "k": 1.80, "t1": 4080, "cp": 1, "src": "ingame", "verified": False, "bonus": True},
    "grain_mill":        {"c": (500, 440, 380, 1240), "k": 1.80, "t1": 1840, "cp": 1, "src": "ingame", "verified": False, "bonus": True},
    "bakery":            {"c": (1200, 1480, 870, 1600), "k": 1.80, "t1": 3680, "cp": 1, "src": "ingame", "verified": False, "bonus": True},
    "stonemasons_lodge": {"c": (155, 130, 125, 70), "k": 1.28, "t1": 2200, "cp": 1, "src": "ingame", "verified": False},
    "trade_office":      {"c": (1400, 1330, 1200, 400), "k": 1.28, "t1": 3000, "cp": 3, "src": "ingame", "verified": False},
    "tournament_square": {"c": (1750, 2250, 1530, 240), "k": 1.28, "t1": 3500, "cp": 1, "src": "ingame", "verified": False},
    "city_wall":         {"c": (70, 90, 170, 70), "k": 1.28, "t1": 2000, "cp": 1, "src": "ingame", "verified": False},
    "earth_wall":        {"c": (120, 200, 0, 80), "k": 1.28, "t1": 2000, "cp": 1, "src": "ingame", "verified": False},
    "palisade":          {"c": (160, 100, 80, 60), "k": 1.28, "t1": 2000, "cp": 1, "src": "ts11", "verified": True},
    "great_barracks":    {"c": (630, 420, 780, 360), "k": 1.28, "t1": 2000, "cp": 1, "src": "ingame", "verified": False},
    "great_stable":      {"c": (780, 420, 660, 300), "k": 1.28, "t1": 2200, "cp": 2, "src": "ingame", "verified": False},
    "trapper":           {"c": (80, 120, 70, 90), "k": 1.28, "t1": 2000, "cp": 1, "src": "ingame", "verified": False},
    "brewery":           {"c": (3210, 2050, 2750, 3830), "k": 1.40, "t1": 8000, "cp": 4, "src": "ingame", "verified": False},
    "horse_drinking_trough": {"c": (780, 420, 660, 540), "k": 1.28, "t1": 2200, "cp": 3, "src": "ingame", "verified": False},
    "great_warehouse":   {"c": (650, 800, 450, 200), "k": 1.28, "t1": 9000, "cp": 1, "src": "ingame", "verified": False},
    "great_granary":     {"c": (400, 500, 350, 100), "k": 1.28, "t1": 7000, "cp": 1, "src": "ingame", "verified": False},
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


# ---------------------------------------------------------------------------
# Unit speeds (fields/hour, x1, before Tournament Square / artefacts / hero items)
# ---------------------------------------------------------------------------
BACKEND_UNIT_SPEEDS = ROOT / "backend/data/static/unit_speeds.json"
BACKEND_TROOPS = ROOT / "backend/data/static/troops.json"
FRONTEND_UNIT_SPEEDS = ROOT / "frontend/src/data/unitSpeeds.gen.json"
TS11_MANUAL_EVIDENCE = ROOT / "scripts/game_data/evidence/ts11_manual_troop_speed_2026-10-09.json"
# P0-18: 兵種花費／攻防／運載量／糧耗／訓練時間，ts11 遊戲內說明頁原文解析（2026-10-10 唯讀擷取）
TS11_MANUAL_STATS = ROOT / "scripts/game_data/evidence/ts11_manual_2026-10-10.json"
FRONTEND_COST_VERIFIED = ROOT / "frontend/src/data/unitCostVerified.json"


def _ts11_stats() -> dict[str, dict]:
    """manual/troop/N → 解析過的數字（沒擷取到的兵種不在裡面）."""
    if not TS11_MANUAL_STATS.exists():
        return {}
    return json.loads(TS11_MANUAL_STATS.read_text(encoding="utf-8"))["troops"]

UNIT_SPEED_SOURCES = {
    "ts11": "ts11 遊戲內說明（兵種說明頁 manual/troop/N），2026-10-09 讀取",
    "s139": "https://support.travian.com/en/articles/139-vikings-in-travian-legends",
    "s187": "https://support.travian.com/en/articles/187-infantry-and-cavalry-units-comparison-table",
}
TRIBE_ORDER = ["romans", "teutons", "gauls", "egyptians", "huns", "spartans", "vikings"]

# 運載量（唯一一份，前後端都從產生檔讀；P0-23）。5 族照 ts11 遊戲內說明頁（evidence/ts11_manual_2026-10-10.json）。
# 斯巴達、維京沒有官方或 ts11 的運載量：官方說明頁 S10、S187（Capacity 是兵營／馬廄格數，不是運載量）、
# S139 都沒有這一欄。以前前端 tribes/*.ts 和後端 troops.json 各有一份而且不一樣；統一成前端那份，
# 因為只有它寫了來源，畫面標「待驗證」：
#   community＝社群整理的斯巴達兵種表（出處寫在前端 tribes/spartans.ts 的註解；這裡不引用玩家網站）
#   estimate ＝照同類兵種推估（前端 vikings.ts 的註解：S139 沒有運載量，照步兵／騎兵／攻城的慣例填），沒有出處
# 後端舊的 troops.json 數字（例如維京奴僕 55）沒有任何來源紀錄，不採用。
CARRY_SOURCES = {
    "ts11": "ts11 遊戲內說明（兵種說明頁 manual/troop/N），2026-10-10 讀取",
    "community": None,
    "estimate": None,
}
CARRY_PENDING: dict[str, tuple[list[int], str]] = {
    "spartans": ([60, 0, 40, 50, 110, 80, 0, 0, 0, 3000], "community"),
    "vikings": ([50, 30, 60, 0, 50, 70, 0, 0, 0, 3000], "estimate"),
}

# One row per unit, game order t1..t10:
#   (troops.json id, frontend id, knowledge_base/tribes.py key, speed, source, ref)
# ref = in-game manual troop number for "ts11", UNIT_SPEED_SOURCES key for "official".
UNIT_SPEEDS: dict[str, list[tuple]] = {
    "romans": [
        ("legionnaire", "legionnaire", "legionnaire", 6, "ts11", 1),
        ("praetorian", "praetorian", "praetorian", 5, "ts11", 2),
        ("imperian", "imperian", "imperian", 7, "ts11", 3),
        ("equites_legati", "equitesLegati", "equites_legati", 16, "ts11", 4),
        ("equites_imperatoris", "equitesImperatoris", "equites_imperatoris", 14, "ts11", 5),
        ("equites_caesaris", "equitesCaesaris", "equites_caesaris", 10, "ts11", 6),
        ("roman_ram", "ram", "battering_ram", 4, "ts11", 7),
        ("fire_catapult", "fireCatapult", "fire_catapult", 3, "ts11", 8),
        ("senator", "senator", "senator", 4, "ts11", 9),
        ("roman_settler", "settler", "settler", 5, "ts11", 10),
    ],
    "teutons": [
        ("clubswinger", "maceman", "clubswinger", 7, "ts11", 11),
        ("spearman", "spearman", "spearman", 7, "ts11", 12),
        ("axeman", "axeman", "axeman", 6, "ts11", 13),
        ("teuton_scout", "scout", "scout", 9, "ts11", 14),
        ("paladin", "paladin", "paladin", 10, "ts11", 15),
        ("teutonic_knight", "tk", "teutonic_knight", 9, "ts11", 16),
        ("teuton_ram", "ram", "ram", 4, "ts11", 17),
        ("teuton_catapult", "catapult", "catapult", 3, "ts11", 18),
        ("chief", "chief", "chief", 4, "ts11", 19),
        ("teuton_settler", "settler", "settler", 5, "ts11", 20),
    ],
    "gauls": [
        ("phalanx", "phalanx", "phalanx", 7, "ts11", 21),
        ("swordsman", "swordsman", "swordsman", 6, "ts11", 22),
        ("pathfinder", "pathfinder", "pathfinder", 17, "ts11", 23),
        ("theutates_thunder", "theutatesThunder", "theutates_thunder", 19, "ts11", 24),
        ("druidrider", "druidrider", "druidrider", 16, "ts11", 25),
        ("haeduan", "haeduan", "haeduan", 13, "ts11", 26),
        ("gaul_ram", "ram", "ram", 4, "ts11", 27),
        ("trebuchet", "trebuchet", "trebuchet", 3, "ts11", 28),
        ("chieftain", "chieftain", "chieftain", 5, "ts11", 29),
        ("gaul_settler", "settler", "settler", 5, "ts11", 30),
    ],
    "egyptians": [
        ("slave_militia", "slaveMilitia", "slave_militia", 7, "ts11", 51),
        ("ash_warden", "ashWarden", "ash_warden", 6, "ts11", 52),
        ("khopesh_warrior", "khopesh", "khopesh_warrior", 7, "ts11", 53),
        ("sopdu_explorer", "sopdu", "sopdu_explorer", 16, "ts11", 54),
        ("anhur_guard", "anhur", "anhur_guard", 15, "ts11", 55),
        ("resheph_chariot", "resheph", "resheph_chariot", 10, "ts11", 56),
        ("egyptian_ram", "ram", "ram", 4, "ts11", 57),
        ("stone_catapult", "catapult", "stone_catapult", 3, "ts11", 58),
        ("nomarch", "nomarch", "nomarch", 4, "ts11", 59),
        ("egyptian_settler", "settler", "settler", 5, "ts11", 60),
    ],
    "huns": [
        ("mercenary", "mercenary", "mercenary", 6, "ts11", 61),
        ("bowman", "bowman", "bowman", 6, "ts11", 62),
        ("spotter", "spotter", "spotter", 19, "ts11", 63),
        ("steppe_rider", "steppeRider", "steppe_rider", 16, "ts11", 64),
        ("marksman", "marksman", "marksman", 15, "ts11", 65),
        ("marauder", "marauder", "marauder", 14, "ts11", 66),
        ("hun_ram", "ram", "ram", 4, "ts11", 67),
        ("hun_catapult", "catapult", "catapult", 3, "ts11", 68),
        ("logades", "logades", "logades", 5, "ts11", 69),
        ("hun_settler", "settler", "settler", 5, "ts11", 70),
    ],
    # ts11 has no Spartans. S187 lists infantry + cavalry only, and says its
    # numbers come from a third-party calculator -> official_pending (value kept,
    # 「待驗證」, not used by reverse TS). Siege, Ephor and settler have no
    # official source yet -> null / 「待驗證」.
    "spartans": [
        ("hoplite", "hoplite", "hoplite", 6, "official_pending", "s187"),
        ("sentinel", "sentinel", "sentinel", 9, "official_pending", "s187"),
        ("shieldsman", "shieldsman", "shieldsman", 8, "official_pending", "s187"),
        ("twinsteel_therion", "twinsteel", "twirler", 6, "official_pending", "s187"),
        ("elpida_rider", "elpida", "elpida_rider", 16, "official_pending", "s187"),
        ("corinthian_crusher", "corinthian", "corinthian_crusher", 9, "official_pending", "s187"),
        ("spartan_ram", "ram", "ram", None, "pending", None),
        ("ballista", "ballista", "catapult", None, "pending", None),
        ("ephor", "ephor", "ephor", None, "pending", None),
        ("spartan_settler", "settler", "settler", None, "pending", None),
    ],
    # ts11 has no Vikings: official "Viking Units Overview" table (S139).
    "vikings": [
        ("thrall", "thrall", "thrall", 7, "official", "s139"),
        ("shield_maiden", "shieldMaiden", "shield_maiden", 7, "official", "s139"),
        ("berserker", "berserker", "berserker", 5, "official", "s139"),
        ("heimdalls_eye", "heimdallsEye", "scout", 9, "official", "s139"),
        ("huskarl_rider", "huskarlRider", "huskarl_rider", 12, "official", "s139"),
        ("valkyries_blessing", "valkyrie", "valkyrjas_blessing", 9, "official", "s139"),
        ("viking_ram", "ram", "ram", 4, "official", "s139"),
        ("viking_catapult", "catapult", "catapult", 3, "official", "s139"),
        ("jarl", "jarl", "jarl", 5, "official", "s139"),
        ("viking_settler", "settler", "settler", 5, "official", "s139"),
    ],
}

# Cross-check only (not used for output): speeds in the official S187 table,
# infantry + cavalry (t1..t6). On that page the speed row is labelled "Crop
# upkeep" and the upkeep row "Capacity" (labels shifted by one row); the
# numbers themselves match the in-game help except Hun Mercenary (S187: 7,
# ts11 help: 6) -> we use ts11.
S187_SPEED = {
    "romans": [6, 5, 7, 16, 14, 10],
    "teutons": [7, 7, 6, 9, 10, 9],
    "gauls": [7, 6, 17, 19, 16, 13],
    "egyptians": [7, 6, 7, 16, 15, 10],
    "huns": [7, 6, 19, 16, 15, 14],
    "spartans": [6, 9, 8, 6, 16, 9],
    "vikings": [7, 7, 5, 9, 12, 9],
}
S187_KNOWN_DIFF = {("huns", 0)}


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


# P0-19: L1 cost / time / population read from the ts11 in-game help
# (manual/building/<gid>, 2026-10-10). Only level 1 is shown there, so the
# multipliers (k) stay unmeasured and "verified" keeps its old meaning.
TS11_MANUAL_BUILDING_GID = {
    "sawmill": 5, "brickyard": 6, "iron_foundry": 7, "grain_mill": 8, "bakery": 9,
    "warehouse": 10, "granary": 11, "blacksmith": 13, "tournament_square": 14,
    "main_building": 15, "rally_point": 16, "marketplace": 17, "embassy": 18,
    "barracks": 19, "stable": 20, "workshop": 21, "academy": 22, "cranny": 23,
    "town_hall": 24, "residence": 25, "palace": 26, "treasury": 27, "trade_office": 28,
    "great_barracks": 29, "great_stable": 30, "city_wall": 31, "earth_wall": 32,
    "palisade": 33, "stonemasons_lodge": 34, "brewery": 35, "trapper": 36,
    "heros_mansion": 37, "great_warehouse": 38, "great_granary": 39,
    "horse_drinking_trough": 41,
}


def _ts11_buildings() -> dict[str, dict]:
    if not TS11_MANUAL_STATS.exists():
        return {}
    return json.loads(TS11_MANUAL_STATS.read_text(encoding="utf-8")).get("buildings", {})


def check_l1_against_manual() -> dict[str, int]:
    """Every building read in ts11 must have the same L1 cost and time as PARAMS.
    Returns building_id -> ts11 L1 population."""
    manual = _ts11_buildings()
    pops: dict[str, int] = {}
    for bid, gid in TS11_MANUAL_BUILDING_GID.items():
        m = manual.get(str(gid))
        if not m:
            continue
        p = PARAMS[bid]
        assert list(p["c"]) == m["cost_l1"], (bid, p["c"], m["cost_l1"])
        assert p["t1"] == m["time_l1_s"], (bid, p["t1"], m["time_l1_s"])
        pops[bid] = m["pop_l1"]
    for fid, gid in (("woodcutter", 1), ("clay_pit", 2), ("iron_mine", 3), ("cropland", 4)):
        m = manual.get(str(gid))
        if m:
            assert list(FIELDS[fid]["c"]) == m["cost_l1"], fid
            assert round(field_time(FIELDS[fid]["a"], 1)) == m["time_l1_s"], fid
    return pops


# P0-23：官方知識庫建築表（每一級的花費、累計人口、CP、x1 村莊大樓 1 級的建造秒數）
OFFICIAL_KB = ROOT / "scripts/game_data/evidence/official_kb_buildings_2026-10-10.json"


def _kb_levels(bid: str) -> dict[int, dict]:
    """building_id → {level: 知識庫那一列}；沒有這棟就是空的."""
    gid = INGAME_BUILDING_GID.get(bid)
    if gid is None or not OFFICIAL_KB.exists():
        return {}
    b = json.loads(OFFICIAL_KB.read_text(encoding="utf-8"))["buildings"].get(str(gid))
    return {r["level"]: r for r in b["rows"]} if b else {}


def check_kb_against_manual() -> None:
    """知識庫的 1 級要跟 ts11 遊戲內說明頁一樣（花費、人口、時間），才能拿它當 2 級以上的出處.
    村莊大樓的時間在 apply_kb_levels 比：知識庫用前一級的村莊大樓算村莊大樓自己（1 級 = 基本時間 × 5）."""
    manual = _ts11_buildings()
    for bid, gid in INGAME_BUILDING_GID.items():
        m = manual.get(str(gid))
        k = _kb_levels(bid).get(1)
        if not m or not k:
            continue
        assert k["cost"] == m["cost_l1"], (bid, k["cost"], m["cost_l1"])
        assert k["pop_total"] == m["pop_l1"], (bid, k["pop_total"], m["pop_l1"])
        if bid != "main_building":
            assert k["time_s"] == m["time_l1_s"], (bid, k["time_s"], m["time_l1_s"])


def apply_kb_levels(bid: str, levels: list[dict]) -> bool:
    """把知識庫每一級的花費、人口（累計相減）、CP、建造秒數寫進 levels；全部等級都有才回 True.
    村莊大樓的時間留公式（知識庫用前一級的村莊大樓算自己），但要跟知識庫差不到 10 秒."""
    kb = _kb_levels(bid)
    if not kb or any(lv["level"] not in kb for lv in levels if lv["level"] > 0):
        return False
    for lv in levels:
        L = lv["level"]
        if L == 0:
            continue
        k = kb[L]
        assert k["cp"] == lv["culture_points"], (bid, L, k["cp"], lv["culture_points"])
        prev = kb[L - 1]["pop_total"] if L > 1 else 0
        lv.update(cost_wood=k["cost"][0], cost_clay=k["cost"][1], cost_iron=k["cost"][2],
                  cost_crop=k["cost"][3], population=k["pop_total"] - prev)
        if bid == "main_building":
            # 知識庫的時間＝基本時間 × 村莊大樓加速（預設 x1、村莊大樓 1 級）；村莊大樓自己用前一級算，
            # 1 級就是「0 級」的倍率 5（evidence/official_kb_mb_level_experiment_2026-10-10.json）。
            # 知識庫沒錯，這裡存的是基本時間（跟 ts11 說明頁 2000 秒一樣）。
            if L == 1:
                assert k["time_s"] == 5 * lv["build_time_base"], (bid, k["time_s"], lv["build_time_base"])
            else:
                assert abs(lv["build_time_base"] * MB_FACTOR ** (L - 2) - k["time_s"]) <= 10, (bid, L)
        else:
            lv["build_time_base"] = k["time_s"]
    return True


KB_VERIFIED: set[str] = set()


# P0-23（幕僚長審查）：建築資料庫「效果」欄照官方知識庫的效果欄，每一級都要一樣（生成時檢查）。
# 知識庫沒有效果欄（研究院、盔甲廠、大使館、寶物庫）或欄位意思看不出來（集結點：只有圖示、數字 0–19）的，
# 效果維持舊文字、標「待驗證」（EFFECT_PENDING，前端效果欄標題旁一個灰標）。
_RES_ZH = {"lumberBonus": "木材", "clayBonus": "磚塊", "ironBonus": "鐵礦", "cropBonus": "糧食"}
EFFECT_KB_KEYS = {
    "main_building": ("constructionTime",),
    "barracks": ("infantryBonusTime",), "great_barracks": ("infantryBonusTime",),
    "stable": ("cavalryBonusTime",), "great_stable": ("cavalryBonusTime",),
    "workshop": ("siegeBonusTime",), "horse_drinking_trough": ("cavalryBonusTime",),
    "warehouse": ("warehouseCap",), "great_warehouse": ("warehouseCap",),
    "granary": ("granaryCap",), "great_granary": ("granaryCap",),
    "marketplace": ("merchants",), "cranny": ("crannyCap", "crannyCap"),
    "town_hall": ("townhallSmallParty", "townhallBigParty"),
    "residence": (None, "residenceBonusTime"), "palace": (None, "residenceBonusTime"),
    "heros_mansion": ("oasis",),
    "sawmill": ("lumberBonus",), "brickyard": ("clayBonus",), "iron_foundry": ("ironBonus",),
    "grain_mill": ("cropBonus",), "bakery": ("cropBonus",),
    "stonemasons_lodge": ("stabilityBonus",), "trade_office": ("merchantCap", "merchantCap"),
    "tournament_square": ("troopSpeed",), "brewery": ("attackBonus", "breweryParty"),
    "trapper": ("maxTraps",),
    "city_wall": ("defenceBonus", "defenceFlat"), "earth_wall": ("defenceBonus", "defenceFlat"),
    "palisade": ("defenceBonus", "defenceFlat"),
    "woodcutter": ("lumberBonus",), "clay_pit": ("clayBonus",), "iron_mine": ("ironBonus",),
    "cropland": ("cropBonus",),
}
EFFECT_VERIFIED: set[str] = set()


def _num(text: str) -> float:
    return float(text.replace(",", "").replace("+", "").replace("%", ""))


def _pct(text: str) -> str:
    """知識庫的百分比原樣顯示，只拿掉 .0（65.6% 照寫，90.0% 寫 90%）."""
    return text.replace(".0%", "%")


def kb_effect(bid: str, row: dict, carry: dict) -> tuple[float, str]:
    """知識庫效果欄的一列 → (effect_value, 效果文字)。carry：空白格沿用上一級（知識庫只在變的那一級寫數字）."""
    e = row["effects"]
    if bid in ("woodcutter", "clay_pit", "iron_mine", "cropland"):
        res = _RES_ZH[EFFECT_KB_KEYS[bid][0]]
        return _num(e[0]), f"每小時 {e[0]} {res}"
    if bid == "main_building":
        return round(_num(e[0]) / 100, 3), f"建造時間 {_pct(e[0])}"
    if bid in ("barracks", "great_barracks", "stable", "great_stable", "workshop"):
        return round(_num(e[0]) / 100, 4), f"訓練時間 {_pct(e[0])}"
    if bid == "horse_drinking_trough":
        return round(_num(e[0]) / 100, 4), f"騎兵訓練時間 {_pct(e[0])}"
    if bid in ("warehouse", "great_warehouse", "granary", "great_granary"):
        return _num(e[0]), f"儲存容量 {e[0]}"
    if bid == "marketplace":
        return _num(e[0]), f"商人數量 {e[0]}"
    if bid == "cranny":
        return _num(e[0]), f"隱藏容量 {e[0]}（高盧 {e[1]}）"
    if bid == "town_hall":
        small, big = e[0], e[1] or carry.get("big", "")
        if e[1]:
            carry["big"] = e[1]
        h, m, sec = (int(x) for x in small.split(":"))
        return float(h * 3600 + m * 60 + sec), (f"小慶典 {small}／大慶典 {big}" if big else f"小慶典 {small}")
    if bid in ("residence", "palace"):
        if e[0]:
            carry["slots"] = e[0]
        slots = carry.get("slots", "0")
        return _num(slots), f"訓練時間 {_pct(e[1])}；擴張槽 {slots}"
    if bid == "heros_mansion":
        if e[0]:
            carry["oasis"] = e[0]
        n = carry.get("oasis", "0")
        return _num(n), f"可佔綠洲 {n}"
    if bid in ("sawmill", "brickyard", "iron_foundry", "grain_mill", "bakery"):
        return _num(e[0]), f"{_RES_ZH[EFFECT_KB_KEYS[bid][0]]} {e[0]}"
    if bid == "stonemasons_lodge":
        return _num(e[0]), f"建築耐久 {e[0]}"
    if bid == "trade_office":
        return _num(e[0]), f"商人運載量 {e[0]}（羅馬人 {e[1]}）"
    if bid == "tournament_square":
        return _num(e[0]), f"超過 20 格速度 {e[0]}"
    if bid == "brewery":
        return _num(e[0]), f"攻擊力 {e[0]}"
    if bid == "trapper":
        return _num(e[0]), f"陷阱數量 {e[0]}"
    if bid in ("city_wall", "earth_wall", "palisade"):
        return _num(e[0]), f"防禦 +{_pct(e[0])}、基礎防禦 +{e[1]}"
    raise KeyError(bid)


def apply_kb_effects(bid: str, levels: list[dict]) -> bool:
    """效果欄照知識庫寫；每一級都要有、欄位要跟 EFFECT_KB_KEYS 一樣，才算核對過."""
    keys = EFFECT_KB_KEYS.get(bid)
    gid = INGAME_BUILDING_GID.get(bid)
    if not keys or gid is None or not OFFICIAL_KB.exists():
        return False
    b = json.loads(OFFICIAL_KB.read_text(encoding="utf-8"))["buildings"][str(gid)]
    cols = tuple(None if c.startswith("travianUnitImage") else c for c in b["effect_columns"])
    assert cols == keys, (bid, cols, keys)
    kb = {r["level"]: r for r in b["rows"]}
    carry: dict = {}
    for lv in sorted(levels, key=lambda x: x["level"]):
        if lv["level"] == 0:
            continue
        lv["effect_value"], lv["effect_description"] = kb_effect(bid, kb[lv["level"]], carry)
    return True


def check_effects_against_kb(buildings: dict) -> None:
    """生成後再對一次：核對過的建築，每一級效果文字裡的數字都要出現在知識庫那一列（防手改）."""
    for bid in EFFECT_VERIFIED:
        gid = INGAME_BUILDING_GID[bid]
        kb = {r["level"]: r for r in json.loads(OFFICIAL_KB.read_text(encoding="utf-8"))["buildings"][str(gid)]["rows"]}
        for lv in buildings["buildings"][bid]["levels"]:
            if lv["level"] == 0:
                continue
            for cell in kb[lv["level"]]["effects"]:
                if cell and not (bid == "brewery" and ":" in cell):  # 釀酒廠第二欄是慶典長度（固定 72 小時），不顯示
                    want = cell.replace(".0%", "%") if "%" in cell else cell
                    assert want.lstrip("+") in lv["effect_description"], (bid, lv["level"], cell, lv["effect_description"])




def gen_buildings(current: dict) -> dict:
    out = json.loads(json.dumps(current))
    l1_pop = check_l1_against_manual()
    check_kb_against_manual()
    for bid, b in out["buildings"].items():
        if bid in FIELDS:
            f = FIELDS[bid]
            for lv in b["levels"]:
                L = lv["level"]
                w, c, i, cr = build_cost(f["c"], FIELD_K, L)
                lv.update(cost_wood=w, cost_clay=c, cost_iron=i, cost_crop=cr,
                          build_time_base=field_time(f["a"], L), culture_points=cp_at(1, L))
                lv["cp_per_day"] = lv["culture_points"]
            if apply_kb_levels(bid, b["levels"]):
                KB_VERIFIED.add(bid)
            continue
        if bid not in PARAMS:  # 遊戲裡沒有的建築（apply_ingame_names 會拿掉）
            continue
        p = PARAMS[bid]
        for lv in b["levels"]:
            L = lv["level"]
            w, c, i, cr = build_cost(p["c"], p["k"], L)
            lv.update(cost_wood=w, cost_clay=c, cost_iron=i, cost_crop=cr,
                      build_time_base=build_time(p["t1"], L, p.get("bonus", False)),
                      culture_points=cp_at(p["cp"], L))
            lv["cp_per_day"] = lv["culture_points"]
            if L == 1 and bid in l1_pop:
                lv["population"] = l1_pop[bid]
        if apply_kb_levels(bid, b["levels"]):
            KB_VERIFIED.add(bid)
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
    for bid, b in out["buildings"].items():
        if apply_kb_effects(bid, b["levels"]):
            EFFECT_VERIFIED.add(bid)
    mbl = out["buildings"]["main_building"]["levels"]
    assert all(abs(lv["effect_value"] - mb_effect(lv["level"])) < 1e-9 for lv in mbl), "MB factor != KB"
    check_effects_against_kb(out)
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
        fid = next(k for k, v in FIELDS.items() if v["res"] == rtype)
        assert apply_kb_levels(fid, r["levels"]), fid
        kb = _kb_levels(fid)
        for lv in r["levels"]:
            if lv["level"] > 0:  # 知識庫效果欄＝每小時產量（x1）；0 級知識庫沒有（P0-23 第 5 項）
                assert int(kb[lv["level"]]["effects"][0].replace(",", "")) == lv["production_per_hour"], (fid, lv["level"])
    return out


OFFICIAL_S51 = ROOT / "scripts/game_data/evidence/official_s51_cp_table_2026-10-10.json"


def check_cp_against_official() -> None:
    """開村 CP 門檻公式要跟官方 S51 表（1–50 村 × 5 種速度）每一格都一樣（P0-19）."""
    table = json.loads(OFFICIAL_S51.read_text(encoding="utf-8"))["villages"]
    for v in range(1, MAX_VILLAGES + 1):
        for s in SPEEDS:
            want = table[str(v)][str(s)]
            got = village_cp(v, s)
            assert got == want, f"CP village {v} x{s}: formula {got} != official {want}"


def gen_culture_points() -> dict:
    check_cp_against_official()
    return {
        "_generated_by": "scripts/game_data/gen_game_data.py — do not edit by hand",
        "source": "https://support.travian.com/en/articles/51-culture-points-cp (table checked 2026-10-10) ; "
                  "https://support.travian.com/en/articles/20-game-versions-and-speed ; "
                  "https://support.travian.com/en/articles/82-celebrations-and-town-hall",
        "village_requirements": {str(s): [village_cp(v, s) for v in range(1, MAX_VILLAGES + 1)]
                                 for s in SPEEDS},
        "start_cp": {str(s): START_CP[s] for s in SPEEDS},
        "celebration_cap": {str(s): {"small": CELEBRATION_CAP[s][0], "great": CELEBRATION_CAP[s][1]}
                            for s in SPEEDS},
        "celebrations": CELEBRATIONS,
        # P0-19: the formula matches the official S51 table for every village 1–50
        # on every speed (checked in check_cp_against_official), so nothing is 待驗證.
        "verified": {"speeds": SPEEDS, "villages": list(range(1, MAX_VILLAGES + 1))},
    }


def pending_fields(bid: str, p: dict) -> list[str]:
    """Fields shown as 「待驗證」: explicit notes, plus cost+time when not verified."""
    fields = list(p.get("pending", []))
    if not p["verified"] and bid not in KB_VERIFIED:
        fields += [f for f in ("cost", "time") if f not in fields]
    return fields


def building_source(bid: str) -> str | None:
    if bid not in KB_VERIFIED:
        return None
    if bid == "main_building":
        return "mainTs11"
    in_ts11 = bid in TS11_MANUAL_BUILDING_GID or bid in FIELDS
    return "ts11L1Kb" if in_ts11 else "kb"


def gen_frontend(buildings: dict, cp: dict) -> dict:
    rows = {}
    for bid, b in buildings["buildings"].items():
        rows[bid] = [[lv["cost_wood"], lv["cost_clay"], lv["cost_iron"], lv["cost_crop"],
                      lv["build_time_base"], lv["culture_points"]] for lv in b["levels"]]
    pending = {bid: pending_fields(bid, p) for bid, p in PARAMS.items() if pending_fields(bid, p)}
    return {
        "_generated_by": "scripts/game_data/gen_game_data.py — do not edit by hand",
        "rowFormat": ["wood", "clay", "iron", "crop", "buildTimeBase", "cp"],
        "buildings": rows,
        "names": {bid: [b["name_zh"], b["name_en"]] for bid, b in buildings["buildings"].items()},
        "cpBase": {bid: p["cp"] for bid, p in PARAMS.items()} | {fid: 1 for fid in FIELDS},
        "pending": pending,
        # P0-23：✓ 點開寫出處——ts11L1Kb＝1 級 ts11 遊戲內說明、2 級以上官方知識庫；
        # mainTs11＝村莊大樓（知識庫時間有乘村莊大樓加速，1 級寫 2000 × 5；這裡存基本時間）；kb＝只有知識庫
        "buildingSources": {bid: building_source(bid) for bid in buildings["buildings"] if building_source(bid)},
        # 效果欄沒辦法照官方知識庫核對的建築（效果欄標題旁標「待驗證」）
        "effectsPending": sorted(bid for bid in buildings["buildings"] if bid not in EFFECT_VERIFIED),
        "villageRequirements": cp["village_requirements"],
        "startCp": cp["start_cp"],
        "celebrationCap": cp["celebration_cap"],
        "celebrations": cp["celebrations"],
        "verified": cp["verified"],
    }


def gen_unit_speeds() -> dict:
    stats = _ts11_stats()
    tribes = {}
    for tribe in TRIBE_ORDER:
        rows = []
        for slot, (be_id, fe_id, kb_id, speed, src, ref) in enumerate(UNIT_SPEEDS[tribe], start=1):
            if src == "ts11":
                ref_text = f"manual/troop/{ref}"
            elif src in ("official", "official_pending"):
                ref_text = UNIT_SPEED_SOURCES[ref]
            else:
                ref_text = None
            row = {"slot": slot, "troop_id": be_id, "fe_id": fe_id, "kb_id": kb_id,
                   "speed": speed, "source": src, "ref": ref_text, "stats": None}
            st = stats.get(str(ref)) if src == "ts11" else None
            if tribe in CARRY_PENDING:
                carries, carry_src = CARRY_PENDING[tribe]
                row["carry"] = carries[slot - 1]
                row["carry_source"] = carry_src
                row["carry_ref"] = CARRY_SOURCES[carry_src]
            else:
                assert st, (tribe, be_id, "運載量要有 ts11 說明頁的數字")
                row["carry"] = st["carry"]
                row["carry_source"] = "ts11"
                row["carry_ref"] = f"manual/troop/{ref}"
            if st:
                # 說明頁的速度要跟速度表一樣（速度表 2026-10-09 讀的，這次 10-10 再讀一次）
                assert st["speed"] == speed, (tribe, be_id, st["speed"], speed)
                row["stats"] = {
                    "name_zh": st["name_zh"],
                    "cost": st["cost"],
                    "attack": st["attack"],
                    "def_inf": st["def_inf"],
                    "def_cav": st["def_cav"],
                    "carry": st["carry"],
                    "upkeep": st["upkeep"],
                    "train_time": st["train_time_s"],
                    "ref": f"manual/troop/{ref}",
                }
            rows.append(row)
        tribes[tribe] = rows
    return {
        "_generated_by": "scripts/game_data/gen_game_data.py — do not edit by hand",
        "unit": "fields/hour, x1, base speed (no Tournament Square / artefact / hero bonus)",
        "sources": {"ts11": UNIT_SPEED_SOURCES["ts11"],
                    "official": [UNIT_SPEED_SOURCES["s139"], UNIT_SPEED_SOURCES["s187"]],
                    "official_pending": "官方說明頁，數字標示取自第三方計算器（待驗證，不列入反推 TS）",
                    "pending": "沒有第一手出處，速度留空（待驗證）"},
        "carry_sources": {"ts11": CARRY_SOURCES["ts11"],
                          "community": "社群整理的數字（斯巴達兵種表，出處見前端 tribes/spartans.ts 註解），待驗證",
                          "estimate": "照同類兵種推估，沒有出處，待驗證"},
        "tribes": tribes,
    }


def gen_troops(current: dict, speeds: dict) -> dict:
    """Rewrite speed / speed_source / speed_ref, and — for units read from the ts11
    in-game help (P0-18) — name_zh, cost, attack/defence, carry, upkeep, training
    time + stats_source / stats_ref. Units without ts11 stats keep their old numbers."""
    out = json.loads(json.dumps(current))
    troops = out["troops"]
    for tribe, rows in speeds["tribes"].items():
        for r in rows:
            t = troops[r["troop_id"]]
            assert t["tribe"] == tribe, r["troop_id"]
            rebuilt: dict = {}
            for k, v in t.items():
                if k in ("speed_source", "speed_ref"):
                    continue
                rebuilt[k] = v
                if k == "speed":
                    rebuilt["speed"] = r["speed"]
                    rebuilt["speed_source"] = r["source"]
                    rebuilt["speed_ref"] = r["ref"]
            rebuilt.pop("stats_source", None)
            rebuilt.pop("stats_ref", None)
            # 運載量全部照產生的那一份（前端讀同一份）
            rebuilt["carry_capacity"] = r["carry"]
            st = r.get("stats")
            if st:
                rebuilt.update(
                    name_zh=st["name_zh"],
                    attack=st["attack"],
                    defense_infantry=st["def_inf"],
                    defense_cavalry=st["def_cav"],
                    carry_capacity=st["carry"],
                    cost_wood=st["cost"][0],
                    cost_clay=st["cost"][1],
                    cost_iron=st["cost"][2],
                    cost_crop=st["cost"][3],
                    crop_consumption=st["upkeep"],
                    training_time_base=st["train_time"],
                )
                rebuilt["stats_source"] = "ts11"
                rebuilt["stats_ref"] = st["ref"]
            else:
                rebuilt["stats_source"] = "pending"
                rebuilt["stats_ref"] = None
            troops[r["troop_id"]] = rebuilt
    return out


# P0-23：維京沒有 ts11 來源，花費、糧耗、訓練時間、攻防照官方 S139「Viking Units Overview」表
# （evidence/official_support_2026-10-10.json）；S139 沒有運載量 → 運載量維持舊值、待驗證
OFFICIAL_SUPPORT = ROOT / "scripts/game_data/evidence/official_support_2026-10-10.json"


def _s139_units() -> list[dict]:
    ev = json.loads(OFFICIAL_SUPPORT.read_text(encoding="utf-8"))
    return ev["articles"]["s139"]["units"]


def apply_s139_vikings(troops: dict, speeds: dict) -> None:
    units = _s139_units()
    rows = speeds["tribes"]["vikings"]
    assert len(units) == len(rows) == 10
    for r, u in zip(rows, units):
        t = troops["troops"][r["troop_id"]]
        assert r["speed"] == u["speed"], (r["troop_id"], r["speed"], u["speed"])
        t.update(attack=u["atk"], defense_infantry=u["di"], defense_cavalry=u["dc"],
                 cost_wood=u["cost"][0], cost_clay=u["cost"][1], cost_iron=u["cost"][2],
                 cost_crop=u["cost"][3], crop_consumption=u["upkeep"], training_time_base=u["time_s"])
        t["stats_source"] = "official"
        t["stats_ref"] = UNIT_SPEED_SOURCES["s139"]


def gen_cost_verified(speeds: dict) -> dict:
    """部族的 10 種兵都讀到 ts11 說明頁才算核對過（P0-18）；ts11 沒有斯巴達／維京 → false."""
    return {
        "_note": "產生檔（scripts/game_data/gen_game_data.py），不要手改。部族的 10 種兵花費、糧耗、訓練時間都在 ts11 遊戲內說明頁讀到（evidence/ts11_manual_2026-10-10.json）才是 true；ts11 是 5 族伺服器：維京照官方說明頁 S139 的兵種表（evidence/official_support_2026-10-10.json）是 true，斯巴達只有標示第三方計算器的 S187，維持 false（兵種詳情顯示「待驗證」）。",
        "tribes": {t: all(r["stats"] for r in speeds["tribes"][t]) for t in ["romans", "gauls", "teutons", "huns", "egyptians", "spartans"]}
        | {"vikings": len(_s139_units()) == 10},
    }


# ── 遊戲內名稱表（#33）────────────────────────────────────────────────────
# 建築、部族、兵種的中文名一律用 ts11 遊戲內說明頁的寫法（evidence/ts11_manual_2026-10-10.json
# 裡的 name_zh / tribe_zh），前後端都讀這張表；以前用過的名字只留在 aliases 給搜尋用。
BACKEND_INGAME_NAMES = ROOT / "backend/data/static/ingame_names.json"
FRONTEND_INGAME_NAMES = ROOT / "frontend/src/data/ingameNames.gen.json"

# building_id → gid（資源田 + TS11_MANUAL_BUILDING_GID + app 沒有資料的遊戲內建築）
INGAME_BUILDING_GID = {
    "woodcutter": 1, "clay_pit": 2, "iron_mine": 3, "cropland": 4,
    **TS11_MANUAL_BUILDING_GID,
    "wonder_of_the_world": 40, "stone_wall": 42, "makeshift_wall": 43,
    "command_center": 44, "waterworks": 45,
}

# 舊名（站上以前用過、或常見的別稱）→ 只拿來搜尋，不顯示
BUILDING_ALIASES = {
    "main_building": ["主建築"],
    "clay_pit": ["黏土坑", "磚坑"], "cropland": ["農田"], "iron_foundry": ["鑄鐵廠", "鑄造廠"],
    "grain_mill": ["穀物磨坊"], "bakery": ["麵包坊"], "granary": ["糧倉"],
    "blacksmith": ["鐵匠鋪", "兵工廠"], "tournament_square": ["比武場"],
    "barracks": ["軍營"], "workshop": ["工坊"], "cranny": ["隱藏倉庫"],
    "town_hall": ["市政廳"], "treasury": ["寶庫"], "trade_office": ["貿易公司", "商貿處"],
    "great_barracks": ["大營房"], "earth_wall": ["土圍"], "palisade": ["柵欄", "木柵欄"],
    "stonemasons_lodge": ["石匠小屋"], "brewery": ["酒館"], "heros_mansion": ["英雄宅邸"],
    "great_granary": ["大糧倉"], "horse_drinking_trough": ["馬飲水槽"], "waterworks": ["水渠"],
}

TRIBE_MANUAL_REF = {"romans": 1, "teutons": 11, "gauls": 21, "egyptians": 51, "huns": 61}
TRIBE_ALIASES = {"romans": ["羅馬"], "teutons": ["條頓", "條頓人", "日耳曼"], "gauls": ["高盧"],
                 "egyptians": ["埃及"], "huns": ["匈奴人"]}
# ts11 是 5 族伺服器，沒有斯巴達、維京的遊戲內名稱
TRIBE_NO_INGAME = {"spartans": "斯巴達人", "vikings": "維京人"}

UNIT_ALIASES = {
    "legionnaire": ["軍團兵"], "equites_legati": ["使節騎兵", "使者騎兵"],
    "equites_imperatoris": ["帝國騎兵"], "equites_caesaris": ["凱撒騎兵"],
    "roman_ram": ["攻城槌"], "fire_catapult": ["火焰投石車"], "senator": ["元老"],
    "clubswinger": ["棍兵"], "spearman": ["長矛兵"], "teuton_scout": ["斥候", "偵查兵"],
    "paladin": ["聖騎士"], "teuton_ram": ["攻城槌"], "teuton_catapult": ["投石車"], "chief": ["領袖"],
    "pathfinder": ["探路兵"], "theutates_thunder": ["圖塔特雷"],
    "haeduan": ["海頓騎兵"], "gaul_ram": ["攻城槌"], "trebuchet": ["投石車"],
    "ash_warden": ["灰燼守衛"], "khopesh_warrior": ["鐮刀劍戰士"], "sopdu_explorer": ["索普度探險者"],
    "anhur_guard": ["安胡爾守衛"], "resheph_chariot": ["瑞謝夫戰車"], "egyptian_ram": ["攻城槌"],
    "stone_catapult": ["石頭投石車"], "mercenary": ["傭兵"], "spotter": ["斥候"],
    "steppe_rider": ["草原騎兵"], "hun_ram": ["攻城槌"], "hun_catapult": ["投石車"], "logades": ["領袖"],
}
SETTLER_ALIASES = ["拓荒者", "移民", "定居者"]
# 斯巴達、維京沒有遊戲內名稱；攻城武器、開拓者跟其他族同英文名的，比照遊戲內用詞
NON_TS11_UNIT_NAMES = {
    "viking_ram": ("破城槌", ["攻城槌"]), "viking_catapult": ("弩炮", ["投石車"]),
    "viking_settler": ("開拓者", SETTLER_ALIASES), "spartan_ram": ("破城槌", ["攻城槌"]),
    "spartan_settler": ("開拓者", SETTLER_ALIASES),
}


def gen_ingame_names(speeds: dict) -> dict:
    ev = json.loads(TS11_MANUAL_STATS.read_text(encoding="utf-8"))
    mb, mt = ev["buildings"], ev["troops"]
    buildings = {}
    for bid, gid in sorted(INGAME_BUILDING_GID.items(), key=lambda kv: kv[1]):
        buildings[bid] = {"gid": gid, "zh": mb[str(gid)]["name_zh"],
                          "ref": f"manual/building/{gid}", "aliases": BUILDING_ALIASES.get(bid, [])}
    tribes = {}
    for t, ref in TRIBE_MANUAL_REF.items():
        tribes[t] = {"zh": mt[str(ref)]["tribe_zh"], "ref": f"manual/troop/{ref}",
                     "aliases": TRIBE_ALIASES.get(t, [])}
    for t, zh in TRIBE_NO_INGAME.items():
        tribes[t] = {"zh": zh, "ref": None, "aliases": [zh.removesuffix("人")]}
    units = {}
    for tribe, rows in speeds["tribes"].items():
        for r in rows:
            tid = r["troop_id"]
            if r["stats"]:
                n = int(r["stats"]["ref"].rsplit("/", 1)[1])
                zh = r["stats"]["name_zh"]
                al = SETTLER_ALIASES if tid.endswith("settler") else UNIT_ALIASES.get(tid, [])
                units[tid] = {"tribe": tribe, "fe_id": r["fe_id"], "game_id": n,
                              "zh": zh, "ref": r["stats"]["ref"], "aliases": [a for a in al if a != zh]}
            elif tid in NON_TS11_UNIT_NAMES:
                zh, al = NON_TS11_UNIT_NAMES[tid]
                units[tid] = {"tribe": tribe, "fe_id": r["fe_id"], "game_id": None,
                              "zh": zh, "ref": None, "aliases": al}
    return {
        "_generated_by": "scripts/game_data/gen_game_data.py — do not edit by hand",
        "_source": "ts11 遊戲內說明頁（scripts/game_data/evidence/ts11_manual_2026-10-10.json）；"
                   "aliases 是以前用過的名字，只給搜尋用，不顯示",
        "tribes": tribes, "buildings": buildings, "units": units,
    }


# 說明文字裡的舊名 → 遊戲內名稱（只換建築名、部族名、開拓者；兵種專有名詞在 name_zh）
TEXT_FIXES = [("條頓人", "日耳曼人"), ("可研發投石車", "可研發投石類攻城武器"),
              ("移民", "開拓者"), ("拓荒者", "開拓者")]


def ingame_text(text: str, names: dict) -> str:
    for a, b in TEXT_FIXES:
        text = text.replace(a, b)
    pairs = [(al, row["zh"]) for row in names["buildings"].values() for al in row["aliases"]]
    for al, zh in sorted(pairs, key=lambda p: -len(p[0])):
        if al not in zh:  # 舊名是新名的一部分時不換（避免重複套用）
            text = text.replace(al, zh)
    return text


def apply_ingame_names(buildings: dict, resources: dict, troops: dict, names: dict) -> None:
    """buildings.json / resources.json / troops.json 的 name_zh 改成遊戲內名稱，舊名放 aliases_zh."""
    nb = names["buildings"]
    for bid, b in list(buildings["buildings"].items()):
        if bid not in nb:  # T3 防具工坊等 T4 遊戲裡沒有的建築
            del buildings["buildings"][bid]
            continue
        b["name_zh"] = nb[bid]["zh"]
        b["aliases_zh"] = nb[bid]["aliases"]
        if b.get("description_zh"):
            b["description_zh"] = ingame_text(b["description_zh"], names)
        for lv in b["levels"]:
            if lv.get("effect_description"):
                lv["effect_description"] = ingame_text(lv["effect_description"], names)
    field_bid = {"wood": "woodcutter", "clay": "clay_pit", "iron": "iron_mine", "crop": "cropland"}
    for rtype, r in resources["resource_fields"].items():
        r["name_zh"] = nb[field_bid[rtype]]["zh"]
    for tid, t in troops["troops"].items():
        u = names["units"].get(tid)
        if u:
            t["name_zh"] = u["zh"]
            t["aliases_zh"] = u["aliases"]
        else:
            t.setdefault("aliases_zh", [])
        if t.get("description_zh"):
            t["description_zh"] = ingame_text(t["description_zh"], names)


def render(obj: dict, compact: bool = False) -> str:
    if compact:
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n"
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def outputs() -> dict[Path, str]:
    b = gen_buildings(_load(BACKEND_BUILDINGS))
    r = gen_resources(_load(BACKEND_RESOURCES))
    cp = gen_culture_points()
    us = gen_unit_speeds()
    tr = gen_troops(_load(BACKEND_TROOPS), us)
    apply_s139_vikings(tr, us)
    names = gen_ingame_names(us)
    apply_ingame_names(b, r, tr, names)
    return {
        BACKEND_BUILDINGS: render(b),
        BACKEND_RESOURCES: render(r),
        BACKEND_CP: render(cp),
        FRONTEND_GEN: render(gen_frontend(b, cp), compact=True),
        BACKEND_UNIT_SPEEDS: render(us),
        BACKEND_TROOPS: render(tr),
        BACKEND_INGAME_NAMES: render(names),
        FRONTEND_INGAME_NAMES: render(names),
        FRONTEND_UNIT_SPEEDS: render(us),
        FRONTEND_COST_VERIFIED: render(gen_cost_verified(us)),
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
