"""完成事件模型."""

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.infrastructure.database.base import Base


class CompletionEventType(enum.StrEnum):
    """完成事件類型."""

    BUILDING = "building"
    TROOP_TRAINING = "troop_training"


class CompletionEvent(Base):
    """完成事件.

    追蹤建築升級和部隊訓練的完成時間，
    用於在完成時自動觸發村莊資料重新抓取。
    """

    __tablename__ = "completion_events"

    event_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    village_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="CASCADE"),
        index=True,
    )

    event_type: Mapped[CompletionEventType] = mapped_column(
        Enum(CompletionEventType, values_callable=lambda x: [e.value for e in x]),
    )
    description: Mapped[str] = mapped_column(String(200))  # e.g., "Barracks Level 12"

    # 完成時間
    completion_time: Mapped[datetime] = mapped_column(DateTime, index=True)

    # 是否已處理
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False)

    # 時間戳記
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    # 關聯
    village = relationship("Village", back_populates="completion_events")

    def __repr__(self) -> str:
        return (
            f"<CompletionEvent(event_id={self.event_id}, "
            f"type={self.event_type.value}, completes_at={self.completion_time})>"
        )
