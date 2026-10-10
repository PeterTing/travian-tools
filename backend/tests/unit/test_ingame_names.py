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


def _old_names_in(text: str, ingame: set[str], old: list[str]) -> list[str]:
    """由左往右找名稱，同一個位置先比長的：「長矛兵」算舊名，不會先被「矛兵」遮掉；「大倉庫」是現名，不算「倉庫」."""
    names = sorted(ingame | set(old), key=len, reverse=True)
    pattern = re.compile("|".join(re.escape(n) for n in names))
    return sorted(
        {m.group(0) for m in pattern.finditer(text) if m.group(0) not in ingame}
    )


def test_old_name_scan_matches_longer_names_first():
    ingame = {
        r["zh"] for sec in ("buildings", "units", "tribes") for r in NAMES[sec].values()
    }
    old = _old_names()
    assert _old_names_in("優先訓練長矛兵", ingame, old) == ["長矛兵"]
    assert _old_names_in("英雄宅邸、隱藏倉庫", ingame, old) == ["英雄宅邸", "隱藏倉庫"]
    assert _old_names_in("矛兵、英雄宅、山洞、大倉庫、倉庫", ingame, old) == []


def test_no_old_name_in_backend_text():
    """舊名只能出現在 aliases_zh；遊戲文字解析器（parsers/）要認得舊譯名，不算；knowledge_base 沒有接到 API（P0-23 移除）."""
    ingame = {
        r["zh"] for sec in ("buildings", "units", "tribes") for r in NAMES[sec].values()
    }
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
        hits = _old_names_in(text, ingame, old)
        if hits:
            bad.append(f"{p.relative_to(ROOT)}: {hits}")
    assert bad == []


# ── knowledge_base（策略、建築、部族、AI 檢索文字）也只用遊戲內名稱（#34 PM）────────


def _strings(o, path=""):
    """dict／list 裡所有字串值（不含 key、不含 aliases_zh：舊名只給查詢用）."""
    if isinstance(o, dict):
        for k, v in o.items():
            if k != "aliases_zh":
                yield from _strings(v, f"{path}.{k}")
    elif isinstance(o, list | tuple):
        for i, v in enumerate(o):
            yield from _strings(v, f"{path}[{i}]")
    elif isinstance(o, str):
        yield path, o


KB_QUERIES = [
    "部族", "羅馬 兵種", "高盧 兵種", "日耳曼 兵種", "條頓 兵種", "埃及 兵種", "匈奴 兵種",
    "斯巴達 兵種", "維京 兵種", "長矛兵", "矛兵", "雷法師", "建築", "大使館", "早期",
    "中期", "後期", "首都", "掠奪", "防守", "攻擊", "英雄", "世界奇觀", "文化點",
    "日耳曼 掠奪", "匈奴 防守", "綠洲", "npc 村", "征服", "投石", "奴僕", "希望騎士",
]  # fmt: skip


def _kb_output_texts() -> list[tuple[str, str]]:
    from app.knowledge_base import buildings, rag_service, strategies, tribes

    texts: list[tuple[str, str]] = []
    for mod in (tribes, buildings, strategies):
        for name, v in vars(mod).items():
            if name.isupper() and isinstance(v, dict | list):
                short = mod.__name__.rsplit(".", 1)[-1]
                texts += [(f"{short}.{name}{p}", t) for p, t in _strings(v)]
    kb = rag_service.TravianKnowledgeBase()
    for q in KB_QUERIES:
        out = rag_service.format_knowledge_for_prompt(kb.retrieve(q))
        texts.append((f"retrieve({q})", out))
    texts.append(("_format_tribe_comparison", kb._format_tribe_comparison()))
    texts.append(("_format_building_order", kb._format_building_order()))
    return texts


def test_no_old_name_in_knowledge_base_output_text():
    """策略、建築、部族資料和 AI 檢索輸出的文字：舊名表（aliases + 條頓）一個都不能出現.

    knowledge_base 原始碼裡的舊名只剩查詢用的關鍵字表（TOPIC_KEYWORDS、部族對照），不會輸出。
    """
    ingame = {
        r["zh"] for sec in ("buildings", "units", "tribes") for r in NAMES[sec].values()
    }
    old = _old_names()
    bad = []
    for where, text in _kb_output_texts():
        hits = _old_names_in(text, ingame, old)
        if hits:
            bad.append(f"{where}: {hits}")
    assert bad == []


def test_knowledge_base_names_come_from_the_table():
    from app.knowledge_base.buildings import BUILDINGS_DATA
    from app.knowledge_base.tribes import TRIBES_DATA

    speeds = _load("unit_speeds.json")["tribes"]
    for tribe, rows in speeds.items():
        assert TRIBES_DATA[tribe]["name_zh"] == NAMES["tribes"][tribe]["zh"], tribe
        for r in rows:
            got = TRIBES_DATA[tribe]["troops"][r["kb_id"]]["name_zh"]
            assert got == NAMES["units"][r["troop_id"]]["zh"], r["troop_id"]
    for bid, b in BUILDINGS_DATA.items():
        if bid in NAMES["buildings"]:
            assert b["name_zh"] == NAMES["buildings"][bid]["zh"], bid
    assert TRIBES_DATA["teutons"]["name_zh"] == "日耳曼人"
    assert TRIBES_DATA["vikings"]["troops"]["thrall"]["name_zh"] == "奴僕"


def test_knowledge_base_old_names_still_find_things():
    from app.knowledge_base import rag_service
    from app.knowledge_base.buildings import get_building_info
    from app.knowledge_base.tribes import get_tribe_info

    assert get_building_info("鐵匠舖")["name_zh"] == "盔甲廠"
    assert get_building_info("主建築")["name_zh"] == "村莊大樓"
    assert get_tribe_info("條頓")["name_zh"] == "日耳曼人"
    assert get_tribe_info("日耳曼")["name_zh"] == "日耳曼人"
    kb = rag_service.TravianKnowledgeBase()
    titles = [r["title"] for r in kb.retrieve("長矛兵")]
    assert "矛兵詳細資料" in titles
    # 斯巴達改用 ASIA x1 遊戲內名稱（2026-10-11）；以前的暫譯還找得到
    titles = [r["title"] for r in kb.retrieve("希望騎士")]
    assert "爾必達騎士詳細資料" in titles


def test_spartan_viking_names_follow_pm_rule():
    """斯巴達：ASIA x1 遊戲內名稱（2026-10-11），以前的暫譯只當 aliases；
    維京：官方說明頁 S139 沒有繁體中文版，維持兵種資料庫的名稱；計算器以前的名字只當 aliases."""
    units = NAMES["units"]
    expect = {
        "hoplite": ("裝甲步兵", "重裝步兵"),
        "shieldsman": ("盾牌手", "盾兵"),
        "twinsteel_therion": ("雙鋼泰瑞恩", "雙刃獸戰士"),
        "elpida_rider": ("爾必達騎士", "希望騎士"),
        "corinthian_crusher": ("科林斯破壞者", "科林斯粉碎者"),
        "ballista": ("賴達投石機", "弩炮"),
        "ephor": ("五長官", "監察官"),
        "thrall": ("奴僕", "奴隸"),
        "huskarl_rider": ("侍衛騎士", "禁衛軍騎士"),
        "jarl": ("領主", "首領"),
    }
    for tid, (zh, alias) in expect.items():
        assert units[tid]["zh"] == zh
        assert alias in units[tid]["aliases"]
    for tribe in ("spartans", "vikings"):
        assert sum(1 for u in units.values() if u["tribe"] == tribe) == 10


# P0-23 後續：維京顯示「中文暫譯（官方英文名）」，英文名照官方說明頁；name.en 不能有中文
# （斯巴達 2026-10-11 起是 ASIA x1 遊戲內名稱，不是暫譯）
CJK = re.compile(r"[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]")
SUPPORT = json.loads(
    (ROOT / "scripts/game_data/evidence/official_support_2026-10-10.json").read_text(
        encoding="utf-8"
    )
)["articles"]


def test_viking_names_are_provisional_with_official_english():
    troops = _load("troops.json")["troops"]
    pending = {tid: u for tid, u in NAMES["units"].items() if u["zh_pending"]}
    assert {u["tribe"] for u in pending.values()} == {"vikings"}
    assert len(pending) == 10
    by_url = {a["url"]: a for a in SUPPORT.values()}
    for tid, u in NAMES["units"].items():
        assert u["display_zh"] == (f"{u['zh']}（{u['en']}）" if u["en"] else u["zh"]), (
            tid
        )
        if not u["zh_pending"]:
            assert u["en"] is None and u["en_ref"] is None, tid
            continue
        if u["en"]:
            # 英文名逐字出現在官方說明頁全文（存證），troops.json 的 name_en 跟著它
            assert u["en"] in by_url[u["en_ref"]]["text"], tid
            assert troops[tid]["name_en"] == u["en"], tid
    assert NAMES["units"]["thrall"]["display_zh"] == "奴僕（Thrall）"
    assert NAMES["units"]["hoplite"]["display_zh"] == "裝甲步兵"  # 不加英文括號
    assert NAMES["units"]["ballista"]["en"] is None


def test_catapult_spelling_follows_ts11():
    # ts11 manual/troop/18、68 都寫「弩炮」（#34 PM 決定統一）；「弩砲」只當搜尋用的舊名
    assert MANUAL["troops"]["18"]["name_zh"] == "弩炮"
    zh = [u["zh"] for u in NAMES["units"].values()]
    assert "弩砲" not in zh
    # 斯巴達 Ballista 的遊戲內名稱是「賴達投石機」（ASIA x1，2026-10-11）；弩炮／弩砲只給搜尋
    assert NAMES["units"]["ballista"]["zh"] == "賴達投石機"
    assert {"弩炮", "弩砲"} <= set(NAMES["units"]["ballista"]["aliases"])


def test_no_chinese_in_english_names():
    for tid, t in _load("troops.json")["troops"].items():
        assert not CJK.search(t["name_en"]), tid
    for bid, b in _load("buildings.json")["buildings"].items():
        assert not CJK.search(b.get("name_en") or ""), bid
    for tid, u in NAMES["units"].items():
        assert not CJK.search(u["en"] or ""), tid


def test_ts11_manual_71_90_and_knowledge_base_evidence():
    # ts11 說明頁 71～90 號（斯巴達、維京）全部「異常錯誤」；原文 sha256 可以重算。知識庫沒有兵種頁
    import hashlib

    ev_dir = ROOT / "scripts/game_data/evidence"
    ev = json.loads(
        (ev_dir / "ts11_manual_troops_71_90_2026-10-10.json").read_text(
            encoding="utf-8"
        )
    )
    assert sorted(int(n) for n in ev["troops"]) == list(range(71, 91))
    for n, row in ev["troops"].items():
        assert (
            hashlib.sha256(row["raw"].encode("utf-8")).hexdigest() == row["sha256"]
        ), n
        assert "api.unexpectedError" in row["raw"], n
    kb = json.loads(
        (ev_dir / "official_kb_units_2026-10-10.json").read_text(encoding="utf-8")
    )
    assert kb["bundle"]["routes"] == [
        ":language",
        "buildings",
        "buildings/:gid",
        "items",
    ]
    # 所以維京運載量維持留空；斯巴達改在 ASIA x1 讀（asia_x1_manual_spartans_2026-10-11.json）
    troops = _load("troops.json")["troops"]
    for tid, u in NAMES["units"].items():
        if u["tribe"] == "vikings":
            assert troops[tid]["carry_capacity"] is None, tid
        if u["tribe"] == "spartans":
            assert isinstance(troops[tid]["carry_capacity"], int), tid
