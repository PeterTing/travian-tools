"""村莊中心（dorf2.php）HTML 解析。"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.parsers.dorf1 import parse_resources
from app.parsers.html_utils import attr, class_list
from app.parsers.numbers import clean_number
from app.parsers.village_list import (
    active_village,
    capital_village_id,
    parse_village_list,
)


def parse_buildings(soup: BeautifulSoup) -> list[dict]:
    buildings: list[dict] = []
    village_map = soup.select_one("#villageContent") or soup.select_one("#village_map")
    for i in range(19, 41):
        building = soup.select_one(f"#a{i}")
        if building is None:
            building = soup.select_one(f".aid{i}")
        if building is None:
            building = soup.select_one(f"[data-aid='{i}']")
        if building is None and village_map is not None:
            building = village_map.select_one(f".buildingSlot{i}")
        if building is None:
            continue
        label = building.select_one(".labelLayer")
        level = clean_number(label.get_text()) if label else 0
        building_id = "building_0"
        gid = attr(building, "data-gid")
        classes = class_list(building)
        class_str = " ".join(classes)
        if gid and gid != "0":
            building_id = f"building_{gid}"
        else:
            gid_match = re.search(r"gid(\d+)", class_str)
            if gid_match and gid_match.group(1) != "0":
                building_id = f"building_{gid_match.group(1)}"
            else:
                g_match = re.search(r"\bg(\d+)\b", class_str)
                if g_match and g_match.group(1) != "0":
                    building_id = f"building_{g_match.group(1)}"
        is_upgrading = "underConstruction" in class_str or "upgrading" in class_str
        buildings.append(
            {
                "position": i,
                "building_id": building_id,
                "level": level,
                "is_upgrading": is_upgrading,
            }
        )
    return buildings


def parse_dorf2(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    villages = parse_village_list(html)
    active = active_village(villages)
    capital_id = capital_village_id(villages, html)
    return {
        "village_id": active["village_id"] if active else None,
        "village_name": active["name"] if active else None,
        "coordinate_x": active["coordinate_x"] if active else None,
        "coordinate_y": active["coordinate_y"] if active else None,
        "population": active["population"] if active else 0,
        "is_capital": bool(
            active
            and (
                active.get("is_capital")
                or (capital_id and active["village_id"] == capital_id)
                or soup.select_one('[data-gid="26"], .gid26') is not None
            )
        ),
        "capital_village_id": capital_id,
        "buildings": parse_buildings(soup),
        "troops": [],
        "resources": parse_resources(soup),
        "villages": villages,
    }
