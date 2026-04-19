"""自動化設定模型（PRD F5 半自動執行系統）.

- AutomationSettings：帳號層的全局自動化開關與反偵測參數
- VillageAutoUpgradeConfig：個別村莊的自動升級啟用設定
- KeepAliveLog：保持登入 / 反偵測的每筆動作紀錄
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.user import User
    from app.infrastructure.database.models.village import Village


class AutomationSettings(Base):
    """使用者層的自動化全局設定."""

    __tablename__ = "automation_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # 反偵測節流
    daily_ops_limit: Mapped[int] = mapped_column(Integer, default=100)
    min_delay_ms: Mapped[int] = mapped_column(Integer, default=1000)
    max_delay_ms: Mapped[int] = mapped_column(Integer, default=5000)
    human_mouse_movement: Mapped[bool] = mapped_column(Boolean, default=True)

    # 執行時段（本地時間 0-23）
    start_hour: Mapped[int] = mapped_column(Integer, default=7)
    end_hour: Mapped[int] = mapped_column(Integer, default=23)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship("User")


class VillageAutoUpgradeConfig(Base):
    """村莊自動升級設定（一村一筆）."""

    __tablename__ = "village_auto_upgrade_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    village_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    # 採用的模板 key，例如 "capital_15c" / "hammer_roman" / ...
    template_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_step: Mapped[int] = mapped_column(Integer, default=0)

    # 模板執行時的動態覆寫（例如跳過某些建築）
    overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    last_action_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

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
        back_populates="auto_upgrade_config",
    )


class KeepAliveLog(Base):
    """反偵測保持登入 / 人類行為模擬的每筆動作紀錄."""

    __tablename__ = "keep_alive_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        index=True,
    )
    account_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    action: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="ok")
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
