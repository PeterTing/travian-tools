"""村莊同步任務模型."""

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.infrastructure.database.base import Base


class SyncTaskStatus(enum.StrEnum):
    """同步任務狀態."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class VillageSyncTask(Base):
    """村莊同步任務.

    追蹤背景同步任務的執行狀態和進度。
    """

    __tablename__ = "village_sync_tasks"

    task_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        index=True,
    )
    server_url: Mapped[str] = mapped_column(String(200))

    status: Mapped[SyncTaskStatus] = mapped_column(
        Enum(SyncTaskStatus, values_callable=lambda x: [e.value for e in x]),
        default=SyncTaskStatus.PENDING,
    )

    # 進度追蹤
    total_villages: Mapped[int] = mapped_column(Integer, default=0)
    synced_villages: Mapped[int] = mapped_column(Integer, default=0)
    current_village_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 時間戳記
    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 錯誤訊息
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 關聯
    account = relationship("GameAccount", back_populates="sync_tasks")

    @property
    def progress_percent(self) -> int:
        """計算進度百分比."""
        if self.total_villages == 0:
            return 0
        return int((self.synced_villages / self.total_villages) * 100)

    def __repr__(self) -> str:
        return f"<VillageSyncTask(task_id={self.task_id}, status={self.status.value})>"
