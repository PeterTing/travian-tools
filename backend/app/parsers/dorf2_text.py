"""村莊中心（dorf2）純文字解析。

Ctrl+A 純文字通常只有建築等級數字（常連成一串）而沒有 slot/gid，
無法可靠對到 building_id。此模組盡力抽出村莊身分與資源列；
若沒有可存的建築列表，呼叫端應視為不可存入。
"""

from __future__ import annotations

from typing import Any

from app.parsers.dorf1_text import (
    _lines,
    _parse_population,
    _parse_stock,
    _parse_villages,
)


def village_center_is_meaningful(data: dict[str, Any]) -> bool:
    if not isinstance(data, dict):
        return False
    buildings = data.get("buildings") or []
    if buildings:
        return True
    # 純文字若拆不出建築，不算可存
    return False


def parse_dorf2_text(text: str) -> dict[str, Any]:
    lines = [ln for ln in _lines(text or "") if ln]
    resources = _parse_stock(lines)
    population = _parse_population(lines)
    villages = _parse_villages(lines)
    active = villages[0] if villages else None
    village_name = active["name"] if active else None
    coordinate_x = active["coordinate_x"] if active else None
    coordinate_y = active["coordinate_y"] if active else None

    return {
        "village_id": None,
        "travian_village_id": None,
        "village_name": village_name,
        "coordinate_x": coordinate_x,
        "coordinate_y": coordinate_y,
        "population": population,
        "is_capital": bool(active and active.get("is_capital")),
        "capital_village_id": None,
        "resources": resources,
        "buildings": [],  # 純文字無法可靠對 slot
        "troops": [],
        "villages": villages,
        "_text_notes": ["純文字無法對應村莊中心建築欄位，請改貼 HTML 或用擴充上傳"],
    }
