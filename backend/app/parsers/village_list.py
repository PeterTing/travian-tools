"""側欄村莊列表。"""

from __future__ import annotations

from bs4 import BeautifulSoup

from app.parsers.html_utils import attr, class_list
from app.parsers.numbers import clean_number, parse_coordinate_text


def parse_page_population(html_or_soup: str | BeautifulSoup) -> int:
    """頁面側欄／資訊列的「人口：N」（dorf1／dorf2 都有；村莊列表列上常常沒有）。"""
    soup = (
        html_or_soup
        if isinstance(html_or_soup, BeautifulSoup)
        else BeautifulSoup(html_or_soup or "", "html.parser")
    )
    el = soup.select_one("div.population span") or soup.select_one("div.population")
    if el is None:
        return 0
    return clean_number(el.get_text())


def parse_village_list(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    villages: list[dict] = []
    for entry in soup.select(".villageList .listEntry.village"):
        did = attr(entry, "data-did")
        name_el = entry.select_one(".name")
        if not did or name_el is None:
            continue
        x_el = entry.select_one(".coordinateX")
        y_el = entry.select_one(".coordinateY")
        pop_el = entry.select_one(".inhabitants, .population, .pop")
        population = 0
        if pop_el is not None:
            digits = "".join(c for c in pop_el.get_text() if c.isdigit())
            population = int(digits) if digits else 0
        classes = class_list(entry)
        is_capital = (
            "capital" in classes
            or "mainVillage" in classes
            or entry.select_one(
                '.capital, .capitalIcon, .isCapital, [class*="capital"]'
            )
            is not None
        )
        villages.append(
            {
                "village_id": did,
                "name": name_el.get_text(strip=True),
                "coordinate_x": parse_coordinate_text(x_el.get_text() if x_el else ""),
                "coordinate_y": parse_coordinate_text(y_el.get_text() if y_el else ""),
                "is_active": "active" in classes,
                "is_capital": is_capital,
                "population": population,
            }
        )
    return villages


def active_village(villages: list[dict]) -> dict | None:
    for v in villages:
        if v.get("is_active"):
            return v
    return villages[0] if villages else None


def capital_village_id(villages: list[dict], html: str = "") -> str | None:
    for v in villages:
        if v.get("is_capital"):
            return str(v["village_id"])
    # Palace on current page → active village is capital
    soup = BeautifulSoup(html or "", "html.parser")
    if soup.select_one('[data-gid="26"], .gid26'):
        active = active_village(villages)
        if active:
            return str(active["village_id"])
    return None
