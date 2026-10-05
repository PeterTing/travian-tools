"""解析預覽 API（不存檔）。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.sync import ParseRequest, ParseResponse
from app.parsers import PageInput, parse_page
from app.parsers.types import OcrLine, PageType
from app.services.paste_service import MAX_RAW_BYTES, PasteService

router = APIRouter(prefix="/parse", tags=["parse"])


@router.post(
    "",
    response_model=ParseResponse,
    summary="預覽解析",
    description="擴充 HTML／貼上文字／OCR 共用解析器；只回結果，不寫入資料庫。需完整網站登入。",
)
def parse_preview(
    data: ParseRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> ParseResponse:
    """預覽解析（P0-05 確認畫面會用）。"""
    _ = current_user
    raw = data.html or data.text or ""
    if data.ocr_lines:
        raw = "\n".join(str(line.get("text") or "") for line in data.ocr_lines)
    if len(raw.encode("utf-8")) > MAX_RAW_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="內容太大，請少貼一點再試",
        )

    kind = data.kind if data.kind in ("html", "text", "ocr") else "html"
    if kind == "ocr" and data.ocr_lines:
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
        ocr_lines = [
            OcrLine(
                text=str(line.get("text") or ""),
                confidence=float(line.get("confidence") or 1.0),
            )
            for line in data.ocr_lines
        ]
        result = parse_page(
            PageInput(
                kind="ocr",
                ocr_lines=ocr_lines,
                url=data.url,
                page_type_hint=hint,
                captured_at=data.server_time,
            )
        )
        return ParseResponse(
            ok=result.ok,
            page_type=result.page_type,
            data=result.data,
            warnings=[{"code": w.code, "message": w.message} for w in result.warnings],
            server_time=result.server_time or data.server_time,
        )

    preview = PasteService(db).parse_and_preview(
        kind=kind,
        html=data.html,
        text=data.text,
        url=data.url,
        page_type_hint=data.page_type_hint,
        server_time=data.server_time,
    )
    return ParseResponse(
        ok=bool(preview["ok"]),
        page_type=str(preview["page_type"]),
        data=dict(preview.get("data") or {}),
        warnings=list(preview.get("warnings") or []),
        server_time=preview.get("server_time"),
    )
