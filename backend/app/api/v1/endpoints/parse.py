"""解析預覽 API（不存檔）。"""

from fastapi import APIRouter

from app.core.dependencies import CurrentUser
from app.domain.schemas.sync import ParseRequest, ParseResponse
from app.parsers import PageInput, parse_page
from app.parsers.types import OcrLine, PageType

router = APIRouter(prefix="/parse", tags=["parse"])


@router.post(
    "",
    response_model=ParseResponse,
    summary="預覽解析",
    description="擴充 HTML／貼上文字／OCR 共用解析器；只回結果，不寫入資料庫",
)
def parse_preview(
    data: ParseRequest,
    current_user: CurrentUser,
) -> ParseResponse:
    """預覽解析（P0-05 確認畫面會用）。"""
    _ = current_user
    hint: PageType | None = None
    if data.page_type_hint in (
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
    ):
        hint = data.page_type_hint  # type: ignore[assignment]

    ocr_lines = None
    if data.ocr_lines:
        ocr_lines = [
            OcrLine(
                text=str(line.get("text") or ""),
                confidence=float(line.get("confidence") or 1.0),
            )
            for line in data.ocr_lines
        ]

    kind = data.kind if data.kind in ("html", "text", "ocr") else "html"
    result = parse_page(
        PageInput(
            kind=kind,  # type: ignore[arg-type]
            html=data.html,
            text=data.text,
            ocr_lines=ocr_lines,
            url=data.url,
            page_type_hint=hint,
        )
    )
    return ParseResponse(
        ok=result.ok,
        page_type=result.page_type,
        data=result.data,
        warnings=[{"code": w.code, "message": w.message} for w in result.warnings],
        server_time=result.server_time,
    )
