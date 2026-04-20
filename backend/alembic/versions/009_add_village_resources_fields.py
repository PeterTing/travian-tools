"""Add village resources fields.

Revision ID: 009
Revises: 008
Create Date: 2025-02-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "009_village_resources"
down_revision: str | None = "008_transport_automation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add resource fields to villages table."""
    # 資源數據
    op.add_column(
        "villages", sa.Column("wood", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "villages", sa.Column("clay", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "villages", sa.Column("iron", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "villages", sa.Column("crop", sa.Integer(), nullable=False, server_default="0")
    )

    # 產量數據
    op.add_column(
        "villages",
        sa.Column("wood_production", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "villages",
        sa.Column("clay_production", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "villages",
        sa.Column("iron_production", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "villages",
        sa.Column("crop_production", sa.Integer(), nullable=False, server_default="0"),
    )

    # 倉庫容量
    op.add_column(
        "villages",
        sa.Column(
            "warehouse_capacity", sa.Integer(), nullable=False, server_default="800"
        ),
    )
    op.add_column(
        "villages",
        sa.Column(
            "granary_capacity", sa.Integer(), nullable=False, server_default="800"
        ),
    )

    # 攻擊警報
    op.add_column(
        "villages",
        sa.Column(
            "has_incoming_attack", sa.Boolean(), nullable=False, server_default="0"
        ),
    )
    op.add_column(
        "villages",
        sa.Column("attack_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    """Remove resource fields from villages table."""
    op.drop_column("villages", "attack_count")
    op.drop_column("villages", "has_incoming_attack")
    op.drop_column("villages", "granary_capacity")
    op.drop_column("villages", "warehouse_capacity")
    op.drop_column("villages", "crop_production")
    op.drop_column("villages", "iron_production")
    op.drop_column("villages", "clay_production")
    op.drop_column("villages", "wood_production")
    op.drop_column("villages", "crop")
    op.drop_column("villages", "iron")
    op.drop_column("villages", "clay")
    op.drop_column("villages", "wood")
