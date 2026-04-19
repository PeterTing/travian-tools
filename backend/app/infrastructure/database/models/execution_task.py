"""半自動執行任務模型（PRD F5.1 操作佇列）.

每筆 ExecutionTask 代表一個待使用者確認並執行的遊戲內動作（升級建築 / 訓練兵
/ 英雄出冒險 / 執行農場清單等）。ExecutionLog 保存每次嘗試的歷史。
"""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.village import Village


class ExecutionType(StrEnum):
    """執行任務類型."""

    BUILDING = "building"
    TRAINING = "training"
    ADVENTURE = "adventure"
    FARM = "farm"
    TRANSPORT = "transport"


class ExecutionStatus(StrEnum):
    """執行任務狀態."""

    PENDING = "pending"
    APPROVED = "approved"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExecutionTask(Base):
    """待執行的遊戲操作任務."""

    __tablename__ = "execution_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    village_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="CASCADE"),
        index=True,
    )

    task_type: Mapped[ExecutionType] = mapped_column(
        SQLEnum(ExecutionType, native_enum=False, length=32),
        index=True,
    )
    status: Mapped[ExecutionStatus] = mapped_column(
        SQLEnum(ExecutionStatus, native_enum=False, length=32),
        default=ExecutionStatus.PENDING,
        index=True,
    )

    # 例如：{"gid": 15, "target_level": 20} or {"troop_id": "praetorian", "count": 50}
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)

    # 預計執行時間；None 代表「資源到就立刻執行」
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    executed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    priority: Mapped[int] = mapped_column(Integer, default=0, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    village: Mapped["Village"] = relationship(
        "Village",
        back_populates="execution_tasks",
    )
    logs: Mapped[list["ExecutionLog"]] = relationship(
        "ExecutionLog",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<ExecutionTask(id={self.id}, type={self.task_type}, "
            f"status={self.status})>"
        )


class ExecutionLog(Base):
    """單一執行嘗試的歷史紀錄."""

    __tablename__ = "execution_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    task_id: Mapped[int] = mapped_column(
        ForeignKey("execution_tasks.id", ondelete="CASCADE"),
        index=True,
    )

    event: Mapped[str] = mapped_column(String(64))
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    task: Mapped[ExecutionTask] = relationship("ExecutionTask", back_populates="logs")

    def __repr__(self) -> str:
        return f"<ExecutionLog(task_id={self.task_id}, event={self.event})>"
