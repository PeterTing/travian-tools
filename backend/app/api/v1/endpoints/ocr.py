"""截圖辨識（P0-07）：集結點截圖 → 預覽；座標欄位旁的相機按鈕 → 座標候選。

只預覽、不存。存入走 ``POST /paste/confirm``（source=ocr）。
失敗一律明確回錯誤碼（``{"code", "message"}``），不會回空白成功。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, DBSession
from app.services.ocr_service import OcrFailure, OcrService

router = APIRouter(prefix="/ocr", tags=["ocr"])

_READ_LIMIT = 16 * 1024 * 1024  # 讀進記憶體的硬上限；細的上限在 service 驗


class OcrRallyResponse(BaseModel):
    ok: bool
    page_type: str
    data: dict[str, Any]
    warnings: list[dict[str, Any]]
    server_time: str | None = None
    ocr: dict[str, Any]


class OcrCoordsResponse(BaseModel):
    ok: bool
    candidates: list[dict[str, Any]]
    image: dict[str, Any]


class OcrError(BaseModel):
    code: str
    message: str


def _error(exc: OcrFailure) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": {"code": exc.code, "message": exc.message}},
    )


def _read(upload: UploadFile) -> tuple[bytes, str | None]:
    data = upload.file.read(_READ_LIMIT + 1)
    return data, upload.content_type


_ERRORS: dict[int | str, dict[str, Any]] = {
    code: {"model": OcrError} for code in (400, 403, 413, 415, 422, 429, 503)
}


@router.post(
    "/rally",
    response_model=OcrRallyResponse,
    responses=_ERRORS,
    summary="集結點截圖辨識（預覽，不存）",
)
def ocr_rally(
    db: DBSession,
    current_user: CurrentUser,
    account_id: str = Form(...),
    images: list[UploadFile] = File(...),
) -> Any:
    try:
        return OcrService(db).recognize_rally(
            current_user.user_id, account_id, [_read(u) for u in images]
        )
    except OcrFailure as exc:
        return _error(exc)


@router.post(
    "/coords",
    response_model=OcrCoordsResponse,
    responses=_ERRORS,
    summary="從截圖讀座標（座標欄位旁的相機按鈕）",
)
def ocr_coords(
    db: DBSession,
    current_user: CurrentUser,
    image: UploadFile = File(...),
) -> Any:
    try:
        return OcrService(db).recognize_coords(current_user.user_id, _read(image))
    except OcrFailure as exc:
        return _error(exc)
