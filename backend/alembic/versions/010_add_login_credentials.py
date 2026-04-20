"""Add login credentials to game_accounts.

Revision ID: 010_login_credentials
Revises: 009_village_resources
Create Date: 2026-02-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "010_login_credentials"
down_revision: str | None = "009_village_resources"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add login credentials to game_accounts."""
    op.add_column(
        "game_accounts",
        sa.Column(
            "login_email", sa.String(100), nullable=True, comment="Travian 登入 email"
        ),
    )
    op.add_column(
        "game_accounts",
        sa.Column(
            "login_password", sa.String(200), nullable=True, comment="Travian 登入密碼"
        ),
    )


def downgrade() -> None:
    """Remove login credentials from game_accounts."""
    op.drop_column("game_accounts", "login_password")
    op.drop_column("game_accounts", "login_email")
