"""報告列表解析。"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.parsers.html_utils import class_list


def parse_reports_list(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    reports: list[dict] = []
    rows = soup.select(".reports tr, #overview table tr, .report-list tr")
    if not rows:
        rows = soup.select("table#overview tr")
    for row in rows:
        if row.select_one("th"):
            continue
        link = row.select_one('a[href*="berichte.php"], a[href*="reports.php"]')
        if link is None:
            continue
        href = link.get("href") or ""
        if not isinstance(href, str):
            href = " ".join(href)
        mid = re.search(r"id=(\d+)", href)
        if not mid:
            continue
        classes = class_list(row)
        report_type = "unknown"
        icon = row.select_one('.iReport, .reportIcon, [class*="report"]')
        if icon is not None:
            icon_class = " ".join(class_list(icon))
            if "attack" in icon_class or "del1" in icon_class:
                report_type = "attack_incoming"
            elif "defense" in icon_class or "del2" in icon_class:
                report_type = "defense"
            elif "spy" in icon_class or "del3" in icon_class:
                report_type = "spy"
            elif "trade" in icon_class or "del4" in icon_class:
                report_type = "trade"
            elif "reinforce" in icon_class or "del5" in icon_class:
                report_type = "reinforcement"
            elif "adventure" in icon_class:
                report_type = "adventure"
        dat = row.select_one("td.dat, .dat, .time, td:last-child")
        is_read = "new" not in classes and row.select_one(".newMessage") is None
        reports.append(
            {
                "report_id": mid.group(1),
                "report_type": report_type,
                "title": link.get_text(strip=True),
                "timestamp": dat.get_text(strip=True) if dat else None,
                "is_read": is_read,
                "url": href,
            }
        )
    return {"reports": reports}
