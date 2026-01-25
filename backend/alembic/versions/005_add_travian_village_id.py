"""Add travian_village_id to villages table.

Revision ID: 005
Revises: 004
Create Date: 2025-01-26
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add travian_village_id column."""
    op.add_column(
        "villages",
        sa.Column("travian_village_id", sa.String(50), nullable=True),
    )
    op.create_index(
        "ix_villages_travian_village_id",
        "villages",
        ["travian_village_id"],
    )


def downgrade() -> None:
    """Remove travian_village_id column."""
    op.drop_index("ix_villages_travian_village_id", table_name="villages")
    op.drop_column("villages", "travian_village_id")
