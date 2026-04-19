"""建造/訓練完成事件模型.

每次同步時若偵測到「某個建造或訓練在上次同步後完成」即寫入一筆 CompletionEvent。
`reminder.py` 的推播規則會消費此事件。
"""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.village import Village


class CompletionEventType(StrEnum):
    """完成事件類型."""

    BUILDING = "building"
    TRAINING = "training"
    RESEARCH = "research"
    HERO_ADVENTURE = "hero_adventure"


class CompletionEvent(Base):
    """完成事件模型."""

    __tablename__ = "completion_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    village_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="CASCADE"),
        index=True,
    )
    event_type: Mapped[CompletionEventType] = mapped_column(
        SQLEnum(CompletionEventType, native_enum=False, length=32),
        index=True,
    )

    # 事件相關的補充資訊（如建築名稱、部隊兵種/數量等）
    detail: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    label: Mapped[str | None] = mapped_column(String(128), nullable=True)

    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    village: Mapped["Village"] = relationship(
        "Village",
        back_populates="completion_events",
    )

    def __repr__(self) -> str:
        return (
            f"<CompletionEvent(village_id={self.village_id}, "
            f"type={self.event_type}, processed={self.is_processed})>"
        )
