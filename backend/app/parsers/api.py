"""共用解析器入口：parse_page(PageInput) -> ParseResult。"""

from __future__ import annotations

from app.parsers.detect import detect_page_type
from app.parsers.dorf1 import parse_dorf1
from app.parsers.dorf2 import parse_dorf2
from app.parsers.rally_point import parse_rally_point_html, parse_rally_point_text
from app.parsers.reports import parse_reports_list
from app.parsers.server_time import parse_server_time
from app.parsers.statistics import (
    parse_statistics_culturepoints,
    parse_statistics_overview,
    parse_statistics_resources,
    parse_statistics_troops,
)
from app.parsers.text_input import ocr_lines_to_text
from app.parsers.troop_statistics import parse_troop_statistics
from app.parsers.types import PageInput, ParseResult, ParseWarning


def parse_page(inp: PageInput) -> ParseResult:
    warnings: list[ParseWarning] = []
    html = inp.html
    text = inp.text

    if inp.kind == "ocr":
        if not inp.ocr_lines:
            return ParseResult(
                page_type="unknown",
                ok=False,
                warnings=[ParseWarning("PARSE_ERROR", "OCR 輸入是空的")],
            )
        text, ocr_warnings = ocr_lines_to_text(inp.ocr_lines)
        warnings.extend(ocr_warnings)
    elif inp.kind == "text":
        text = text or ""
    elif inp.kind == "html":
        html = html or ""
    else:
        return ParseResult(
            page_type="unknown",
            ok=False,
            warnings=[ParseWarning("PARSE_ERROR", f"不支援的 kind: {inp.kind}")],
        )

    if inp.kind in ("text", "ocr") and not (text or "").strip():
        return ParseResult(
            page_type="unknown",
            ok=False,
            warnings=[ParseWarning("PARSE_ERROR", "輸入是空的")],
        )
    if inp.kind == "html" and not (html or "").strip():
        return ParseResult(
            page_type="unknown",
            ok=False,
            warnings=[ParseWarning("PARSE_ERROR", "輸入是空的")],
        )

    page_type = detect_page_type(
        url=inp.url, html=html, text=text, hint=inp.page_type_hint
    )
    server_time = parse_server_time(html) if html else None

    try:
        if inp.kind == "html":
            data = _parse_html(page_type, html or "")
        else:
            data = _parse_text(page_type, text or "")
    except Exception as exc:  # noqa: BLE001 — 解析失敗回傳原因碼
        return ParseResult(
            page_type=page_type,
            ok=False,
            server_time=server_time,
            warnings=warnings + [ParseWarning("PARSE_ERROR", f"解析失敗：{exc}")],
        )

    if page_type == "unknown":
        warnings.append(ParseWarning("PARSE_ERROR", "認不出頁面類型"))
        return ParseResult(
            page_type=page_type,
            data=data,
            warnings=warnings,
            server_time=server_time,
            ok=False,
        )

    return ParseResult(
        page_type=page_type,
        data=data,
        warnings=warnings,
        server_time=server_time or data.get("server_time"),
        ok=True,
    )


def _parse_html(page_type: str, html: str) -> dict:
    if page_type == "village_overview":
        return parse_dorf1(html)
    if page_type == "village_center":
        return parse_dorf2(html)
    if page_type == "rally_point":
        return parse_rally_point_html(html)
    if page_type == "reports":
        return parse_reports_list(html)
    if page_type == "troop_statistics":
        return parse_troop_statistics(html)
    if page_type == "statistics_overview":
        return parse_statistics_overview(html)
    if page_type == "statistics_resources":
        return parse_statistics_resources(html)
    if page_type == "statistics_culturepoints":
        return parse_statistics_culturepoints(html)
    if page_type == "statistics_troops":
        return parse_statistics_troops(html)
    return {}


def _parse_text(page_type: str, text: str) -> dict:
    # P0-03：文字路徑先支援集結點與多村總覽表格（以 tab／空白分隔的列）。
    # dorf1／dorf2 的貼上文字留待 P0-05 與 PM 確認格式。
    if page_type == "rally_point" or page_type == "unknown":
        result = parse_rally_point_text(text)
        if (
            result["movements"]
            or result["garrison_own"]
            or result["garrison_stationed"]
        ):
            return result
    if page_type.startswith("statistics_") or page_type == "troop_statistics":
        # 粗解析：多村資源文字表（名稱 + 四個數字）
        return {"raw_text": text, "villages": _parse_resource_text_table(text)}
    return {"raw_text": text}


def _parse_resource_text_table(text: str) -> list[dict]:
    import re

    villages: list[dict] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("Sum"):
            continue
        # Name  123  456  789  012  或 Name 12/20
        m = re.match(
            r"^(\S.+?)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\b",
            line,
        )
        if m:
            villages.append(
                {
                    "name": m.group(1).strip(),
                    "wood": int(m.group(2).replace(",", "")),
                    "clay": int(m.group(3).replace(",", "")),
                    "iron": int(m.group(4).replace(",", "")),
                    "crop": int(m.group(5).replace(",", "")),
                }
            )
    return villages
