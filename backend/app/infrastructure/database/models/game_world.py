"""遊戲世界（伺服器）資料表 ORM Model（P0-02）.

同一個網站使用者在同一個世界（同一個伺服器網址）的帳號共用一筆世界資料。
目前只放伺服器的 UTC 時差；時間顯示偏好（伺服器時間或本地時間）是每個人
自己的設定，留在 game_accounts。
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount


class GameWorld(Base):
    """遊戲世界：每個網站使用者 × 伺服器網址一筆."""

    __tablename__ = "game_worlds"
    __table_args__ = (
        UniqueConstraint("user_id", "server_url", name="uq_game_worlds_user_server"),
    )

    world_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    # 正規化後的伺服器網址（只有 scheme + host），例如 https://ts3.x1.asia.travian.com
    server_url: Mapped[str] = mapped_column(String(200), nullable=False)
    # 伺服器時間相對 UTC 的分鐘數（例如 UTC+1 = 60）。
    # None = 還不知道：時間照伺服器顯示，不換算。P0-05 會從貼上的頁面自動算。
    utc_offset: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        default=None,
        comment="伺服器時間的 UTC 時差（分鐘）；NULL = 不換算",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    accounts: Mapped[list["GameAccount"]] = relationship(
        "GameAccount",
        back_populates="world",
    )

    def __repr__(self) -> str:
        return f"<GameWorld(world_id={self.world_id}, server_url={self.server_url})>"
