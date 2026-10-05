"""P0-05 貼上／確認／來襲 Schema."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PastePreviewRequest(BaseModel):
    kind: str = Field("text", description="html | text | ocr")
    html: str | None = None
    text: str | None = None
    url: str | None = None
    page_type_hint: str | None = None
    server_time: str | None = None
    account_id: str | None = None


class PastePreviewResponse(BaseModel):
    ok: bool
    page_type: str
    data: dict[str, Any] = Field(default_factory=dict)
    warnings: list[dict[str, str]] = Field(default_factory=list)
    server_time: str | None = None


class DraftCreateRequest(BaseModel):
    account_id: str
    kind: str = Field("html", description="html | text")
    content: str = Field(..., min_length=1)
    url: str | None = None
    page_type_hint: str | None = None
    server_time: str | None = None
    source: str = Field("paste", description="paste | extension | ocr")


class DraftResponse(BaseModel):
    draft_id: str
    account_id: str
    page_type: str
    source: str
    url: str | None = None
    server_time: str | None = None
    data: dict[str, Any]
    warnings: list[Any] = Field(default_factory=list)
    expires_at: datetime


class ConfirmRequest(BaseModel):
    account_id: str
    page_type: str
    data: dict[str, Any]
    draft_id: str | None = None
    capture_at: datetime | None = None
    server_time: str | None = None
    source: str = "paste"
    village_id: str | None = None
    # 選填：第一次貼上時一併寫入
    time_display: str | None = None
    local_timezone: str | None = None
    utc_offset: int | None = None
    help_improve: bool = False


class ConfirmResponse(BaseModel):
    success: bool
    message: str
    created: int = 0
    updated: int = 0
    total: int = 0
    village_id: str | None = None
    movement_ids: list[str] = Field(default_factory=list)


class MovementResponse(BaseModel):
    movement_id: str
    kind: str
    role: str | None = None
    headline: str | None = None
    coordinate_x: int | None = None
    coordinate_y: int | None = None
    arrival_at: datetime | None = None
    needs_coords: bool = False
    troops: list[Any] = Field(default_factory=list)
    source: str = "paste"


class MovementListResponse(BaseModel):
    movements: list[MovementResponse]
    total: int


class MovementCoordsUpdate(BaseModel):
    coordinate_x: int = Field(..., ge=-400, le=400)
    coordinate_y: int = Field(..., ge=-400, le=400)
