"""Add users.token_version for server-side token revocation.

Revision ID: 0003_token_version
Revises: 0002_drop_legacy
Create Date: 2026-10-05

Every JWT carries ``ver``; logging out on the site increments
``users.token_version`` so all earlier access / refresh / extension tokens are
rejected. Additive and non-destructive: existing rows get 0, and tokens issued
before this revision (no ``ver``) are treated as version 0.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_token_version"
down_revision: str | None = "0002_drop_legacy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "token_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "token_version")
