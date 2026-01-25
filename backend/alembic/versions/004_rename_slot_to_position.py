"""rename slot to position in building_instances.

Revision ID: 004
Revises: 003
Create Date: 2025-01-26
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Rename slot to position and remove target_level."""
    # Rename slot to position (already executed, so skip if column doesn't exist)
    # Just drop target_level
    op.drop_column("building_instances", "target_level")


def downgrade() -> None:
    """Revert changes."""
    op.execute(
        "ALTER TABLE building_instances CHANGE COLUMN position slot INT NOT NULL"
    )
