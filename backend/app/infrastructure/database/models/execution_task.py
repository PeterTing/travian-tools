"""執行任務模型."""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount
    from app.infrastructure.database.models.user import User
    from app.infrastructure.database.models.village import Village


class ExecutionType(StrEnum):
    """執行類型."""

    BUILD = "build"  # 建造/升級建築
    TRAIN = "train"  # 訓練部隊
    ADVENTURE = "adventure"  # 英雄冒險
    TRANSPORT = "transport"  # 資源運送
    KEEPALIVE = "keepalive"  # Keep-alive


class ExecutionStatus(StrEnum):
    """執行狀態."""

    PENDING = "pending"  # 待確認
    CONFIRMED = "confirmed"  # 已確認，等待執行
    EXECUTING = "executing"  # 執行中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"  # 失敗
    CANCELLED = "cancelled"  # 已取消


class ExecutionTask(Base):
    """執行任務模型."""

    __tablename__ = "execution_tasks"

    task_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("game_accounts.account_id"), nullable=False
    )
    village_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("villages.village_id"), nullable=True
    )

    # 任務類型與目標
    execution_type: Mapped[ExecutionType] = mapped_column(
        SQLEnum(ExecutionType), nullable=False
    )
    target_id: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # building_id 或 troop_id
    target_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # 建築/兵種名稱
    target_level: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # 目標等級（建築用）
    quantity: Mapped[int] = mapped_column(Integer, default=1)  # 數量（訓練用）
    position: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # 建築位置（建築用）

    # 預估成本
    cost_wood: Mapped[int] = mapped_column(Integer, default=0)
    cost_clay: Mapped[int] = mapped_column(Integer, default=0)
    cost_iron: Mapped[int] = mapped_column(Integer, default=0)
    cost_crop: Mapped[int] = mapped_column(Integer, default=0)
    estimated_duration: Mapped[int] = mapped_column(Integer, default=0)  # 秒

    # 狀態
    status: Mapped[ExecutionStatus] = mapped_column(
        SQLEnum(ExecutionStatus), default=ExecutionStatus.PENDING
    )
    priority: Mapped[int] = mapped_column(
        Integer, default=0
    )  # 優先順序，數字越大越優先

    # 執行結果
    result_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    screenshot_path: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )  # 執行截圖路徑

    # 時間戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 關聯
    user: Mapped["User"] = relationship("User", back_populates="execution_tasks")
    account: Mapped["GameAccount"] = relationship(
        "GameAccount", back_populates="execution_tasks"
    )
    village: Mapped["Village | None"] = relationship(
        "Village", back_populates="execution_tasks"
    )

    def __repr__(self) -> str:
        """字串表示."""
        return f"<ExecutionTask {self.task_id} {self.execution_type.value} {self.status.value}>"


class ExecutionLog(Base):
    """執行日誌模型 - 記錄每次執行的詳細資訊."""

    __tablename__ = "execution_logs"

    log_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("execution_tasks.task_id"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("game_accounts.account_id"), nullable=False
    )
    village_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("villages.village_id"), nullable=True
    )

    # 執行資訊
    execution_type: Mapped[ExecutionType] = mapped_column(
        SQLEnum(ExecutionType), nullable=False
    )
    target_id: Mapped[str] = mapped_column(String(100), nullable=False)
    target_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # 執行參數（JSON 格式）
    parameters: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 結果
    success: Mapped[bool] = mapped_column(default=False)
    result_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    screenshot_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 時間戳
    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # 執行時間（毫秒）

    # 關聯
    task: Mapped["ExecutionTask"] = relationship("ExecutionTask")
    user: Mapped["User"] = relationship("User")
    account: Mapped["GameAccount"] = relationship("GameAccount")
    village: Mapped["Village | None"] = relationship("Village")

    def __repr__(self) -> str:
        """字串表示."""
        return f"<ExecutionLog {self.log_id} {self.execution_type.value} {'OK' if self.success else 'FAIL'}>"
