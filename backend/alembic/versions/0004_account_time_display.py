"""Per-account time-display setting (P0-02).

Revision ID: 0004_time_display
Revises: 0003_ext_token_version
Create Date: 2026-10-05

``game_accounts.time_display`` says whether the game shows server time or the
player's local time (``local_timezone``, an IANA name). Pasted text and
screenshots only carry clock times, so P0-05 needs this to compute absolute
arrival times. NULL = not set yet (asked on the first paste).

Additive and non-destructive: existing rows get NULL.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_time_display"
down_revision: str | None = "0003_ext_token_version"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "game_accounts",
        sa.Column(
            "time_display",
            sa.Enum("server", "local", name="time_display"),
            nullable=True,
        ),
    )
    op.add_column(
        "game_accounts",
        sa.Column("local_timezone", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("game_accounts", "local_timezone")
    op.drop_column("game_accounts", "time_display")
