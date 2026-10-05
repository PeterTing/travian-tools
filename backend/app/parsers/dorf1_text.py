"""村莊總覽（dorf1）純文字解析 — Ctrl+A 剪貼簿格式（zh-TW 等）。

HTML 路徑仍走 dorf1.parse_dorf1。此模組處理遊戲頁全選複製的純文字：
- 數字常夾雙向控制字元（U+202D/U+202C）
- 田地等級可能連成一串（例如 18 個 1–2 位數）
- 部隊列常出現「名稱\\t數量\\t名稱」重複
- 產量標籤：木材／磚塊／鋼鐵／穀物（或泥土／鐵礦／農田）
"""

from __future__ import annotations

import re
from typing import Any

from app.parsers.dorf1 import calculate_village_type
from app.parsers.numbers import (
    clean_number,
    parse_coords_pair,
    parse_signed_int,
    strip_bidi,
)

_PROD_LABELS = {
    "木材": "wood",
    "木": "wood",
    "lumber": "wood",
    "wood": "wood",
    "磚塊": "clay",
    "磚": "clay",
    "泥土": "clay",
    "黏土": "clay",
    "clay": "clay",
    "鋼鐵": "iron",
    "鐵礦": "iron",
    "鐵": "iron",
    "iron": "iron",
    "穀物": "crop",
    "農田": "crop",
    "穀": "crop",
    "crop": "crop",
}


def _lines(text: str) -> list[str]:
    return [strip_bidi(ln).strip() for ln in (text or "").splitlines()]


def split_run_together_levels(digits: str, expect: int = 18) -> list[int] | None:
    """把連在一起的田地等級拆成 expect 個 0–20 的整數。

    優先取兩位數（10–20），否則取一位。拆不出剛好 expect 個就回 None。
    """
    s = re.sub(r"\D", "", digits or "")
    if not s:
        return None

    def dfs(i: int, acc: list[int]) -> list[int] | None:
        if len(acc) == expect:
            return acc if i == len(s) else None
        if i >= len(s):
            return None
        # 兩位優先
        if i + 1 < len(s):
            two = int(s[i : i + 2])
            if 10 <= two <= 20:
                got = dfs(i + 2, acc + [two])
                if got is not None:
                    return got
        one = int(s[i])
        if 0 <= one <= 20:
            got = dfs(i + 1, acc + [one])
            if got is not None:
                return got
        return None

    return dfs(0, [])


def _parse_production(lines: list[str]) -> dict[str, int]:
    production = {"wood": 0, "clay": 0, "iron": 0, "crop": 0}
    for ln in lines:
        m = re.match(
            r"^(木材|木|磚塊|磚|泥土|黏土|鋼鐵|鐵礦|鐵|穀物|農田|穀|"
            r"lumber|wood|clay|iron|crop)\s*[:：]?\s*(.+)$",
            ln,
            re.I,
        )
        if not m:
            continue
        key = _PROD_LABELS.get(m.group(1).lower()) or _PROD_LABELS.get(m.group(1))
        if key:
            production[key] = parse_signed_int(m.group(2))
    return production


def _parse_stock(lines: list[str]) -> dict[str, int]:
    """從開頭數列推資源存量。

    Ctrl+A 常見序列：… gold silver warehouse wood clay iron granary crop …
    或以「倉庫容量 ≥ 資源」對出六連數字。
    """
    resources = {"wood": 0, "clay": 0, "iron": 0, "crop": 0}
    nums: list[int] = []
    for ln in lines[:25]:
        if not ln:
            continue
        if re.fullmatch(r"[\d,.\s]+", ln):
            nums.append(clean_number(ln))
            continue
        if nums and len(nums) >= 6:
            break
    best: tuple[int, int, int, int] | None = None
    for i in range(len(nums) - 5):
        wcap, wood, clay, iron, gcap, crop = nums[i : i + 6]
        if wcap < 100 or gcap < 100:
            continue
        if wood > wcap or clay > wcap or iron > wcap or crop > gcap:
            continue
        best = (wood, clay, iron, crop)
        # 繼續找：後面較靠近產量的較準，但同一頁通常只有一組
    if best:
        resources["wood"], resources["clay"], resources["iron"], resources["crop"] = (
            best
        )
    return resources


def _parse_population(lines: list[str]) -> int:
    for ln in lines:
        m = re.search(r"人口\s*：?\s*:?\s*([\d,]+)", ln)
        if m:
            return clean_number(m.group(1))
    return 0


def _parse_troops(lines: list[str]) -> list[dict[str, Any]]:
    troops: list[dict[str, Any]] = []
    in_army = False
    for ln in lines:
        if re.match(r"^軍隊\s*：?\s*$", ln) or ln.startswith("軍隊："):
            in_army = True
            rest = ln.split("：", 1)[-1].strip() if "：" in ln else ""
            if not rest:
                continue
            ln = rest
        if not in_army:
            continue
        if re.match(r"^(人口|忠誠|村莊|任務|Privacy|©)", ln):
            break
        if not ln:
            continue
        # name \t count \t name  or  count \t name  or name \t count
        parts = re.split(r"\t+", ln)
        parts = [p.strip() for p in parts if p.strip()]
        if len(parts) >= 3 and parts[0] == parts[-1]:
            name, count_s = parts[0], parts[1]
        elif len(parts) == 2:
            if re.fullmatch(r"[\d,]+", parts[0]):
                count_s, name = parts[0], parts[1]
            else:
                name, count_s = parts[0], parts[1]
        else:
            m = re.match(r"^(.+?)\s+([\d,]+)$", ln) or re.match(
                r"^([\d,]+)\s+(.+)$", ln
            )
            if not m:
                continue
            if re.fullmatch(r"[\d,]+", m.group(1)):
                count_s, name = m.group(1), m.group(2)
            else:
                name, count_s = m.group(1), m.group(2)
        name = name.strip()
        if not name or name in ("士兵",):
            continue
        count = clean_number(count_s)
        # slug troop_id from name
        troop_id = "troop_" + re.sub(r"\s+", "_", name)
        troops.append({"troop_id": troop_id, "name": name, "count": count})
    return troops


def _parse_villages(lines: list[str]) -> list[dict[str, Any]]:
    villages: list[dict[str, Any]] = []
    # After 村莊群組 / cap / group headers: name then (x|y)
    start = 0
    for i, ln in enumerate(lines):
        if "村莊群組" in ln or re.match(r"^村莊\s", ln):
            start = i
            break
    i = start
    skip = {
        "村莊群組",
        "cap",
        "任務概覽",
        "Privacy settings",
        "連結列表",
        "聯盟旗幟",
    }
    while i < len(lines):
        ln = lines[i]
        if not ln or ln in skip or ln.startswith("©") or ln.startswith("("):
            i += 1
            continue
        if re.match(r"^首頁\b", ln) or "Discord" in ln:
            break
        # group labels like Anvil-02~06 — skip if next isn't coords and looks like group
        coords = parse_coords_pair(ln)
        if coords:
            i += 1
            continue
        # name line; coords on same or next line
        same = parse_coords_pair(ln)
        name = ln
        x = y = None
        if same:
            # "01 (184|110)" style
            m = re.match(r"^(.+?)\s*\(", ln)
            name = m.group(1).strip() if m else ln
            x, y = same
        elif i + 1 < len(lines):
            nxt = parse_coords_pair(lines[i + 1])
            if nxt:
                x, y = nxt
                i += 1
            else:
                i += 1
                continue
        else:
            i += 1
            continue
        # skip pure group headers without coords handled above
        if x is None:
            i += 1
            continue
        if re.fullmatch(r"[\d,]+", name):
            i += 1
            continue
        villages.append(
            {
                "village_id": None,
                "name": name,
                "coordinate_x": x,
                "coordinate_y": y,
                "population": 0,
                "is_capital": len(villages) == 0,
                "is_active": len(villages) == 0,
            }
        )
        i += 1
    return villages


def _field_levels_from_lines(lines: list[str]) -> list[int] | None:
    # 1) run-together digit string near 產量
    for ln in lines:
        compact = re.sub(r"\D", "", ln)
        if 18 <= len(compact) <= 36 and re.fullmatch(r"\d+", ln.strip() or compact):
            # line is mostly digits
            if re.fullmatch(r"\d+", re.sub(r"\s", "", strip_bidi(ln))):
                got = split_run_together_levels(compact, 18)
                if got:
                    return got
        if len(compact) >= 18 and not re.search(r"[\u4e00-\u9fffA-Za-z:：]", ln):
            got = split_run_together_levels(compact, 18)
            if got:
                return got
    # 2) 18 consecutive small integers before 產量
    try:
        prod_i = next(i for i, ln in enumerate(lines) if "產量" in ln)
    except StopIteration:
        prod_i = len(lines)
    block: list[int] = []
    for ln in lines[max(0, prod_i - 30) : prod_i]:
        if re.fullmatch(r"\d{1,2}", ln):
            block.append(int(ln))
        elif block and len(block) < 18:
            block = []
    if len(block) >= 18:
        return block[-18:]
    return None


def _levels_to_fields(levels: list[int], production: dict[str, int]) -> list[dict]:
    """盡力標 resource_type：高穀產量 → 15c（三個最低等級當木泥鐵）。"""
    crop_heavy = (
        production.get("crop", 0)
        >= max(
            production.get("wood", 0),
            production.get("clay", 0),
            production.get("iron", 0),
            1,
        )
        * 10
        and production.get("crop", 0) > 1000
    )

    fields: list[dict] = []
    if crop_heavy and len(levels) == 18:
        # three lowest unique positions → wood, clay, iron in order
        indexed = sorted(range(18), key=lambda i: (levels[i], i))
        non_crop = set(indexed[:3])
        types = {}
        for t, idx in zip(("wood", "clay", "iron"), sorted(non_crop), strict=True):
            types[idx] = t
        for i, lvl in enumerate(levels):
            fields.append(
                {
                    "position": i + 1,
                    "resource_type": types.get(i, "crop"),
                    "level": lvl,
                }
            )
        return fields

    # default 4-4-4-6 layout
    layout = ["wood"] * 4 + ["clay"] * 4 + ["iron"] * 4 + ["crop"] * 6
    for i, lvl in enumerate(levels[:18]):
        fields.append(
            {
                "position": i + 1,
                "resource_type": layout[i] if i < len(layout) else "crop",
                "level": lvl,
            }
        )
    return fields


def village_overview_is_meaningful(data: dict[str, Any]) -> bool:
    """確認畫面／存入用：至少有村名或座標，且資源／產量／田／部隊其一有內容。"""
    if not isinstance(data, dict):
        return False
    if data.get("raw_text") and len(data) <= 2 and not data.get("village_name"):
        # only raw_text (+ optional empty keys)
        has_structured = any(
            data.get(k)
            for k in (
                "village_name",
                "coordinate_x",
                "resources",
                "production",
                "resource_fields",
                "troops",
                "villages",
            )
        )
        if not has_structured:
            return False
    name = data.get("village_name")
    x, y = data.get("coordinate_x"), data.get("coordinate_y")
    has_identity = bool(name) or (x is not None and y is not None)
    resources = data.get("resources") or {}
    production = data.get("production") or {}
    has_stock = any(
        int(resources.get(k) or 0) > 0 for k in ("wood", "clay", "iron", "crop")
    )
    has_prod = any(
        int(production.get(k) or 0) != 0 for k in ("wood", "clay", "iron", "crop")
    )
    has_fields = bool(data.get("resource_fields"))
    has_troops = bool(data.get("troops"))
    has_villages = bool(data.get("villages"))
    if not has_identity and not (has_stock or has_prod or has_fields or has_villages):
        return False
    # identity alone with all zeros and no fields/troops/villages → not meaningful
    if has_identity and not (
        has_stock or has_prod or has_fields or has_troops or has_villages
    ):
        if int(data.get("population") or 0) <= 0:
            return False
    return (
        has_identity
        or has_stock
        or has_prod
        or has_fields
        or has_troops
        or has_villages
    )


def parse_dorf1_text(text: str) -> dict[str, Any]:
    raw = text or ""
    lines = [ln for ln in _lines(raw) if ln is not None]
    nonempty = [ln for ln in lines if ln]

    production = _parse_production(nonempty)
    resources = _parse_stock(nonempty)
    population = _parse_population(nonempty)
    troops = _parse_troops(nonempty)
    villages = _parse_villages(nonempty)

    levels = _field_levels_from_lines(nonempty)
    resource_fields: list[dict] = []
    warnings_notes: list[str] = []
    if levels:
        resource_fields = _levels_to_fields(levels, production)
    else:
        warnings_notes.append("無法從純文字拆出 18 格田地等級")

    active = villages[0] if villages else None
    # Prefer explicit active name line before 人口 (player then village)
    village_name = active["name"] if active else None
    coordinate_x = active["coordinate_x"] if active else None
    coordinate_y = active["coordinate_y"] if active else None
    for i, ln in enumerate(nonempty):
        if ln.startswith("人口"):
            # previous non-empty non-troop line may be village name
            for prev in reversed(nonempty[:i]):
                if prev in ("軍隊：",) or prev.startswith("軍隊"):
                    continue
                if re.match(r"^(TestPlayer|Ignatius)$", prev):
                    continue
                if parse_coords_pair(prev):
                    continue
                if re.search(
                    r"產量|木材|磚|鋼鐵|穀|Privacy|連結|英雄|伺服器|聯盟|忠誠", prev
                ):
                    continue
                if re.fullmatch(r"[\d,]+", prev):
                    continue
                # likely village name (e.g. 01 / Alpha)
                if not village_name:
                    village_name = prev
                break
            break

    village_type = calculate_village_type(resource_fields) if resource_fields else None
    if (
        village_type is None
        and production.get("crop", 0)
        >= max(
            production.get("wood", 0),
            production.get("clay", 0),
            production.get("iron", 0),
            1,
        )
        * 10
    ):
        village_type = "15c"

    data: dict[str, Any] = {
        "village_id": None,
        "village_name": village_name,
        "coordinate_x": coordinate_x,
        "coordinate_y": coordinate_y,
        "population": population,
        "is_capital": bool(active and active.get("is_capital")),
        "capital_village_id": None,
        "resources": resources,
        "production": production,
        "resource_fields": resource_fields,
        "village_type": village_type,
        "troops": troops,
        "villages": villages,
    }
    if warnings_notes:
        data["_text_notes"] = warnings_notes
    return data
