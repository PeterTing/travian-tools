"""add sync_logs table.

Revision ID: 002
Revises: 001
Create Date: 2026-01-25

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create sync_logs table."""
    op.create_table(
        "sync_logs",
        sa.Column("log_id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "account_id",
            sa.String(36),
            sa.ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "village_id",
            sa.String(36),
            sa.ForeignKey("villages.village_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "sync_type",
            sa.Enum(
                "villages",
                "buildings",
                "troops",
                "resources",
                "map_sql",
                "full",
                name="synctype",
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "running", "completed", "failed", name="syncstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("items_synced", sa.Integer, nullable=False, server_default="0"),
        sa.Column("items_created", sa.Integer, nullable=False, server_default="0"),
        sa.Column("items_updated", sa.Integer, nullable=False, server_default="0"),
        sa.Column("conflicts_resolved", sa.Integer, nullable=False, server_default="0"),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("error_details", sa.Text, nullable=True),
        sa.Column(
            "started_at", sa.DateTime, nullable=False, server_default=sa.func.now()
        ),
        sa.Column("completed_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_sync_logs_user_id", "sync_logs", ["user_id"])
    op.create_index("ix_sync_logs_account_id", "sync_logs", ["account_id"])
    op.create_index("ix_sync_logs_started_at", "sync_logs", ["started_at"])


def downgrade() -> None:
    """Drop sync_logs table."""
    op.drop_index("ix_sync_logs_started_at", table_name="sync_logs")
    op.drop_index("ix_sync_logs_account_id", table_name="sync_logs")
    op.drop_index("ix_sync_logs_user_id", table_name="sync_logs")
    op.drop_table("sync_logs")
