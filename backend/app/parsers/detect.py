"""依 URL／HTML／文字判斷頁面類型。"""

from __future__ import annotations

import re

from app.parsers.types import PageType


def detect_page_type(
    *,
    url: str | None = None,
    html: str | None = None,
    text: str | None = None,
    hint: PageType | None = None,
) -> PageType:
    if hint and hint != "unknown":
        return hint

    if url:
        u = url.lower()
        if "dorf1.php" in u:
            return "village_overview"
        if "dorf2.php" in u:
            return "village_center"
        if "build.php" in u and "gid=16" in u:
            return "rally_point"
        if "reports.php" in u or "berichte.php" in u:
            return "reports"
        if "village/statistics/overview" in u:
            return "statistics_overview"
        if "village/statistics/resources" in u:
            return "statistics_resources"
        if "village/statistics/culturepoints" in u:
            return "statistics_culturepoints"
        if "village/statistics/troops" in u or "statistiken.php" in u:
            return "troop_statistics"
        if "village/statistics" in u:
            return "statistics_overview"

    if html:
        low = html.lower()
        if (
            'id="resourcefieldcontainer"' in low
            or 'id="resourceFieldContainer"' in html
        ):
            return "village_overview"
        if 'id="villagecontent"' in low or 'id="village_map"' in low:
            return "village_center"
        if "rallypointoverviewcontainer" in low or (
            'class="gid16' in low and "troop_details" in low
        ):
            return "rally_point"
        if 'id="overview"' in low and "troop_details" not in low:
            # could be statistics overview or reports
            if 'class="vil"' in low or 'td class="vil"' in low:
                return "statistics_overview"
            return "reports"
        if "troop_details" in low:
            return "rally_point"

    if text:
        if re.search(r"來村軍團|出擊軍團|村內部隊|來犯的攻擊", text):
            return "rally_point"
        if re.search(r"木材|泥土|鐵礦|農田", text) and "產量" in text:
            return "village_overview"

    return "unknown"
