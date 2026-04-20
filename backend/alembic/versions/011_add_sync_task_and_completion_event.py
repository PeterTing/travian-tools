"""Add village sync task and completion event tables.

Revision ID: 011_sync_task_completion_event
Revises: 010_login_credentials
Create Date: 2026-02-19

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "011_sync_task_completion_event"
down_revision: str | None = "010_login_credentials"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create village_sync_tasks and completion_events tables."""
    # Create village_sync_tasks table
    op.create_table(
        "village_sync_tasks",
        sa.Column("task_id", sa.String(36), primary_key=True),
        sa.Column(
            "account_id",
            sa.String(36),
            sa.ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("server_url", sa.String(200), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "in_progress",
                "completed",
                "failed",
                name="sync_task_status",
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("total_villages", sa.Integer, nullable=False, server_default="0"),
        sa.Column("synced_villages", sa.Integer, nullable=False, server_default="0"),
        sa.Column("current_village_name", sa.String(100), nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
    )

    # Create completion_events table
    op.create_table(
        "completion_events",
        sa.Column("event_id", sa.String(36), primary_key=True),
        sa.Column(
            "village_id",
            sa.String(36),
            sa.ForeignKey("villages.village_id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "event_type",
            sa.Enum(
                "building",
                "troop_training",
                name="completion_event_type",
            ),
            nullable=False,
        ),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("completion_time", sa.DateTime, nullable=False, index=True),
        sa.Column("is_processed", sa.Boolean, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    """Drop village_sync_tasks and completion_events tables."""
    op.drop_table("completion_events")
    op.drop_table("village_sync_tasks")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS completion_event_type")
    op.execute("DROP TYPE IF EXISTS sync_task_status")
