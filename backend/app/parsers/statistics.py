"""多村總覽（/village/statistics/*）— 轉呼叫既有 StatisticsPageParser。"""

from __future__ import annotations

from app.services.statistics_page_parser import StatisticsPageParser


def parse_statistics_overview(html: str) -> dict:
    return {
        "villages": StatisticsPageParser.parse_overview(html),
        "coordinates": {
            str(k): {"x": v[0], "y": v[1]}
            for k, v in StatisticsPageParser.parse_sidebar_coordinates(html).items()
        },
    }


def parse_statistics_resources(html: str) -> dict:
    return {"villages": StatisticsPageParser.parse_resources(html)}


def parse_statistics_culturepoints(html: str) -> dict:
    return {"villages": StatisticsPageParser.parse_culture_points(html)}


def parse_statistics_troops(html: str) -> dict:
    return {"villages": StatisticsPageParser.parse_troops(html)}
