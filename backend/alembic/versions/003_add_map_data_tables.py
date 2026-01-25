"""add map data tables.

Revision ID: 003
Revises: 002
Create Date: 2026-01-25

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create map data tables."""
    # Map Snapshots
    op.create_table(
        "map_snapshots",
        sa.Column("snapshot_id", sa.String(36), primary_key=True),
        sa.Column(
            "account_id",
            sa.String(36),
            sa.ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("server_url", sa.String(200), nullable=False),
        sa.Column("total_villages", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_players", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_alliances", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime, nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_map_snapshots_account_id", "map_snapshots", ["account_id"])

    # Map Villages
    op.create_table(
        "map_villages",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "snapshot_id",
            sa.String(36),
            sa.ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("travian_village_id", sa.Integer, nullable=False),
        sa.Column("village_name", sa.String(100), nullable=True),
        sa.Column("x", sa.Integer, nullable=False),
        sa.Column("y", sa.Integer, nullable=False),
        sa.Column("field_type", sa.Integer, nullable=False, server_default="0"),
        sa.Column("travian_player_id", sa.Integer, nullable=True),
        sa.Column("player_name", sa.String(100), nullable=True),
        sa.Column("travian_alliance_id", sa.Integer, nullable=True),
        sa.Column("alliance_name", sa.String(100), nullable=True),
        sa.Column("population", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_capital", sa.Boolean, nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_map_villages_snapshot_coords", "map_villages", ["snapshot_id", "x", "y"]
    )
    op.create_index(
        "ix_map_villages_snapshot_player",
        "map_villages",
        ["snapshot_id", "travian_player_id"],
    )

    # Map Players
    op.create_table(
        "map_players",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "snapshot_id",
            sa.String(36),
            sa.ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("travian_player_id", sa.Integer, nullable=False),
        sa.Column("player_name", sa.String(100), nullable=False),
        sa.Column("travian_alliance_id", sa.Integer, nullable=True),
        sa.Column("alliance_name", sa.String(100), nullable=True),
        sa.Column("village_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_population", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_map_players_snapshot_id",
        "map_players",
        ["snapshot_id", "travian_player_id"],
    )

    # Map Alliances
    op.create_table(
        "map_alliances",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "snapshot_id",
            sa.String(36),
            sa.ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("travian_alliance_id", sa.Integer, nullable=False),
        sa.Column("alliance_name", sa.String(100), nullable=False),
        sa.Column("member_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_population", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_map_alliances_snapshot_id",
        "map_alliances",
        ["snapshot_id", "travian_alliance_id"],
    )


def downgrade() -> None:
    """Drop map data tables."""
    op.drop_table("map_alliances")
    op.drop_table("map_players")
    op.drop_table("map_villages")
    op.drop_table("map_snapshots")
