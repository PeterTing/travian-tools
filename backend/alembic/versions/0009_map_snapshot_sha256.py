"""map_snapshots.content_sha256 + (server_url, created_at) index.

Revision ID: 0009_map_snapshot_sha256
Revises: 0008_sync_type_rally
Create Date: 2026-10-11

The scheduled map.sql job (every 4 hours) compares the SHA-256 of the fetched
map.sql with the latest snapshot of that world and skips all DB writes when it
is unchanged. The index serves that "latest snapshot of a world" lookup.
Existing rows keep NULL (their next fetch is stored once, then deduplicated).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009_map_snapshot_sha256"
down_revision: str | None = "0008_sync_type_rally"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "map_snapshots",
        sa.Column("content_sha256", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_map_snapshots_server_created",
        "map_snapshots",
        ["server_url", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_map_snapshots_server_created", table_name="map_snapshots")
    op.drop_column("map_snapshots", "content_sha256")
