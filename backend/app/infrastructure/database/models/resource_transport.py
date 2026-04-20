"""資源運送相關資料模型."""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount
    from app.infrastructure.database.models.user import User
    from app.infrastructure.database.models.village import Village


class VillageTransportRole(StrEnum):
    """村莊運送角色."""

    SENDER = "sender"  # 運出
    RECEIVER = "receiver"  # 接收
    BOTH = "both"  # 雙向
    DISABLED = "disabled"  # 停用


class TransportMode(StrEnum):
    """運送模式."""

    MANY_TO_ONE = "many_to_one"  # 多對一
    ONE_TO_MANY = "one_to_many"  # 一對多
    AUTO_BALANCE = "auto_balance"  # 自動平衡


class VillageTransportConfig(Base):
    """村莊運送配置."""

    __tablename__ = "village_transport_configs"

    config_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
    )
    village_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="CASCADE"),
        nullable=False,
    )

    # 運送角色
    transport_role: Mapped[VillageTransportRole] = mapped_column(
        SQLEnum(VillageTransportRole),
        nullable=False,
        default=VillageTransportRole.DISABLED,
    )

    # 滿倉時間設定（小時）
    max_full_time_hours: Mapped[int] = mapped_column(
        Integer, nullable=False, default=8, comment="滿倉時間上限（小時）"
    )

    # 保留資源（不運出的最低量）
    reserve_wood: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reserve_clay: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reserve_iron: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reserve_crop: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # 優先順序（數字越小越優先）
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)

    # 是否啟用
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # 時間戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 關聯
    user: Mapped["User"] = relationship("User", back_populates="transport_configs")
    account: Mapped["GameAccount"] = relationship(
        "GameAccount", back_populates="transport_configs"
    )
    village: Mapped["Village"] = relationship(
        "Village", back_populates="transport_config"
    )

    def __repr__(self) -> str:
        return f"<VillageTransportConfig {self.village_id} role={self.transport_role}>"


class TransportSchedule(Base):
    """運送排程配置."""

    __tablename__ = "transport_schedules"

    schedule_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
    )

    # 排程設定
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    interval_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30, comment="運送間隔（分鐘）"
    )
    transport_mode: Mapped[TransportMode] = mapped_column(
        SQLEnum(TransportMode),
        nullable=False,
        default=TransportMode.AUTO_BALANCE,
    )

    # 目標村莊（多對一模式使用）
    target_village_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="SET NULL"),
        nullable=True,
    )

    # 上次執行時間
    last_executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_execute_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 時間戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 關聯
    user: Mapped["User"] = relationship("User", back_populates="transport_schedules")
    account: Mapped["GameAccount"] = relationship(
        "GameAccount", back_populates="transport_schedules"
    )
    target_village: Mapped["Village"] = relationship(
        "Village", foreign_keys=[target_village_id]
    )

    def __repr__(self) -> str:
        return (
            f"<TransportSchedule {self.account_id} interval={self.interval_minutes}m>"
        )


class TransportLog(Base):
    """運送日誌."""

    __tablename__ = "transport_logs"

    log_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
    )

    # 來源與目標
    source_village_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="SET NULL"),
        nullable=True,
    )
    target_village_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="SET NULL"),
        nullable=True,
    )
    # 外部運送用座標
    target_x: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_y: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 運送資源量
    wood: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clay: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    iron: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    crop: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # 運送結果
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 時間戳
    executed_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # 關聯
    user: Mapped["User"] = relationship("User")
    account: Mapped["GameAccount"] = relationship("GameAccount")
    source_village: Mapped["Village"] = relationship(
        "Village", foreign_keys=[source_village_id]
    )
    target_village: Mapped["Village"] = relationship(
        "Village", foreign_keys=[target_village_id]
    )

    def __repr__(self) -> str:
        total = self.wood + self.clay + self.iron + self.crop
        return f"<TransportLog {self.source_village_id}->{self.target_village_id} total={total}>"
