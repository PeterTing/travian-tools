"""P0-10：開局攻略清單的靜態資料（scripts/convert_opening_checklist.py 轉出來的）.

數字跟 Peter 的 Excel 對過（轉換時會跟 Excel 存的計算結果逐格比對）；
這裡守住結構，並抽幾個數字確認沒有被改。
"""

import json

import pytest

from app.services.opening_checklist_service import DATA_FILE, load_checklist

TRIBES = {"romans", "gauls", "teutons", "egyptians", "huns", "vikings", "spartans"}


@pytest.fixture(scope="module")
def data() -> dict:
    return load_checklist()


def _steps(data: dict, strategy: str) -> dict[str, dict]:
    s = next(x for x in data["strategies"] if x["id"] == strategy)
    return {st["id"]: st for sec in s["sections"] for st in sec["steps"]}


def test_two_strategies_from_the_english_sheets(data: dict) -> None:
    got = {(s["id"], s["name"], s["sheet"]) for s in data["strategies"]}
    assert got == {
        ("4p-farm", "4P 農開", "4P - Farm"),
        ("3p-sim", "3P 兵開", "3P - Sim"),
    }
    assert data["source"]["hero_level"] == 0


@pytest.mark.parametrize("strategy", ["4p-farm", "3p-sim"])
def test_steps_are_unique_and_complete(data: dict, strategy: str) -> None:
    s = next(x for x in data["strategies"] if x["id"] == strategy)
    ids = [st["id"] for sec in s["sections"] for st in sec["steps"]]
    assert len(ids) == len(set(ids)) == s["required_steps"] + s["optional_steps"]
    # 只有「選做：便宜的文明點建築」是選做，而且在最後一段
    optional = [sec for sec in s["sections"] if sec["optional"]]
    assert [sec["id"] for sec in optional] == ["extra-cp"]
    assert s["sections"][-1]["id"] == "extra-cp"
    assert s["optional_steps"] == len(optional[0]["steps"]) == 15
    rows = [int(i[1:]) for i in ids]
    assert rows == sorted(rows), "照 Excel 的順序"
    for sec in s["sections"]:
        assert sec["title"] and sec["steps"]
        for st in sec["steps"]:
            assert st["building"]
            assert set(st.get("by_tribe", {})) <= TRIBES
            if st["why"] is not None:
                assert st["why"]["zh"].strip(), "「為什麼」不能是空字串"


@pytest.mark.parametrize("strategy", ["4p-farm", "3p-sim"])
def test_sections_follow_task_tier(data: dict, strategy: str) -> None:
    s = next(x for x in data["strategies"] if x["id"] == strategy)
    tiers = [sec["tier"] for sec in s["sections"] if sec["tier"] is not None]
    assert tiers == sorted(tiers) and tiers[0] == 1
    assert [sec["title"] for sec in s["sections"]][:2] == ["任務等級 1", "任務等級 2"]


def test_numbers_match_the_excel(data: dict) -> None:
    farm = _steps(data, "4p-farm")
    assert farm["r016"]["building"] == "所有農田"
    assert farm["r016"]["cost"] == 3325  # =665*5
    assert farm["r016"]["reward_res"] == 900
    assert farm["r076"]["cost"] == 16655  # =9155+7500
    assert farm["r071"]["cost"] == 20330  # Party 1
    sim = _steps(data, "3p-sim")
    assert sim["r052"]["cost"] == 16610
    assert sim["r063"]["cost"] == 19500  # =(910+1170+910+260)*6


def test_tribe_dependent_fields(data: dict) -> None:
    farm = _steps(data, "4p-farm")
    settlers = farm["r086"]  # Train settler(s) ×2
    assert settlers["by_tribe"]["gauls"]["cost"] == 2 * 18100
    assert settlers["by_tribe"]["egyptians"]["cost"] == 2 * 21000
    assert settlers["by_tribe"]["vikings"] == {"missing": "settler_cost"}
    stable = farm["r056"]
    assert (stable["target"], stable["cost"]) == ("升到 3", 2105)
    assert stable["by_tribe"]["romans"]["cost"] == 5550  # 帝國騎兵：馬廄升到 5
    assert farm["r058"]["skip"] is True
    assert farm["r058"]["by_tribe"]["romans"]["skip"] is False
    assert data["tribe_data"]["settler_cost"]["huns"] == 20900


def _shown_text(node: object, key: str = "") -> list[str]:
    """畫面上會出現的中文（略過代碼、來源和英文原文）."""
    if key in ("source", "en", "id", "kind", "sheet", "missing") or key.endswith("_en"):
        return []
    if isinstance(node, dict):
        return [t for k, v in node.items() for t in _shown_text(v, k)]
    if isinstance(node, list):
        return [t for v in node for t in _shown_text(v, key)]
    return [node] if isinstance(node, str) else []


def test_uses_taiwan_terms(data: dict) -> None:
    text = "\n".join(_shown_text(data))
    for word in ("种族", "種族", "村庄", "资源", "铁矿", "粘土", "趴", "cp", "CP"):
        assert word not in text
    buildings = {
        st["building"]
        for s in data["strategies"]
        for sec in s["sections"]
        for st in sec["steps"]
    }
    assert {"村莊大樓", "伐木場", "泥坑", "鐵礦場", "農田", "集結點"} <= buildings
    assert "拓荒者" in buildings


def test_file_is_valid_json() -> None:
    json.loads(DATA_FILE.read_text(encoding="utf-8"))
