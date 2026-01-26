"""add player_role to game_accounts

Revision ID: ce55740eb6a5
Revises: 005
Create Date: 2026-01-26 07:38:01.311770

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ce55740eb6a5"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 新增 player_role 欄位到 game_accounts
    op.add_column(
        "game_accounts",
        sa.Column(
            "player_role",
            sa.Enum("attacker", "defender", "farmer", "hybrid", name="playerrole"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    # 移除 player_role 欄位
    op.drop_column("game_accounts", "player_role")
