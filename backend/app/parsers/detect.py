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
        if re.search(
            r"來村軍團|出擊軍團|村內部隊|來犯的攻擊|集結點|"
            r"派遣部隊|在本村及由本村支配|增援到|搶羊名單",
            text,
        ):
            return "rally_point"
        # zh-TW Legends：木材／磚塊／鋼鐵／穀物；舊譯泥土／鐵礦／農田
        if re.search(r"木材|泥土|磚塊|鐵礦|鋼鐵|農田|穀物", text) and "產量" in text:
            return "village_overview"
        # dorf2 純文字常有忠誠度＋村莊群組、沒有產量／集結點
        if (
            "忠誠度" in text
            and ("村莊群組" in text or "村莊" in text)
            and "產量" not in text
            and "集結點" not in text
        ):
            return "village_center"

    return "unknown"
