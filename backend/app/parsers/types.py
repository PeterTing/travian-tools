"""共用解析器的輸入／輸出型別。"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

InputKind = Literal["html", "text", "ocr"]
PageType = Literal[
    "village_overview",
    "village_center",
    "rally_point",
    "reports",
    "troop_statistics",
    "statistics_overview",
    "statistics_resources",
    "statistics_culturepoints",
    "statistics_troops",
    "unknown",
]


@dataclass(frozen=True)
class OcrLine:
    """一列 OCR 結果。"""

    text: str
    confidence: float = 1.0


@dataclass
class PageInput:
    """解析輸入。三種入口（擴充 HTML、貼上文字、OCR）共用。"""

    kind: InputKind
    html: str | None = None
    text: str | None = None
    ocr_lines: list[OcrLine] | None = None
    url: str | None = None
    page_type_hint: PageType | None = None
    captured_at: str | None = None  # ISO8601；擴充可帶 #servertime 參考時刻


@dataclass
class ParseWarning:
    """解析警告／原因代碼（P0-07 會擴充）。"""

    code: str
    message: str = ""


@dataclass
class ParseResult:
    """解析結果。data 形狀依 page_type 而定，對齊既有 sync schema 欄位。"""

    page_type: PageType
    data: dict[str, Any] = field(default_factory=dict)
    warnings: list[ParseWarning] = field(default_factory=list)
    server_time: str | None = None
    ok: bool = True
