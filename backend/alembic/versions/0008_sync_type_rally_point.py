"""Add RALLY_POINT to sync_logs.sync_type (P0-06 recent uploads).

Revision ID: 0008_sync_type_rally
Revises: 0007_opening_checklist
Create Date: 2026-10-05

Rally-point pastes need a sync_log row so the home 「最近上傳」 list can show
them alongside village_overview / village_center / troops / full (reports).
MySQL ENUM is extended in place; SQLite tests create tables from models.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0008_sync_type_rally"
down_revision: str | None = "0007_opening_checklist"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Member NAMES match SQLAlchemy SQLEnum(SyncType) defaults / 0001_baseline.
_NEW = (
    "VILLAGE_OVERVIEW",
    "VILLAGE_CENTER",
    "TROOPS",
    "FULL",
    "MAP_SQL",
    "RALLY_POINT",
)
_OLD = (
    "VILLAGE_OVERVIEW",
    "VILLAGE_CENTER",
    "TROOPS",
    "FULL",
    "MAP_SQL",
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return
    values = ", ".join(f"'{v}'" for v in _NEW)
    op.execute(f"ALTER TABLE sync_logs MODIFY COLUMN sync_type ENUM({values}) NOT NULL")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return
    # Rows with RALLY_POINT would block shrink; map them to FULL first.
    op.execute(
        "UPDATE sync_logs SET sync_type = 'FULL' WHERE sync_type = 'RALLY_POINT'"
    )
    values = ", ".join(f"'{v}'" for v in _OLD)
    op.execute(f"ALTER TABLE sync_logs MODIFY COLUMN sync_type ENUM({values}) NOT NULL")
