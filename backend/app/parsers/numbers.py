"""數字與座標清理（處理 Travian 的方向控制字元與 U+2212 負號）。"""

from __future__ import annotations

import re

_BIDI = re.compile(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069]")


def strip_bidi(text: str) -> str:
    return _BIDI.sub("", text or "")


def clean_number(text: str) -> int:
    """非負整數；逗號千分位與方向控制字元會去掉。負數回 0（統計頁用）。"""
    cleaned = (
        strip_bidi(text)
        .replace(",", "")
        .replace("\u2212", "-")
        .replace("−", "-")
        .strip()
    )
    return int(cleaned) if cleaned.isdigit() else 0


def parse_signed_int(text: str) -> int:
    """有正負號的整數（例如糧食淨產量「−320/h」）。"""
    s = strip_bidi(str(text or ""))
    first_digit = re.search(r"\d", s)
    if not first_digit:
        return 0
    negative = bool(re.search(r"[-\u2212−]", s[: first_digit.start()]))
    value = int(re.sub(r"\D", "", s) or "0")
    return -value if negative else value


def parse_coordinate_text(text: str) -> int:
    """座標單一軸：處理 U+2212 與括號。"""
    if not text:
        return 0
    normalized = (
        strip_bidi(text)
        .replace("\u2212", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("−", "-")
    )
    normalized = re.sub(r"[^\d-]", "", normalized)
    try:
        return int(normalized) if normalized not in ("", "-", "--") else 0
    except ValueError:
        return 0


def parse_merchants(text: str) -> tuple[int, int]:
    """Parse '20/20' into (used, total)."""
    cleaned = strip_bidi(text).strip()
    match = re.search(r"(\d+)\s*/\s*(\d+)", cleaned)
    if match:
        return int(match.group(1)), int(match.group(2))
    return 0, 0


def parse_coords_pair(text: str) -> tuple[int, int] | None:
    clean = strip_bidi(text).replace("\u2212", "-").replace("−", "-")
    match = re.search(r"\(\s*(-?\d+)\s*\|\s*(-?\d+)\s*\)", clean)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None
