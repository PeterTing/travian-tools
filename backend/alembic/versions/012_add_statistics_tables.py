"""Add statistics tables (conquests, name changes, server stats).

Revision ID: 012_statistics_tables
Revises: 011_sync_task_completion_event
Create Date: 2026-04-08

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "012_statistics_tables"
down_revision: str | None = "011_sync_task_completion_event"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create map_conquests, map_name_changes, and map_server_stats tables."""
    # Map Conquests — tracks village ownership changes between snapshots
    op.create_table(
        "map_conquests",
        sa.Column("conquest_id", sa.String(36), primary_key=True),
        sa.Column("server_url", sa.String(255), nullable=False),
        sa.Column(
            "detected_at_snapshot_id",
            sa.String(36),
            sa.ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "detected_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("village_id", sa.Integer, nullable=False),
        sa.Column("village_name", sa.String(255), nullable=True),
        sa.Column("village_x", sa.Integer, nullable=False),
        sa.Column("village_y", sa.Integer, nullable=False),
        sa.Column("old_player_id", sa.Integer, nullable=True),
        sa.Column("old_player_name", sa.String(255), nullable=True),
        sa.Column("old_alliance_name", sa.String(255), nullable=True),
        sa.Column("new_player_id", sa.Integer, nullable=True),
        sa.Column("new_player_name", sa.String(255), nullable=True),
        sa.Column("new_alliance_name", sa.String(255), nullable=True),
    )
    op.create_index("ix_map_conquests_server_url", "map_conquests", ["server_url"])
    op.create_index(
        "ix_map_conquests_snapshot_id",
        "map_conquests",
        ["detected_at_snapshot_id"],
    )

    # Map Name Changes — tracks player name changes between snapshots
    op.create_table(
        "map_name_changes",
        sa.Column("change_id", sa.String(36), primary_key=True),
        sa.Column("server_url", sa.String(255), nullable=False),
        sa.Column(
            "detected_at_snapshot_id",
            sa.String(36),
            sa.ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "detected_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("player_id", sa.Integer, nullable=False),
        sa.Column("old_name", sa.String(255), nullable=False),
        sa.Column("new_name", sa.String(255), nullable=False),
        sa.Column("game_day", sa.Integer, nullable=True),
    )
    op.create_index(
        "ix_map_name_changes_server_url", "map_name_changes", ["server_url"]
    )
    op.create_index(
        "ix_map_name_changes_snapshot_id",
        "map_name_changes",
        ["detected_at_snapshot_id"],
    )

    # Map Server Stats — daily server-level statistics snapshot
    op.create_table(
        "map_server_stats",
        sa.Column("stats_id", sa.String(36), primary_key=True),
        sa.Column(
            "snapshot_id",
            sa.String(36),
            sa.ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("server_url", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("total_players", sa.Integer, nullable=False, server_default="0"),
        sa.Column("active_players", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_villages", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_alliances", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "total_population", sa.BigInteger, nullable=False, server_default="0"
        ),
        sa.Column("new_players", sa.Integer, nullable=False, server_default="0"),
        sa.Column("deleted_players", sa.Integer, nullable=False, server_default="0"),
        sa.Column("villages_settled", sa.Integer, nullable=False, server_default="0"),
        sa.Column("villages_destroyed", sa.Integer, nullable=False, server_default="0"),
        sa.Column("conquests_today", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_map_server_stats_server_url", "map_server_stats", ["server_url"]
    )
    op.create_index(
        "ix_map_server_stats_snapshot_id", "map_server_stats", ["snapshot_id"]
    )


def downgrade() -> None:
    """Drop statistics tables."""
    op.drop_table("map_server_stats")
    op.drop_table("map_name_changes")
    op.drop_table("map_conquests")
