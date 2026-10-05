"""解析草稿：擴充／貼上確認前暫存."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class ParseDraft(Base):
    """確認前暫存的解析結果（含原始內容，到期刪）."""

    __tablename__ = "parse_drafts"

    draft_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[str] = mapped_column(String(36), nullable=False)
    page_type: Mapped[str] = mapped_column(String(40), nullable=False)
    source: Mapped[str] = mapped_column(
        String(20), default="paste", server_default="paste"
    )
    url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    server_time: Mapped[str | None] = mapped_column(String(32), nullable=True)
    raw_kind: Mapped[str] = mapped_column(
        String(10), default="html", server_default="html"
    )
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    warnings_json: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
