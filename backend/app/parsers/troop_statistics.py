"""軍隊統計頁（village/statistics/troops）— 對齊擴充 upload body。"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.parsers.html_utils import attr, class_list
from app.parsers.numbers import clean_number


def parse_troop_statistics(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    villages_troops: list[dict] = []
    tables = soup.select("table#troops, table.troops")
    for table in tables:
        header = table.select_one("thead tr") or table.select_one("tr")
        if header is None:
            continue
        unit_ids: list[str] = []
        for cell in header.select("th.unit, th"):
            img = cell.select_one("img.unit")
            if img is None:
                continue
            match = re.search(r"\bu(\d+|hero)\b", attr(img, "class"))
            if match:
                unit_ids.append("hero" if match.group(1) == "hero" else match.group(1))
        if not unit_ids:
            continue
        body_rows = table.select("tbody tr") or table.select("tr")[1:]
        for row in body_rows:
            classes = class_list(row)
            if "sum" in classes or row.select_one("td.empty"):
                continue
            village_cell = row.select_one("td.villageName a") or row.select_one(
                "td a[href*='newdid'], a[href*='newdid']"
            )
            if village_cell is None:
                continue
            href = attr(village_cell, "href")
            mid = re.search(r"newdid=(\d+)", href) or re.search(r"did=(\d+)", href)
            if not mid:
                continue
            village_id = mid.group(1)
            village_name = village_cell.get_text(strip=True)
            cells = row.select("td:not(.villageName)")
            troops: list[dict] = []
            for index, cell in enumerate(cells):
                if index >= len(unit_ids):
                    break
                count = clean_number(cell.get_text())
                if count > 0:
                    troops.append(
                        {
                            "troop_id": f"troop_{unit_ids[index]}",
                            "count": count,
                            "location": "home",
                            "is_training": False,
                        }
                    )
            if troops:
                villages_troops.append(
                    {
                        "village_id": village_id,
                        "village_name": village_name,
                        "troops": troops,
                    }
                )
    return {"villages_troops": villages_troops}
