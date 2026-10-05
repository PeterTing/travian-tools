"""Widen parse_drafts.raw_content for full page HTML (view-source).

Revision ID: 0006_draft_mediumtext
Revises: 0005_paste_movements
"""

from __future__ import annotations

from sqlalchemy.dialects import mysql

from alembic import op

revision = "0006_draft_mediumtext"
down_revision = "0005_paste_movements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "parse_drafts",
        "raw_content",
        existing_type=mysql.TEXT(),
        type_=mysql.MEDIUMTEXT(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "parse_drafts",
        "raw_content",
        existing_type=mysql.MEDIUMTEXT(),
        type_=mysql.TEXT(),
        existing_nullable=False,
    )
