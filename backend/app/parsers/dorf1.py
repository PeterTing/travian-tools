"""村莊總覽（dorf1.php）HTML 解析 — 對齊擴充 content.js 的行為。"""

from __future__ import annotations

from bs4 import BeautifulSoup

from app.parsers.html_utils import attr, class_list
from app.parsers.numbers import clean_number, parse_signed_int
from app.parsers.village_list import (
    active_village,
    capital_village_id,
    parse_page_population,
    parse_village_list,
)


def parse_resources(soup: BeautifulSoup) -> dict[str, int]:
    resources = {"wood": 0, "clay": 0, "iron": 0, "crop": 0}
    stock = soup.select_one("#stockBar")
    if stock is not None:
        mapping = [
            ("wood", ".lumber .value, [class*='lumber'] .value, #l1"),
            ("clay", ".clay .value, [class*='clay'] .value, #l2"),
            ("iron", ".iron .value, [class*='iron'] .value, #l3"),
            ("crop", ".crop .value, [class*='crop'] .value, #l4"),
        ]
        for key, sel in mapping:
            el = stock.select_one(sel)
            if el is not None:
                resources[key] = clean_number(el.get_text())
    if any(resources.values()):
        return resources
    for key, eid in (("wood", "l1"), ("clay", "l2"), ("iron", "l3"), ("crop", "l4")):
        el = soup.select_one(f"#{eid}")
        if el is not None:
            resources[key] = clean_number(el.get_text())
    return resources


def parse_production(soup: BeautifulSoup) -> dict[str, int]:
    production = {"wood": 0, "clay": 0, "iron": 0, "crop": 0}
    table = soup.select_one("#production")
    if table is None:
        return production
    cells = table.select("td.num")
    if len(cells) >= 4:
        production["wood"] = parse_signed_int(cells[0].get_text())
        production["clay"] = parse_signed_int(cells[1].get_text())
        production["iron"] = parse_signed_int(cells[2].get_text())
        production["crop"] = parse_signed_int(cells[3].get_text())
    return production


def parse_resource_fields(soup: BeautifulSoup) -> list[dict]:
    fields: list[dict] = []
    container = soup.select_one("#resourceFieldContainer")
    if container is None:
        return fields
    for i in range(1, 19):
        field = container.select_one(f".buildingSlot{i}, [data-aid='{i}']")
        if field is None:
            continue
        label = field.select_one(".labelLayer")
        level = clean_number(label.get_text()) if label else 0
        gid = attr(field, "data-gid")
        classes = class_list(field)
        resource_type = "unknown"
        if gid == "1" or "gid1" in classes:
            resource_type = "wood"
        elif gid == "2" or "gid2" in classes:
            resource_type = "clay"
        elif gid == "3" or "gid3" in classes:
            resource_type = "iron"
        elif gid == "4" or "gid4" in classes:
            resource_type = "crop"
        fields.append({"position": i, "resource_type": resource_type, "level": level})
    return fields


def calculate_village_type(resource_fields: list[dict]) -> str | None:
    if not resource_fields:
        return None
    counts = {"wood": 0, "clay": 0, "iron": 0, "crop": 0}
    for field in resource_fields:
        rt = field.get("resource_type")
        if rt in counts:
            counts[rt] += 1
    crop_count = counts["crop"]
    if crop_count == 15:
        return "15c"
    if crop_count == 9:
        return "9c"
    if crop_count == 7:
        return "7c"
    if crop_count == 6:
        if counts["wood"] == 4 and counts["clay"] == 4 and counts["iron"] == 4:
            return "4-4-4-6"
        if counts["wood"] == 3 and counts["clay"] == 4 and counts["iron"] == 5:
            return "3-4-5-6"
        return "6c"
    return f"{counts['wood']}-{counts['clay']}-{counts['iron']}-{crop_count}"


def parse_dorf1(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    villages = parse_village_list(html)
    active = active_village(villages)
    capital_id = capital_village_id(villages, html)
    resource_fields = parse_resource_fields(soup)
    village_id = active["village_id"] if active else None
    population = (active["population"] if active else 0) or parse_page_population(soup)
    return {
        "village_id": village_id,
        "village_name": active["name"] if active else None,
        "coordinate_x": active["coordinate_x"] if active else None,
        "coordinate_y": active["coordinate_y"] if active else None,
        "population": population,
        "is_capital": bool(
            active
            and (
                active.get("is_capital")
                or (capital_id and active["village_id"] == capital_id)
            )
        ),
        "capital_village_id": capital_id,
        "resources": parse_resources(soup),
        "production": parse_production(soup),
        "resource_fields": resource_fields,
        "village_type": calculate_village_type(resource_fields),
        "troops": [],
        "villages": villages,
    }
