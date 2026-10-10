"""Generated game data: one set of numbers, calibrated against ts11.

- backend/data/static/{buildings,resources,culture_points}.json and
  frontend/src/data/gameData.gen.json come from scripts/game_data/gen_game_data.py
- ts11 evidence: /workspace/travian/review/realtest/tool-verification.md
- official CP table: tests/fixtures/official/culture_points_villages.txt
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
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
    # 效果文字照官方知識庫效果欄（92.9%），P0-23
    assert "92.9%" in (_lv("main_building", 3).effect_description or "")


# ─── 效果欄照官方知識庫（P0-23 幕僚長審查）─────────────────────────


def _kb_effects(gid: int) -> dict[int, list[str]]:
    kb = json.loads(
        (
            ROOT / "scripts/game_data/evidence/official_kb_buildings_2026-10-10.json"
        ).read_text(encoding="utf-8")
    )
    return {r["level"]: r["effects"] for r in kb["buildings"][str(gid)]["rows"]}


@pytest.mark.parametrize(
    ("bid", "level", "text"),
    [
        ("warehouse", 1, "1,200"),
        ("warehouse", 20, "80,000"),
        ("great_warehouse", 1, "3,600"),
        ("great_warehouse", 20, "240,000"),
        ("great_granary", 1, "3,600"),
        ("great_granary", 20, "240,000"),
        ("woodcutter", 1, "7"),
        ("cropland", 20, "3,430"),
        ("stonemasons_lodge", 1, "+10%"),
        ("stonemasons_lodge", 20, "+200%"),
        ("earth_wall", 20, "48.6%"),
        ("city_wall", 19, "75.4%"),
        ("city_wall", 11, "38.4%"),
        ("workshop", 1, "100%"),
        ("workshop", 20, "13.5%"),
        ("horse_drinking_trough", 1, "騎兵訓練時間 99%"),
        ("horse_drinking_trough", 20, "騎兵訓練時間 80%"),
        ("trade_office", 1, "+20%（羅馬人 +40%）"),
    ],
)
def test_effect_matches_official_kb(bid: str, level: int, text: str) -> None:
    assert text in (_lv(bid, level).effect_description or "")


def test_every_verified_effect_level_matches_kb() -> None:
    gen = json.loads(
        (ROOT / "frontend/src/data/gameData.gen.json").read_text(encoding="utf-8")
    )
    pending = set(gen["effectsPending"])
    assert pending == set()
    # 2026-10-11：這五棟照遊戲內說明＋官方說明頁核對（不是知識庫），下面另外測；研究院、盔甲廠是 PM 決定的寫法
    official = set(gen["effectSources"])
    assert official == {"academy", "blacksmith", "embassy", "rally_point", "treasury"}
    data = json.loads(
        (ROOT / "backend/data/static/buildings.json").read_text(encoding="utf-8")
    )["buildings"]
    gid = {
        "woodcutter": 1,
        "clay_pit": 2,
        "iron_mine": 3,
        "cropland": 4,
        "sawmill": 5,
        "brickyard": 6,
        "iron_foundry": 7,
        "grain_mill": 8,
        "bakery": 9,
        "warehouse": 10,
        "granary": 11,
        "tournament_square": 14,
        "main_building": 15,
        "marketplace": 17,
        "barracks": 19,
        "stable": 20,
        "workshop": 21,
        "cranny": 23,
        "town_hall": 24,
        "residence": 25,
        "palace": 26,
        "trade_office": 28,
        "great_barracks": 29,
        "great_stable": 30,
        "city_wall": 31,
        "earth_wall": 32,
        "palisade": 33,
        "stonemasons_lodge": 34,
        "brewery": 35,
        "trapper": 36,
        "heros_mansion": 37,
        "great_warehouse": 38,
        "great_granary": 39,
        "horse_drinking_trough": 41,
    }
    assert set(gid) == set(data) - pending - official
    for bid, g in gid.items():
        kb = _kb_effects(g)
        for lv in data[bid]["levels"]:
            for cell in kb[lv["level"]]:
                if not cell or (bid == "brewery" and ":" in cell):
                    continue
                assert (
                    cell.replace(".0%", "%").lstrip("+") in lv["effect_description"]
                ), (bid, lv["level"], cell)


# ─── 2026-10-11：效果照遊戲內說明＋官方說明頁（evidence/pending_crosscheck_2026-10-11.json） ───

PENDING_EV = ROOT / "scripts/game_data/evidence/pending_crosscheck_2026-10-11.json"


def test_pending_crosscheck_evidence_hashes_recompute() -> None:
    ev = json.loads(PENDING_EV.read_text(encoding="utf-8"))
    for key, art in ev["official_articles"].items():
        if "text" in art:
            assert (
                hashlib.sha256(art["text"].encode("utf-8")).hexdigest()
                == art["text_sha256"]
            ), key
    html = ev["eu12_ingame"]["manual_building_14"]["html"]
    assert (
        hashlib.sha256(html.encode("utf-8")).hexdigest()
        == ev["eu12_ingame"]["manual_building_14"]["html_sha256"]
    )
    assert "beyond a minimum distance of 20 squares" in html
    for gid, f in ev["eu12_ingame"]["level0_fields"].items():
        png = (PENDING_EV.parent / f["screenshot"]).read_bytes()
        assert hashlib.sha256(png).hexdigest() == f["screenshot_sha256"], gid
        assert "Current production:\t3 per hour" in f["raw_text_production_lines"], gid
        assert "Production at level 1:\t7 per hour" in f["raw_text_production_lines"], (
            gid
        )


# 測試帳號名、村莊名、大廳信箱：只放 (長度, sha256(casefold))，repo 裡不留原字串
_IDENTIFIER_SHA256: tuple[tuple[int, str], ...] = (
    (4, "c5a47ae38bb43935e4ab0385c87dc6b57dbccf104a6549ddde6911459df8b128"),
    (8, "c9f219dd3aea6d38fd96f085d257a3fffb03a3dd8199ee2ddacddbc9cc639afe"),
    (9, "40b63d209532ce08ab88e0b181bf9cd0a1d89330eadb43149aeec44306a5794d"),
    (14, "b54712f23e8000d38a5b60c09086be4dcf327eb0873a238c3c6f09926f7ed8d7"),
    (18, "3e40510c6ba13df2e8411a3166e44bcabd3279a832f74dae82bd06ef262494e7"),
    (24, "a7f283d58f085769e3408184b6c972e77271c5983bf7e87c47f920a2242551c1"),
)


def _normalize_for_id_scan(text: str) -> str:
    """遊戲頁面的數字常夾 U+202D/U+202C（方向控制字元），負號是 U+2212：先拿掉／換成 '-' 再比."""
    return text.replace("\u202d", "").replace("\u202c", "").replace("\u2212", "-")


def test_pending_crosscheck_evidence_has_no_account_identifiers() -> None:
    text = _normalize_for_id_scan(PENDING_EV.read_text(encoding="utf-8"))
    # 公開 repo：不能有 email、密碼、村莊座標、帶村莊／座標的網址參數、大廳帳號 ID
    assert not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    assert "password" not in text.lower()
    assert not re.search(r"\(\s*-?\d+\s*\|\s*-?\d+\s*\)", text)
    assert not re.search(r"[?&;](x|y)=-?\d", text)
    assert not re.search(r"newdid", text, re.I)
    assert not re.search(r"[?&;]did=", text)
    assert not re.search(r"\bh\d{6,}", text)
    # 帳號名、村莊名、信箱：每個長度開一個視窗滑過去比 sha256
    folded = text.casefold()
    for n, digest in _IDENTIFIER_SHA256:
        for i in range(len(folded) - n + 1):
            assert (
                hashlib.sha256(folded[i : i + n].encode("utf-8")).hexdigest() != digest
            ), (n, i)


def test_identifier_scan_normalization() -> None:
    raw = "\u202d\u2212154\u202c|\u202d42\u202c"
    assert _normalize_for_id_scan(raw) == "-154|42"
    assert re.search(
        r"\(\s*-?\d+\s*\|\s*-?\d+\s*\)", _normalize_for_id_scan("(" + raw + ")")
    )


@pytest.mark.parametrize(
    ("bid", "level", "text"),
    [
        ("embassy", 1, "可加入聯盟"),
        ("embassy", 2, "可加入聯盟"),
        ("embassy", 3, "可建立聯盟"),
        ("embassy", 20, "可建立聯盟"),
        ("treasury", 9, "還不能存放神器"),
        ("treasury", 10, "小型神器"),
        ("treasury", 19, "小型神器"),
        ("treasury", 20, "大型或獨特神器"),
        ("rally_point", 1, "隨機目標"),
        ("rally_point", 3, "倉庫、穀倉"),
        ("rally_point", 5, "資源田"),
        ("rally_point", 10, "山洞、石匠鋪、陷阱機以外"),
        ("rally_point", 20, "2 個目標"),
        ("academy", 1, "研究新兵種；可研究的兵種依部族不同"),
        ("academy", 20, "研究新兵種；可研究的兵種依部族不同"),
        ("blacksmith", 1, "改良部隊的武器和護甲"),
        ("blacksmith", 20, "等級越高，可以改良得越多"),
    ],
)
def test_official_effects_2026_10_11(bid: str, level: int, text: str) -> None:
    assert text in (_lv(bid, level).effect_description or "")


def test_smithy_effect_is_s40_wording_not_percent() -> None:
    """PM 2026-10-11：盔甲廠效果照 S40，不寫數字；舊的「攻擊力 +1.5%/級」跟 S40 不符。研究院也不寫數字。"""
    data = json.loads(
        (ROOT / "backend/data/static/buildings.json").read_text(encoding="utf-8")
    )["buildings"]
    for bid in ("blacksmith", "academy"):
        b = data[bid]
        assert "%" not in b["description_zh"] and "%" not in b["description_en"], bid
        assert all("%" not in lv["effect_description"] for lv in b["levels"]), bid
    assert "耗糧" in data["blacksmith"]["description_zh"]
    assert "crop consumption" in data["blacksmith"]["description_en"]
    assert "依部族不同" in data["academy"]["description_zh"]


def test_embassy_no_longer_claims_members_per_level() -> None:
    data = json.loads(
        (ROOT / "backend/data/static/buildings.json").read_text(encoding="utf-8")
    )["buildings"]
    emb = data["embassy"]
    assert "60" in emb["description_zh"] and "3 名成員" not in emb["description_zh"]
    assert all("名成員" not in lv["effect_description"] for lv in emb["levels"])


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
    assert celebration_cp(529, "small") == 500  # Lumi 常用配置 529 CP/天
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


# ─── 出處檔（P0-23 幕僚長審查）─────────────────────────────────────


def test_support_pages_full_text_sha256_recomputable() -> None:
    import hashlib

    ev = json.loads(
        (
            ROOT / "scripts/game_data/evidence/official_support_2026-10-10.json"
        ).read_text(encoding="utf-8")
    )
    assert "text_method" in ev
    assert set(ev["articles"]) == {
        "s3",
        "s213",
        "s88",
        "s129",
        "s48",
        "s139",
        "s187",
        "s10",
    }
    for key, a in ev["articles"].items():
        assert len(a["text"]) > 1000, key
        assert (
            hashlib.sha256(a["text"].encode("utf-8")).hexdigest() == a["text_sha256"]
        ), key
        assert len(a["html_sha256"]) == 64, key


def test_merchant_numbers_are_in_s3_full_text() -> None:
    a = json.loads(
        (
            ROOT / "scripts/game_data/evidence/official_support_2026-10-10.json"
        ).read_text(encoding="utf-8")
    )["articles"]["s3"]
    for cap, speed in a["merchants"].values():
        assert f"Carry {cap} resources, move at {speed} fields/hour" in a["text"]


def test_ts11_reads_record_conditions() -> None:
    m = json.loads(
        (ROOT / "scripts/game_data/evidence/ts11_manual_2026-10-10.json").read_text(
            encoding="utf-8"
        )
    )
    rc = m["read_conditions"]
    assert rc["main_building_level_at_read_time"] == 4
    assert "x1" in rc["server_speed"]
    mk = json.loads(
        (
            ROOT / "scripts/game_data/evidence/ts11_marketplace_read_2026-10-10.json"
        ).read_text(encoding="utf-8")
    )
    assert mk["request"]["method"] == "GET"
    kb = json.loads(
        (
            ROOT
            / "scripts/game_data/evidence/official_kb_mb_level_experiment_2026-10-10.json"
        ).read_text(encoding="utf-8")
    )
    mb = [r for r in kb["runs"] if r["gid"] == 15]
    # 村莊大樓頁不看輸入框：1 級永遠是 2000 × 5
    assert {r["L1_s"] for r in mb} == {10000}
    barracks0 = next(r for r in kb["runs"] if r["gid"] == 19 and r["mb_input"] == 0)
    assert barracks0["L1_s"] == 5 * 2000


# ── 運載量只有一份（P0-23）────────────────────────────────────────────────
def test_carry_capacity_single_source_backend_and_frontend() -> None:
    """troops.json、unit_speeds.json、前端 unitSpeeds.gen.json、knowledge_base 每個兵種運載量都一樣."""
    from app.knowledge_base.tribes import TRIBES_DATA

    troops = json.loads(
        (ROOT / "backend/data/static/troops.json").read_text(encoding="utf-8")
    )["troops"]
    be = json.loads(
        (ROOT / "backend/data/static/unit_speeds.json").read_text(encoding="utf-8")
    )
    fe = json.loads(
        (ROOT / "frontend/src/data/unitSpeeds.gen.json").read_text(encoding="utf-8")
    )
    assert be == fe
    n = 0
    for tribe, rows in be["tribes"].items():
        for r in rows:
            n += 1
            assert troops[r["troop_id"]]["carry_capacity"] == r["carry"], r["troop_id"]
            kb = TRIBES_DATA[tribe]["troops"][r["kb_id"]]
            assert kb["capacity"] == r["carry"], r["troop_id"]
            want = {"vikings": "pending", "spartans": "asia_x1"}.get(tribe, "ts11")
            assert r["carry_source"] == want, r["troop_id"]
            if want != "pending":
                assert isinstance(r["carry"], int)
                assert r["stats"]["carry"] == r["carry"]
            else:
                # PM 決定（P0-23）：維京運載量留空，不放社群整理或推估的數字
                assert r["carry"] is None, r["troop_id"]
                assert r["carry_ref"] is None
    assert n == len(troops) == 70


def test_viking_carry_is_null_everywhere_in_backend() -> None:
    """維京：troops.json、knowledge_base、API 都是 null；API 附上原因，不回 0."""
    from app.knowledge_base.tribes import TRIBES_DATA

    troops = json.loads(
        (ROOT / "backend/data/static/troops.json").read_text(encoding="utf-8")
    )["troops"]
    empty = [k for k, t in troops.items() if t["tribe"] == "vikings"]
    assert len(empty) == 10
    assert all(troops[k]["carry_capacity"] is None for k in empty)
    assert all(t["capacity"] is None for t in TRIBES_DATA["vikings"]["troops"].values())
    # 斯巴達 2026-10-11 在 ASIA x1 讀到運載量，不再留空
    sp = [t for t in troops.values() if t["tribe"] == "spartans"]
    assert [t["carry_capacity"] for t in sp] == [60, 0, 40, 50, 110, 80, 0, 0, 0, 3000]
    gen_text = GEN.read_text(encoding="utf-8")
    # 單一兵種留空的名單只有維京開拓者（PM 第 4 輪；現在維京整族都留空，這條是備用）
    assert re.findall(r"^CARRY_PENDING\w* = .*$", gen_text, re.M) == [
        'CARRY_PENDING_UNITS = ("viking_settler",)'
    ]
    assert "community" not in gen_text.split("CARRY_SOURCES = {")[1].split("}")[0]


# ── 斯巴達：ASIA x1 遊戲內說明實測（2026-10-11）──────────────────────────
ASIA_X1_SPARTANS = (
    ROOT / "scripts/game_data/evidence/asia_x1_manual_spartans_2026-10-11.json"
)
SPARTAN_IDS = [
    "hoplite",
    "sentinel",
    "shieldsman",
    "twinsteel_therion",
    "elpida_rider",
    "corinthian_crusher",
    "spartan_ram",
    "ballista",
    "ephor",
    "spartan_settler",
]


def test_asia_x1_spartan_evidence_records_source_and_screenshots() -> None:
    import hashlib

    ev = json.loads(ASIA_X1_SPARTANS.read_text(encoding="utf-8"))
    assert ev["server"] == "rog.x1.asia.travian.com"
    assert ev["url"] == "https://rog.x1.asia.travian.com"
    assert "Spartans" in ev["path"]
    rc = ev["read_conditions"]
    assert "x1" in rc["server_speed"]
    assert rc["read_at"].startswith("2026-10-11")
    assert sorted(int(n) for n in ev["troops"]) == list(range(1, 11))
    shots = [(ev["overview_screenshot"], ev["overview_screenshot_sha256"])]
    shots += [
        (t["screenshot"], t["screenshot_sha256"])
        for t in ev["troops"].values()
        if t["screenshot"]
    ]
    assert len(shots) == 5
    ev_dir = ASIA_X1_SPARTANS.parent
    for rel, sha in shots:
        data = (ev_dir / rel).read_bytes()
        assert hashlib.sha256(data).hexdigest() == sha, rel
        assert rel.endswith(f"/{sha}.png"), rel
    for n, t in ev["troops"].items():
        h, m, s = (int(x) for x in t["train_time_text"].split(":"))
        assert t["train_time_s"] == h * 3600 + m * 60 + s, n
        assert len(t["cost"]) == 4, n
    assert ev["overview_names_en"] == [
        ev["troops"][str(i)]["name_en"] for i in range(1, 11)
    ]


def test_asia_x1_evidence_is_de_identified() -> None:
    """公開 repo（第 6 輪）：帳號、大廳帳號、村莊寫「測試帳號（已去識別）」；截圖只留中間的說明視窗."""
    import struct

    ev = json.loads(ASIA_X1_SPARTANS.read_text(encoding="utf-8"))
    assert ev["read_conditions"]["account"] == "測試帳號（已去識別）"
    assert "測試帳號（已去識別）" in ev["_what"]
    shots = [ev["overview_screenshot"], ev["raw_zh"]["overview_screenshot"]]
    shots += [t["screenshot"] for t in ev["troops"].values() if t["screenshot"]]
    assert len(set(shots)) == 6
    for rel in set(shots):
        head = (ASIA_X1_SPARTANS.parent / rel).read_bytes()[:24]
        assert head[:8] == b"\x89PNG\r\n\x1a\n", rel
        # 原圖 1024×594 整個遊戲畫面；裁切後只剩說明視窗（右上角的帳號、村莊、座標都在 x ≥ 730）
        assert struct.unpack(">II", head[16:24]) == (269, 362), rel


def test_asia_x1_raw_zh_text_is_stored_and_matches_every_value() -> None:
    """繁中原文 10 頁＋總覽：只存說明內容（沒有帳號、村莊等頁面內容），SHA-256 對得上，解析出來跟 troops 一樣."""
    gen = _gen_module()
    ev = json.loads(ASIA_X1_SPARTANS.read_text(encoding="utf-8"))
    raw = ev["raw_zh"]
    assert raw["read_at"].startswith("2026-10-11 01:")
    assert raw["tribe_zh"] == "斯巴達人"
    assert sorted(int(n) for n in raw["units"]) == list(range(1, 11))
    for b in [raw["overview"], *raw["units"].values()]:
        assert hashlib.sha256(b["text"].encode("utf-8")).hexdigest() == b["text_sha256"]
        assert b["saved_at"].startswith("2026-10-11T01:") and b["saved_at"].endswith(
            "+08:00"
        )
        for chrome in (
            "`s village",
            "伺服器標準時間",
            "幫助選單",
            "Privacy settings",
            "ROG Survey",
        ):
            assert chrome not in b["text"], (b["file"], chrome)
    shot = ASIA_X1_SPARTANS.parent / raw["overview_screenshot"]
    assert (
        hashlib.sha256(shot.read_bytes()).hexdigest()
        == raw["overview_screenshot_sha256"]
    )
    for n, b in raw["units"].items():
        got = gen.parse_asia_x1_raw_zh(b["text"])
        assert got.pop("tribe_zh") == "斯巴達人"
        assert got == {k: ev["troops"][n][k] for k in got}, n
    # 賴達投石機：U+8CF4 U+9054 U+6295 U+77F3 U+6A5F
    assert ev["troops"]["8"]["name_zh"] == "\u8cf4\u9054\u6295\u77f3\u6a5f"
    gen.check_asia_x1_raw_zh()
    names = json.loads(
        (ROOT / "backend/data/static/ingame_names.json").read_text(encoding="utf-8")
    )
    assert names["tribes"]["spartans"] == {
        "zh": "斯巴達人",
        "ref": "asia_x1/help/spartans",
        "aliases": ["斯巴達"],
    }
    assert names["tribes"]["vikings"]["ref"] is None


def test_spartans_follow_asia_x1_in_game_help_everywhere() -> None:
    """troops.json、unit_speeds.json、遊戲內名稱表、knowledge_base 的斯巴達 10 種兵都跟 ASIA x1 說明頁一樣."""
    from app.knowledge_base.tribes import TRIBES_DATA

    ev = json.loads(ASIA_X1_SPARTANS.read_text(encoding="utf-8"))["troops"]
    troops = json.loads(
        (ROOT / "backend/data/static/troops.json").read_text(encoding="utf-8")
    )["troops"]
    rows = json.loads(
        (ROOT / "backend/data/static/unit_speeds.json").read_text(encoding="utf-8")
    )["tribes"]["spartans"]
    names = json.loads(
        (ROOT / "backend/data/static/ingame_names.json").read_text(encoding="utf-8")
    )["units"]
    assert [r["troop_id"] for r in rows] == SPARTAN_IDS
    for r in rows:
        e, t, tid = ev[str(r["slot"])], troops[r["troop_id"]], r["troop_id"]
        assert t["stats_source"] == "asia_x1", tid
        assert t["speed_source"] == "asia_x1", tid
        assert t["name_zh"] == e["name_zh"] and t["name_en"] == e["name_en"], tid
        cost = [t[f"cost_{k}"] for k in ("wood", "clay", "iron", "crop")]
        assert cost == e["cost"], tid
        assert (t["attack"], t["defense_infantry"], t["defense_cavalry"]) == (
            e["attack"],
            e["def_inf"],
            e["def_cav"],
        ), tid
        assert t["speed"] == e["speed"] and t["carry_capacity"] == e["carry"], tid
        assert t["crop_consumption"] == e["upkeep"], tid
        assert t["training_time_base"] == e["train_time_s"], tid
        u = names[tid]
        assert u["zh"] == e["name_zh"] and u["display_zh"] == e["name_zh"], tid
        assert u["zh_pending"] is False and u["en"] is None, tid
        kb = TRIBES_DATA["spartans"]["troops"][r["kb_id"]]
        assert kb["name_zh"] == e["name_zh"], tid
        assert [kb["cost"][k] for k in ("wood", "clay", "iron", "crop")] == e["cost"]
        assert (kb["attack"], kb["defense_infantry"], kb["defense_cavalry"]) == (
            e["attack"],
            e["def_inf"],
            e["def_cav"],
        ), tid
        assert kb["upkeep"] == e["upkeep"], tid
        assert kb["training_time"].split("（")[0] == e["train_time_text"], tid
        assert kb["capacity"] == e["carry"], tid
    # 唯一跟舊資料不一樣的數字：賴達投石機（弩炮）訓練時間 9900 → 9000（2:30:00）
    assert troops["ballista"]["training_time_base"] == 9000
    cv = json.loads(
        (ROOT / "frontend/src/data/unitCostVerified.json").read_text(encoding="utf-8")
    )
    assert cv["tribes"]["spartans"] is True


CROSSCHECK = (
    ROOT / "scripts/game_data/evidence/crosscheck_spartans_vikings_2026-10-11.json"
)


def test_crosscheck_evidence_records_sources_and_rog_only_fields():
    """RoG 世界風險：斯巴達跟官方 S187＋社群兩份比一次；只有投石機、五長官的訓練時間不一樣 → 一般世界待驗證."""
    xc = json.loads(CROSSCHECK.read_text(encoding="utf-8"))
    for key in (
        "s187",
        "s139",
        "siegewise_spartans",
        "siegewise_vikings",
        "fandom_spartans",
        "fandom_vikings",
    ):
        src = xc["sources"][key]
        assert src["url"].startswith("https://") and len(src["sha256"]) == 64, key
    for key in ("fandom_spartans", "fandom_vikings"):
        src = xc["sources"][key]
        assert hashlib.sha256(src["table_text"].encode()).hexdigest() == src["sha256"]
    rog = xc["conclusions"]["spartans"]["rog_only"]
    assert set(rog) == {"ballista", "ephor"}
    assert {v["field"] for v in rog.values()} == {"train_time"}
    troops = json.loads(
        (ROOT / "backend/data/static/troops.json").read_text(encoding="utf-8")
    )["troops"]
    flagged = {
        tid for tid, t in troops.items() if "training_time_pending_normal_worlds" in t
    }
    assert flagged == {"ballista", "ephor"}
    assert (
        troops["ballista"]["training_time_pending_normal_worlds"]["community"] == 9900
    )
    assert troops["ballista"]["training_time_base"] == 9000
    cv = json.loads(
        (ROOT / "frontend/src/data/unitCostVerified.json").read_text(encoding="utf-8")
    )
    assert set(cv["train_time_rog_only"]) == {"ballista", "ephor"}
    from app.knowledge_base.tribes import TRIBES_DATA

    kb = TRIBES_DATA["spartans"]["troops"]
    assert "一般世界待驗證" in kb["catapult"]["training_time"]
    assert "一般世界待驗證" in kb["ephor"]["training_time"]
    assert "（" not in kb["hoplite"]["training_time"]


def test_crosscheck_vikings_carry_back_to_pending():
    """維京：官方 S139 跟社群一致；運載量官方沒有，Siegewise 運載量出處不明 → 幕僚長：出處不明，退回待驗證."""
    xc = json.loads(CROSSCHECK.read_text(encoding="utf-8"))
    s139 = xc["sources"]["s139"]["vikings"]
    sw = xc["sources"]["siegewise_vikings"]["units"]
    assert len(s139) == 10
    for n, o in s139.items():
        key = n.replace(" (Scout)", "").replace(" (Administrator)", "")
        w = sw[{"Heimdall’s Eye": "Heimdalls Eye"}.get(key, key)]
        assert (
            w["attack"],
            w["def_inf"],
            w["def_cav"],
            w["speed"],
            w["upkeep"],
            w["total_cost"],
            w["train_time_s"],
        ) == (
            o["attack"],
            o["def_inf"],
            o["def_cav"],
            o["speed"],
            o["upkeep"],
            o["total_cost"],
            o["train_time_s"],
        ), n
    assert xc["conclusions"]["vikings"]["carry"]["official"] is None
    ind = xc["viking_carry_independence"]
    assert ind["conclusion"] == "出處不明，退回待驗證"
    fd = ind["final_decision"]
    assert (fd["by"], fd["date"], fd["conclusion"]) == (
        "幕僚長",
        "2026-10-11",
        "出處不明，退回待驗證",
    )
    # 第 3、4 輪的調查留著
    assert ind["conclusion_round3"] == "independent"
    assert ind["fandom"]["cites_siegewise"] is False
    assert ind["siegewise"]["cites_fandom"] is False
    assert ind["fandom"]["carry_added_revision"]["revid"] == 18687
    assert ind["fandom"]["carry_added_revision"]["timestamp"] == "2026-07-10T13:28:23Z"
    assert "2026-08-31" in ind["siegewise"]["page_date"]
    assert ind["settler"]["siegewise"] == 3000 and ind["settler"]["fandom"] is None
    troops = json.loads(
        (ROOT / "backend/data/static/troops.json").read_text(encoding="utf-8")
    )["troops"]
    vk = [t for t in troops.values() if t["tribe"] == "vikings"]
    assert [t["carry_capacity"] for t in vk] == [None] * 10
    # 第 4 輪：Siegewise 運載量從哪來，查一次（幕僚長）
    tr = ind["siegewise_source_trace"]
    assert tr["finding"] == "Siegewise 運載量出處不明"
    assert len(tr["checked"]) >= 5
    assert "沒有證據" in tr["uses_fandom_2024_video"]
    assert "沒有證據" in tr["same_sheet_as_fandom"]
    assert "改回留空" in ind["settler"]["decision"]
    gen_text = GEN.read_text(encoding="utf-8")
    assert 'CARRY_EMPTY_TRIBES: tuple[str, ...] = ("vikings",)' in gen_text
    assert "CARRY_TWO_SOURCE_TRIBES: tuple[str, ...] = ()" in gen_text


def test_multitribe_support_pages_sha256_and_quotes() -> None:
    """P0-25 官方出處：全文 sha256 可以重算，摘錄的句子都在全文裡."""
    import hashlib

    ev = json.loads(
        (
            ROOT
            / "scripts/game_data/evidence/official_support_multitribe_2026-10-11.json"
        ).read_text(encoding="utf-8")
    )
    assert "text_method" in ev
    assert set(ev["articles"]) == {"s29", "s197", "s45", "s32", "s21"}
    for key, a in ev["articles"].items():
        assert a["url"].startswith("https://support.travian.com/en/articles/"), key
        assert (
            hashlib.sha256(a["text"].encode("utf-8")).hexdigest() == a["text_sha256"]
        ), key
        assert len(a["html_sha256"]) == 64, key
        for quote in a["quotes"]:
            assert quote in a["text"], (key, quote)
    s29 = ev["articles"]["s29"]["text"]
    assert "the village keeps its original tribe" in s29
    assert "They always remain based on the tribe you chose at registration" in s29


# ─── 慶典花費：兩份來源一致（2026-10-11 PM 規則）─────────────────────────


def test_celebration_cost_two_sources_agree_and_text_sha256() -> None:
    import hashlib

    ev = json.loads(
        (
            ROOT / "scripts/game_data/evidence/celebration_sources_2026-10-11.json"
        ).read_text(encoding="utf-8")
    )
    a = ev["official_answers"]
    assert hashlib.sha256(a["text"].encode("utf-8")).hexdigest() == a["text_sha256"]
    assert len(a["html_sha256"]) == 64
    assert a["snapshot_url"].startswith("https://web.archive.org/web/20211206")
    # 官方原文裡兩列花費照木、泥、鐵、糧的順序出現
    assert "Small celebration |\n6400 |\n6650 |\n5940 |\n1340 |" in a["text"]
    assert "Great celebration |\n29700 |\n33250 |\n32000 |\n6700 |" in a["text"]
    w = ev["travian_wiki"]
    assert w["independence"]["cites_answers_or_travian_help"] is False
    assert len(w["wikitext_sha256"]) == 64
    data = json.loads(
        (ROOT / "backend/data/static/culture_points.json").read_text(encoding="utf-8")
    )["celebrations"]
    for kind in ("small", "great"):
        assert w["cost_rows_quoted"][kind] == ev["celebrations"][kind]["cost"], kind
        assert data[kind]["cost"] == ev["celebrations"][kind]["cost"], kind
        assert data[kind]["min_town_hall"] == ev["celebrations"][kind]["min_town_hall"]
        assert data[kind]["pending"] == [], kind
    assert ev["source_line_zh"] == (
        "出處：Travian Answers（官方，2021 年快照）、Travian Wiki 兩份來源一致"
    )


def test_celebration_durations_match_answers_and_knowledge_base() -> None:
    ev = json.loads(
        (
            ROOT / "scripts/game_data/evidence/celebration_sources_2026-10-11.json"
        ).read_text(encoding="utf-8")
    )
    kb = json.loads(
        (
            ROOT / "scripts/game_data/evidence/official_kb_buildings_2026-10-10.json"
        ).read_text(encoding="utf-8")
    )
    rows = {r["level"]: r["effects"] for r in kb["buildings"]["24"]["rows"]}
    d = ev["durations"]

    def hms(sec: float) -> str:
        s = round(sec)
        return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}"

    for lvl in range(1, 21):
        assert hms(d["small_base_s"] * d["factor"] ** (lvl - 1)) == rows[lvl][0], lvl
        great = rows[lvl][1]
        if lvl < 10:
            assert great == "", lvl
        else:
            assert hms(d["great_base_s"] * d["factor"] ** (lvl - 1)) == great, lvl
            assert great in ev["official_answers"]["text"], lvl
    assert rows[1][0] == d["answers_small_l1"] == "24:00:00"
    assert rows[10][1] == d["answers_great_l10"] == "43:08:11"
