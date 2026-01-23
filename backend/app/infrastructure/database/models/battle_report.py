"""戰鬥報告資料表 ORM Model."""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount


class ReportType(str, Enum):
    """戰鬥報告類型."""

    ATTACK = "attack"
    DEFENSE = "defense"
    SCOUT = "scout"
    REINFORCEMENT = "reinforcement"


class BattleResult(str, Enum):
    """戰鬥結果."""

    ATTACKER_WIN = "attacker_win"
    DEFENDER_WIN = "defender_win"
    DRAW = "draw"


class BattleReport(Base):
    """戰鬥報告資料表.

    儲存戰鬥報告詳細資訊，包含進攻方/防守方部隊、損失與戰利品。
    """

    __tablename__ = "battle_reports"

    report_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
    )
    report_type: Mapped[ReportType] = mapped_column(
        String(20),
        nullable=False,
        comment="報告類型",
    )
    battle_time: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        comment="戰鬥發生時間",
    )
    attacker_troops: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="進攻方部隊配置 JSON",
    )
    defender_troops: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="防守方部隊配置 JSON",
    )
    attacker_losses: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="進攻方損失 JSON",
    )
    defender_losses: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="防守方損失 JSON",
    )
    result: Mapped[BattleResult | None] = mapped_column(
        String(20),
        nullable=True,
        comment="戰鬥結果",
    )
    resources_stolen: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="掠奪資源 JSON",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    # Relationships
    game_account: Mapped["GameAccount"] = relationship(
        "GameAccount",
        back_populates="battle_reports",
    )

    def __repr__(self) -> str:
        return f"<BattleReport(report_id={self.report_id}, type={self.report_type}, result={self.result})>"
