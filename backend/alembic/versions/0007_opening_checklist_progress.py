"""P0-10: opening_checklist_progress（開局攻略清單的勾選進度）.

Revision ID: 0007_opening_checklist
Revises: 0006_draft_mediumtext
Create Date: 2026-10-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007_opening_checklist"
down_revision: str | None = "0006_draft_mediumtext"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "opening_checklist_progress",
        sa.Column("progress_id", sa.String(36), primary_key=True),
        sa.Column(
            "account_id",
            sa.String(36),
            sa.ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "world_id",
            sa.String(36),
            sa.ForeignKey("game_worlds.world_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "strategy",
            sa.String(20),
            nullable=False,
            comment="攻略代碼，例如 4p-farm、3p-sim",
        ),
        sa.Column(
            "step_id",
            sa.String(16),
            nullable=False,
            comment="步驟代碼（Excel 列號，例如 r016）",
        ),
        sa.Column(
            "checked_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint(
            "account_id",
            "world_id",
            "strategy",
            "step_id",
            name="uq_opening_checklist_step",
        ),
    )
    op.create_index(
        "ix_opening_checklist_progress_world_id",
        "opening_checklist_progress",
        ["world_id"],
    )


def downgrade() -> None:
    op.drop_table("opening_checklist_progress")
