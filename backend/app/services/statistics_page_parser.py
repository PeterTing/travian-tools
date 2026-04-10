"""Parse Travian /village/statistics/* pages.

Extracts all village data from 4 statistics pages in a single sync.
This replaces per-village scraping (N*4 page loads -> 4 page loads).
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup


class StatisticsPageParser:
    """Parse Travian village statistics HTML pages."""

    @staticmethod
    def _clean_number(text: str) -> int:
        """Clean number text: remove commas, Unicode marks, whitespace."""
        cleaned = (
            text.replace("\u202d", "").replace("\u202c", "").replace(",", "").strip()
        )
        return int(cleaned) if cleaned.isdigit() else 0

    @staticmethod
    def _parse_merchants(text: str) -> tuple[int, int]:
        """Parse merchant text like '20/20' into (used, total).

        Handles Unicode directional marks embedded in the text.
        """
        cleaned = (
            text.replace("\u202d", "")
            .replace("\u202c", "")
            .replace("\u200e", "")
            .strip()
        )
        match = re.search(r"(\d+)\s*/\s*(\d+)", cleaned)
        if match:
            return int(match.group(1)), int(match.group(2))
        return 0, 0

    @staticmethod
    def parse_overview(html: str) -> list[dict]:
        """Parse /village/statistics/overview.

        Returns list of dicts with:
            travian_village_id, name, has_attack, is_building,
            merchants_used, merchants_total
        """
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table", id="overview")
        if not table:
            return []

        results: list[dict] = []
        rows = table.find_all("tr")

        for row in rows[1:]:  # skip header
            vil_td = row.find("td", class_="vil")
            if not vil_td:
                continue
            link = vil_td.find("a")
            if not link:
                continue

            name = link.get_text(strip=True)
            href = link.get("href", "")
            vid_match = re.search(r"newdid=(\d+)", href)
            travian_village_id = int(vid_match.group(1)) if vid_match else 0

            # Attack detection from td.att:
            # img.att1 = incoming enemy attack (被攻擊)
            # img.att2 = own troops attacking (自己出征)
            # img.def1 = arriving reinforcements (援軍到達)
            # img.def2 = own reinforcements out (援軍外出)
            # Only att1 means the village is being attacked
            att_td = row.find("td", class_="att")
            has_attack = False
            has_outgoing_attack = False
            if att_td:
                for img in att_td.find_all("img"):
                    img_classes = img.get("class", [])
                    if "att1" in img_classes:
                        has_attack = True
                    if "att2" in img_classes:
                        has_outgoing_attack = True

            # Building: check if there's a link (active building) in td.bui
            bui_td = row.find("td", class_="bui")
            is_building = bui_td is not None and bui_td.find("a") is not None

            # Merchants: parse "used/total" from td.tra
            tra_td = row.find("td", class_="tra")
            merchants_used, merchants_total = 0, 0
            if tra_td:
                merchants_used, merchants_total = StatisticsPageParser._parse_merchants(
                    tra_td.get_text()
                )

            results.append(
                {
                    "travian_village_id": travian_village_id,
                    "name": name,
                    "has_attack": has_attack,
                    "has_outgoing_attack": has_outgoing_attack,
                    "is_building": is_building,
                    "merchants_used": merchants_used,
                    "merchants_total": merchants_total,
                }
            )

        return results

    @staticmethod
    def parse_sidebar_coordinates(html: str) -> dict[int, tuple[int, int]]:
        """Parse village coordinates from the sidebar village list.

        The sidebar is present on every Travian page and contains
        .listEntry.village elements with data-did and coordinate text.

        Returns dict mapping travian_village_id -> (x, y).
        """
        soup = BeautifulSoup(html, "html.parser")
        coords: dict[int, tuple[int, int]] = {}

        for entry in soup.select(".listEntry.village"):
            did = entry.get("data-did", "")
            if not did:
                continue
            # Clean text and extract coordinates like (-47|144)
            text = entry.get_text()
            clean = (
                text.replace("\u202d", "")
                .replace("\u202c", "")
                .replace("\u202a", "")
                .replace("\u202b", "")
                .replace("\u2212", "-")
                .replace("−", "-")
            )
            coord_match = re.search(r"\(\s*(-?\d+)\s*\|\s*(-?\d+)\s*\)", clean)
            if coord_match:
                coords[int(did)] = (
                    int(coord_match.group(1)),
                    int(coord_match.group(2)),
                )

        return coords

    @staticmethod
    def parse_resources(html: str) -> list[dict]:
        """Parse /village/statistics/resources.

        Returns list of dicts with:
            name, wood, clay, iron, crop, merchants_used, merchants_total
        """
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")
        if not table:
            return []

        results: list[dict] = []
        rows = table.find_all("tr")

        for row in rows[1:]:  # skip header
            # Skip sum rows
            row_classes = row.get("class", [])
            if "sum" in row_classes:
                continue

            cells = row.find_all("td")

            # Skip empty rows (single td with class "empty" and colspan)
            if len(cells) == 1:
                continue

            # Need at least 6 cells: name, wood, clay, iron, crop, merchants
            if len(cells) < 6:
                continue

            vil_td = cells[0]
            name = vil_td.get_text(strip=True)
            if not name:
                continue

            wood = StatisticsPageParser._clean_number(cells[1].get_text())
            clay = StatisticsPageParser._clean_number(cells[2].get_text())
            iron = StatisticsPageParser._clean_number(cells[3].get_text())
            crop = StatisticsPageParser._clean_number(cells[4].get_text())

            tra_td = cells[5]
            merchants_used, merchants_total = StatisticsPageParser._parse_merchants(
                tra_td.get_text()
            )

            results.append(
                {
                    "name": name,
                    "wood": wood,
                    "clay": clay,
                    "iron": iron,
                    "crop": crop,
                    "merchants_used": merchants_used,
                    "merchants_total": merchants_total,
                }
            )

        return results

    @staticmethod
    def parse_culture_points(html: str) -> list[dict]:
        """Parse /village/statistics/culturepoints.

        Returns list of dicts with:
            name, cp_per_day, celebration_active, slots_used, slots_total
        """
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")
        if not table:
            return []

        results: list[dict] = []
        rows = table.find_all("tr")

        for row in rows[1:]:  # skip header
            row_classes = row.get("class", [])
            if "sum" in row_classes:
                continue

            cells = row.find_all("td")
            if len(cells) == 1:
                continue
            if len(cells) < 5:
                continue

            vil_td = cells[0]
            name = vil_td.get_text(strip=True)
            if not name:
                continue

            cp_per_day = StatisticsPageParser._clean_number(cells[1].get_text())

            # Celebration: active if there's a link (with dot or timer), inactive if span.none
            cel_td = cells[2]
            celebration_active = False
            if cel_td:
                # Active: has <a> with <span class="dot"> or <span class="timer">
                has_link = cel_td.find("a") is not None
                none_span = cel_td.find("span", class_="none")
                celebration_active = has_link and none_span is None

            # Slots: parse "used/total"
            slo_td = cells[4]
            slots_used, slots_total = StatisticsPageParser._parse_merchants(
                slo_td.get_text()
            )

            results.append(
                {
                    "name": name,
                    "cp_per_day": cp_per_day,
                    "celebration_active": celebration_active,
                    "slots_used": slots_used,
                    "slots_total": slots_total,
                }
            )

        return results

    @staticmethod
    def parse_troops(html: str) -> list[dict]:
        """Parse /village/statistics/troops.

        Returns list of dicts with:
            name, troops (dict of troop_name -> count), total_troops
        """
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")
        if not table:
            return []

        # Extract troop names from header row th > img[alt]
        header_row = table.find("tr")
        if not header_row:
            return []

        troop_names: list[str] = []
        ths = header_row.find_all("th")
        for th in ths[1:]:  # skip first th (village name column)
            img = th.find("img")
            if img and img.get("alt"):
                troop_names.append(img["alt"])

        results: list[dict] = []
        rows = table.find_all("tr")

        for row in rows[1:]:  # skip header
            row_classes = row.get("class", [])
            if "sum" in row_classes:
                continue

            cells = row.find_all("td")

            # Skip empty rows
            if len(cells) == 1:
                continue
            if len(cells) < 2:
                continue

            vil_td = cells[0]
            name = vil_td.get_text(strip=True)
            if not name:
                continue

            troops: dict[str, int] = {}
            total = 0
            for j, troop_name in enumerate(troop_names):
                if j + 1 < len(cells):
                    count = StatisticsPageParser._clean_number(cells[j + 1].get_text())
                    troops[troop_name] = count
                    total += count

            results.append(
                {
                    "name": name,
                    "troops": troops,
                    "total_troops": total,
                }
            )

        return results

    @staticmethod
    def merge_all(
        overview: list[dict],
        resources: list[dict],
        culture_points: list[dict],
        troops: list[dict],
        coordinates: dict[int, tuple[int, int]] | None = None,
    ) -> list[dict]:
        """Merge data from all 4 pages by village name.

        Uses overview as the base (it has village IDs). Resources, culture
        points, and troops are merged in by matching village name.

        Returns list of complete village dicts.
        """
        # Build lookup dicts by village name
        resources_by_name = {v["name"]: v for v in resources}
        cp_by_name = {v["name"]: v for v in culture_points}
        troops_by_name = {v["name"]: v for v in troops}

        merged: list[dict] = []
        for village in overview:
            name = village["name"]
            record = dict(village)  # copy overview data

            # Merge resources
            res = resources_by_name.get(name, {})
            record["wood"] = res.get("wood", 0)
            record["clay"] = res.get("clay", 0)
            record["iron"] = res.get("iron", 0)
            record["crop"] = res.get("crop", 0)
            # Prefer resource page merchants (they may be more up-to-date)
            if res:
                record["merchants_used"] = res.get(
                    "merchants_used", record["merchants_used"]
                )
                record["merchants_total"] = res.get(
                    "merchants_total", record["merchants_total"]
                )

            # Merge culture points
            cp = cp_by_name.get(name, {})
            record["cp_per_day"] = cp.get("cp_per_day", 0)
            record["celebration_active"] = cp.get("celebration_active", False)
            record["slots_used"] = cp.get("slots_used", 0)
            record["slots_total"] = cp.get("slots_total", 0)

            # Merge troops
            trp = troops_by_name.get(name, {})
            record["troops"] = trp.get("troops", {})
            record["total_troops"] = trp.get("total_troops", 0)

            # Merge coordinates from sidebar
            if coordinates:
                vid = record.get("travian_village_id", 0)
                if vid in coordinates:
                    record["coordinate_x"] = coordinates[vid][0]
                    record["coordinate_y"] = coordinates[vid][1]

            merged.append(record)

        return merged
