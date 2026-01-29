"""add_server_start_date_to_game_accounts

Revision ID: 5eafa046e80d
Revises: ce55740eb6a5
Create Date: 2026-01-27 04:37:01.421125

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5eafa046e80d"
down_revision: str | None = "ce55740eb6a5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 新增 server_start_date 欄位
    op.add_column(
        "game_accounts",
        sa.Column(
            "server_start_date",
            sa.Date(),
            nullable=True,
            comment="伺服器/帳號開始日期，用於計算遊戲天數",
        ),
    )

    # 移除舊的 account_age_days 欄位（不再需要手動維護）
    op.drop_column("game_accounts", "account_age_days")


def downgrade() -> None:
    # 還原 account_age_days 欄位
    op.add_column(
        "game_accounts",
        sa.Column("account_age_days", sa.Integer(), nullable=True, default=0),
    )

    # 移除 server_start_date 欄位
    op.drop_column("game_accounts", "server_start_date")
