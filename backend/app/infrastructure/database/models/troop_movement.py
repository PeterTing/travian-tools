"""集結點部隊移動（來襲／出擊等）."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount


class TroopMovement(Base):
    """集結點一筆部隊移動."""

    __tablename__ = "troop_movements"

    movement_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    village_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, comment="我方村莊 UUID（可空）"
    )
    kind: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        comment="incoming_attack / incoming_raid / outgoing_* / returning / ...",
    )
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    headline: Mapped[str | None] = mapped_column(String(512), nullable=True)
    coordinate_x: Mapped[int | None] = mapped_column(Integer, nullable=True)
    coordinate_y: Mapped[int | None] = mapped_column(Integer, nullable=True)
    arrival_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, index=True, comment="絕對抵達時間（UTC 存庫）"
    )
    arrival_second_key: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
        index=True,
        comment="去重用：抵達那一秒的鍵（YYYY-mm-ddTHH:MM:SS）",
    )
    needs_coords: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0"
    )
    troops_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    source: Mapped[str] = mapped_column(
        String(20),
        default="paste",
        server_default="paste",
        comment="paste / extension / ocr",
    )
    raw_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    account: Mapped[GameAccount] = relationship("GameAccount")
