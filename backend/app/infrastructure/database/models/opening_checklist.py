"""開局攻略清單的勾選進度（P0-10）.

每一筆是「某個帳號、在某個世界、某個攻略，勾了某一步」。取消勾選就刪掉那一筆，
所以重複勾、重複取消都不會多出資料（冪等）。
世界跟著帳號當下的世界走：帳號改到別的伺服器，進度就是那個世界自己的一份。
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class OpeningChecklistProgress(Base):
    """開局攻略清單：勾掉的步驟（帳號 × 世界 × 攻略 × 步驟）."""

    __tablename__ = "opening_checklist_progress"
    __table_args__ = (
        UniqueConstraint(
            "account_id",
            "world_id",
            "strategy",
            "step_id",
            name="uq_opening_checklist_step",
        ),
    )

    progress_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
    )
    world_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_worlds.world_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    strategy: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="攻略代碼，例如 4p-farm、3p-sim"
    )
    step_id: Mapped[str] = mapped_column(
        String(16), nullable=False, comment="步驟代碼（Excel 列號，例如 r016）"
    )
    checked_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<OpeningChecklistProgress(account_id={self.account_id}, "
            f"strategy={self.strategy}, step_id={self.step_id})>"
        )
