"""集結點解析（HTML 與貼上文字）。

分類規則（P0-03 驗收）：
- 每一筆移動只歸一類：table class 的 inAttack / inRaid / outAttack / outRaid /
  inSupply / outSupply / inReturn 等互斥；一筆搶奪不會同時算成出兵和來襲。
- 「村內部隊」區塊的表格是駐軍（own / stationed），不會被當成來襲增援。
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any

from bs4 import BeautifulSoup, Tag

from app.parsers.numbers import (
    parse_coordinate_text,
    parse_coords_pair,
    parse_signed_int,
    strip_bidi,
)
from app.parsers.server_time import parse_server_time
from app.parsers.village_list import active_village, parse_village_list

# table class → movement kind（互斥，先比對較具體的）
_CLASS_KIND: list[tuple[str, str]] = [
    ("inRaid", "incoming_raid"),
    ("inAttack", "incoming_attack"),
    ("inSpy", "incoming_spy"),
    ("inSupply", "incoming_reinforcement"),
    ("outRaid", "outgoing_raid"),
    ("outAttack", "outgoing_attack"),
    ("outSpy", "outgoing_spy"),
    ("outSupply", "outgoing_reinforcement"),
    ("inReturn", "returning"),
    ("outReturn", "returning"),
]

_SECTION_KIND_HINTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"來犯|來村軍團|Incoming", re.I), "incoming"),
    (re.compile(r"來村的支援|抵達的支援", re.I), "incoming_reinforcement"),
    (re.compile(r"出擊|Outgoing", re.I), "outgoing"),
    (re.compile(r"返回", re.I), "returning"),
    (re.compile(r"村內部隊|在本村|Troops in this village", re.I), "garrison"),
    (re.compile(r"在他村", re.I), "reinforcing_others"),
]


def _classes(tag: Tag) -> list[str]:
    value = tag.get("class")
    if value is None:
        return []
    if isinstance(value, str):
        return value.split()
    return list(value)


def _kind_from_classes(classes: list[str]) -> str | None:
    joined = " ".join(classes)
    for token, kind in _CLASS_KIND:
        if re.search(rf"\b{token}\b", joined):
            return kind
    return None


def _parse_troops(table: Tag) -> list[dict[str, Any]]:
    unit_ids: list[str] = []
    unit_names: list[str] = []
    for img in table.select("img.unit"):
        cls = " ".join(_classes(img))
        match = re.search(r"\bu(\d+|hero)\b", cls)
        if not match:
            continue
        uid = match.group(1)
        if uid == "hero":
            unit_ids.append("hero")
        else:
            unit_ids.append(uid)
        alt = img.get("alt")
        unit_names.append(alt if isinstance(alt, str) else "")

    count_row = table.select_one("tbody.units.last tr")
    if count_row is None:
        units_bodies = table.select("tbody.units")
        count_row = units_bodies[-1].select_one("tr") if units_bodies else None
    counts: list[int | None] = []
    if count_row is not None:
        for td in count_row.select("td.unit"):
            text = strip_bidi(td.get_text(strip=True))
            if text in ("?", "？", ""):
                counts.append(None)  # unknown (incoming fog of war)
            else:
                counts.append(parse_signed_int(text))

    troops: list[dict[str, Any]] = []
    for i, uid in enumerate(unit_ids):
        count = counts[i] if i < len(counts) else 0
        troops.append(
            {
                "troop_id": f"troop_{uid}",
                "name": unit_names[i] if i < len(unit_names) else "",
                "count": count,
            }
        )
    return troops


def _parse_coords(table: Tag) -> tuple[int | None, int | None]:
    x_el = table.select_one(".coordinateX")
    y_el = table.select_one(".coordinateY")
    if x_el is None or y_el is None:
        return None, None
    return parse_coordinate_text(x_el.get_text()), parse_coordinate_text(
        y_el.get_text()
    )


def _parse_timer_seconds(table: Tag) -> int | None:
    timer = table.select_one("span.timer[value], span.timer")
    if timer is None:
        return None
    value = timer.get("value")
    if isinstance(value, str) and value.isdigit():
        return int(value)
    text = strip_bidi(timer.get_text(strip=True))
    m = re.match(r"(\d+):(\d{2}):(\d{2})", text)
    if m:
        return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
    return None


def _arrival_iso(server_time: str | None, seconds: int | None) -> str | None:
    if seconds is None:
        return None
    base = datetime(2000, 1, 1, 0, 0, 0)
    if server_time:
        m = re.match(r"(\d{1,2}):(\d{2}):(\d{2})", server_time)
        if m:
            base = base.replace(
                hour=int(m.group(1)) % 24,
                minute=int(m.group(2)),
                second=int(m.group(3)),
            )
    arrival = base + timedelta(seconds=seconds)
    return arrival.strftime("%H:%M:%S")


def _headline(table: Tag) -> str:
    el = table.select_one(".troopHeadline")
    return el.get_text(" ", strip=True) if el else ""


def _role(table: Tag) -> str:
    el = table.select_one("td.role")
    return el.get_text(" ", strip=True) if el else ""


def parse_rally_point_html(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    server_time = parse_server_time(html)
    villages = parse_village_list(html)
    active = active_village(villages)

    incoming: list[dict] = []
    outgoing: list[dict] = []
    returning: list[dict] = []
    garrison_own: list[dict] = []
    garrison_stationed: list[dict] = []
    reinforcing_others: list[dict] = []
    incoming_reinforcements: list[dict] = []

    current_section = ""
    root = (
        soup.select_one(".rallyPointOverviewContainer")
        or soup.select_one("#build.gid16")
        or soup
    )

    for el in root.find_all(["h4", "table"]):
        if el.name == "h4":
            current_section = el.get_text(" ", strip=True)
            continue
        if el.name != "table":
            continue
        classes = _classes(el)
        if "troop_details" not in classes:
            continue

        kind = _kind_from_classes(classes)
        section_bucket = "unknown"
        for pattern, bucket in _SECTION_KIND_HINTS:
            if pattern.search(current_section):
                section_bucket = bucket
                break

        # 互斥：table class 優先；沒有 class 時才依區塊標題
        if kind is None:
            if section_bucket == "garrison":
                kind = "garrison"
            elif section_bucket == "incoming_reinforcement":
                kind = "incoming_reinforcement"
            elif section_bucket == "reinforcing_others":
                kind = "reinforcing_others"
            elif section_bucket == "returning":
                kind = "returning"
            elif section_bucket == "outgoing":
                # 標題只有「出擊」時，看 headline 關鍵字
                hl = _headline(el)
                if re.search(r"搶奪|掠奪|Raid", hl, re.I):
                    kind = "outgoing_raid"
                elif re.search(r"攻擊|Attack", hl, re.I):
                    kind = "outgoing_attack"
                else:
                    kind = "outgoing_attack"
            elif section_bucket == "incoming":
                hl = _headline(el)
                if re.search(r"搶奪|掠奪|Raid", hl, re.I):
                    kind = "incoming_raid"
                else:
                    kind = "incoming_attack"
            else:
                # 無 class、無明確區塊 → 略過，避免誤把駐軍當增援
                continue

        x, y = _parse_coords(el)
        seconds = _parse_timer_seconds(el)
        movement = {
            "kind": kind,
            "role": _role(el),
            "headline": _headline(el),
            "coordinate_x": x,
            "coordinate_y": y,
            "timer_seconds": seconds,
            "arrival_time": _arrival_iso(server_time, seconds),
            "troops": _parse_troops(el),
            "section": current_section,
        }

        if kind in ("incoming_attack", "incoming_raid", "incoming_spy"):
            incoming.append(movement)
        elif kind == "incoming_reinforcement":
            incoming_reinforcements.append(movement)
        elif kind in (
            "outgoing_attack",
            "outgoing_raid",
            "outgoing_spy",
            "outgoing_reinforcement",
        ):
            outgoing.append(movement)
        elif kind == "returning":
            returning.append(movement)
        elif kind == "reinforcing_others":
            reinforcing_others.append(movement)
        elif kind == "garrison":
            hl = str(movement.get("headline") or "")
            role = str(movement.get("role") or "")
            if re.search(r"自軍|Own|Troops", hl, re.I) or (
                active is not None and active["name"] in role
            ):
                garrison_own.append(movement)
            else:
                garrison_stationed.append(movement)

    return {
        "village_id": active["village_id"] if active else None,
        "village_name": active["name"] if active else None,
        "server_time": server_time,
        "incoming": incoming,
        "incoming_reinforcements": incoming_reinforcements,
        "outgoing": outgoing,
        "returning": returning,
        "garrison_own": garrison_own,
        "garrison_stationed": garrison_stationed,
        "reinforcing_others": reinforcing_others,
        # 方便驗收：所有移動只出現在一個清單
        "movements": incoming
        + incoming_reinforcements
        + outgoing
        + returning
        + reinforcing_others,
    }


def _parse_garrison_from_plain_text(text: str) -> tuple[list[dict], list[dict]]:
    """解析「在本村…部隊」區塊的自軍／他軍列（純文字）。"""
    own: list[dict] = []
    stationed: list[dict] = []
    if not re.search(r"在本村|村內部隊|Troops in this village", text, re.I):
        return own, stationed
    lines = [strip_bidi(ln).strip() for ln in text.splitlines() if ln.strip()]
    i = 0
    while i < len(lines):
        ln = lines[i]
        if re.search(r"在他村", ln):
            break
        if "自軍" in ln or re.search(r"的士兵", ln):
            role = ln.split("\t")[0].replace("自軍", "").strip() or ln
            kind_own = "自軍" in ln
            coords = None
            troops: list[dict] = []
            # look ahead for coords + unit header + 士兵 counts
            names: list[str] = []
            for look in lines[i + 1 : i + 12]:
                c = parse_coords_pair(look)
                if c and coords is None:
                    coords = c
                    # same line may also have unit names after coords
                    rest = look
                    # strip coords portion
                    rest = re.sub(r"\([^)]*\)", " ", look)
                    maybe = [n for n in re.split(r"\s+|\t+", rest) if n]
                    if maybe and any(
                        "兵" in n or n == "英雄" or "騎" in n for n in maybe
                    ):
                        names = maybe
                if ("方陣" in look or "英雄" in look or "劍士" in look) and not names:
                    names = [
                        n
                        for n in re.split(r"\s+|\t+", look)
                        if n and parse_coords_pair(n) is None
                    ]
                if look.startswith("士兵"):
                    counts = [
                        parse_signed_int(p) for p in re.split(r"\s+|\t+", look)[1:]
                    ]
                    for ni, name in enumerate(names):
                        if name in ("士兵",):
                            continue
                        cnt = counts[ni] if ni < len(counts) else 0
                        if cnt:
                            troops.append(
                                {
                                    "troop_id": f"troop_{name}",
                                    "name": name,
                                    "count": cnt,
                                }
                            )
                    break
            movement = {
                "kind": "garrison",
                "role": role,
                "headline": "自軍" if kind_own else ln,
                "coordinate_x": coords[0] if coords else None,
                "coordinate_y": coords[1] if coords else None,
                "timer_seconds": None,
                "arrival_time": None,
                "troops": troops,
                "section": "garrison",
            }
            if kind_own:
                own.append(movement)
            else:
                stationed.append(movement)
        i += 1
    return own, stationed


def parse_rally_point_text(text: str) -> dict[str, Any]:
    """貼上文字／OCR 正規化後的集結點文字。

    依區塊標題切分；每一段「村莊名 + 搶奪/攻擊 + 目標」算一筆。
    駐軍區塊（村內部隊）不會進 incoming。
    """
    text = strip_bidi(text or "")
    incoming: list[dict] = []
    outgoing: list[dict] = []
    garrison_own: list[dict] = []
    garrison_stationed: list[dict] = []
    incoming_reinforcements: list[dict] = []

    section = "unknown"
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    i = 0
    while i < len(lines):
        line = lines[i]
        for pattern, bucket in _SECTION_KIND_HINTS:
            if pattern.search(line):
                section = bucket
                break

        move_match = re.search(
            r"(.+?)\s+(搶奪|掠奪|攻擊|支援|Raid|Attack)\s+(.+)", line
        )
        if move_match and section != "unknown":
            if re.search(r"Discord|玩家守則|條款|法律聲明|最新消息|首頁", line):
                i += 1
                continue
            verb = move_match.group(2)
            kind = "unknown"
            if section == "garrison":
                kind = "garrison"
            elif section in ("incoming",) and verb in ("搶奪", "掠奪", "Raid"):
                kind = "incoming_raid"
            elif section in ("incoming",) and verb in ("攻擊", "Attack"):
                kind = "incoming_attack"
            elif section == "incoming_reinforcement" or verb == "支援":
                kind = "incoming_reinforcement"
            elif section == "outgoing" and verb in ("搶奪", "掠奪", "Raid"):
                kind = "outgoing_raid"
            elif section == "outgoing":
                kind = "outgoing_attack"

            # look ahead for coords / timer
            coords = None
            timer = None
            for look in lines[i + 1 : i + 6]:
                c = re.search(r"\(\s*(-?\d+)\s*\|\s*(-?\d+)\s*\)", look)
                if c and coords is None:
                    coords = (int(c.group(1)), int(c.group(2)))
                t = re.search(r"(\d+):(\d{2}):(\d{2})", look)
                if t and timer is None and ("時" in look or "在" in look):
                    timer = (
                        int(t.group(1)) * 3600 + int(t.group(2)) * 60 + int(t.group(3))
                    )
            movement: dict[str, Any] = {
                "kind": kind,
                "role": move_match.group(1).strip(),
                "headline": line,
                "coordinate_x": coords[0] if coords else None,
                "coordinate_y": coords[1] if coords else None,
                "timer_seconds": timer,
                "arrival_time": None,
                "troops": [],
                "section": section,
            }
            if kind in ("incoming_attack", "incoming_raid"):
                incoming.append(movement)
            elif kind == "incoming_reinforcement":
                incoming_reinforcements.append(movement)
            elif kind in ("outgoing_attack", "outgoing_raid"):
                outgoing.append(movement)
            elif kind == "garrison":
                if re.search(r"自軍", line):
                    garrison_own.append(movement)
                else:
                    garrison_stationed.append(movement)
        i += 1

    # zh-TW Ctrl+A：只有「在本村…部隊」+「自軍」時沒有「來源 搶奪 目標」列
    if not (incoming or outgoing or garrison_own or garrison_stationed):
        garrison_own, garrison_stationed = _parse_garrison_from_plain_text(text)

    village_name = None
    coords = None
    for ln in lines:
        c = parse_coords_pair(ln)
        if c and coords is None:
            coords = c
        if "的村莊" in ln or re.match(r"^\S.{0,40}$", ln):
            if "自軍" in ln:
                village_name = ln.split("\t")[0].strip() or village_name
    if garrison_own and not village_name:
        village_name = garrison_own[0].get("role")

    return {
        "village_id": None,
        "village_name": village_name,
        "coordinate_x": coords[0] if coords else None,
        "coordinate_y": coords[1] if coords else None,
        "server_time": None,
        "incoming": incoming,
        "incoming_reinforcements": incoming_reinforcements,
        "outgoing": outgoing,
        "returning": [],
        "garrison_own": garrison_own,
        "garrison_stationed": garrison_stationed,
        "reinforcing_others": [],
        "movements": incoming + incoming_reinforcements + outgoing,
    }
