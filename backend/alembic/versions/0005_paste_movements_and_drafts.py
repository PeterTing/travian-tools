"""P0-05: troop_movements + parse_drafts.

Revision ID: 0005_paste_movements
Revises: 0004_time_and_worlds
Create Date: 2026-10-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_paste_movements"
down_revision: str | None = "0004_time_and_worlds"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "troop_movements",
        sa.Column("movement_id", sa.String(36), primary_key=True),
        sa.Column(
            "account_id",
            sa.String(36),
            sa.ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "village_id",
            sa.String(36),
            nullable=True,
            comment="我方村莊 UUID（可空）",
        ),
        sa.Column(
            "kind",
            sa.String(40),
            nullable=False,
            comment="incoming_attack / incoming_raid / outgoing_* / returning / ...",
        ),
        sa.Column("role", sa.String(255), nullable=True),
        sa.Column("headline", sa.String(512), nullable=True),
        sa.Column("coordinate_x", sa.Integer(), nullable=True),
        sa.Column("coordinate_y", sa.Integer(), nullable=True),
        sa.Column(
            "arrival_at",
            sa.DateTime(),
            nullable=True,
            comment="絕對抵達時間（UTC 存庫）",
        ),
        sa.Column(
            "arrival_second_key",
            sa.String(32),
            nullable=True,
            comment="去重用：抵達那一秒的鍵（YYYY-mm-ddTHH:MM:SS）",
        ),
        sa.Column(
            "needs_coords",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("troops_json", sa.JSON(), nullable=True),
        sa.Column(
            "source",
            sa.String(20),
            nullable=False,
            server_default="paste",
            comment="paste / extension / ocr",
        ),
        sa.Column("raw_excerpt", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_troop_movements_account_id", "troop_movements", ["account_id"])
    op.create_index("ix_troop_movements_arrival_at", "troop_movements", ["arrival_at"])
    op.create_index(
        "ix_troop_movements_arrival_second_key",
        "troop_movements",
        ["arrival_second_key"],
    )

    op.create_table(
        "parse_drafts",
        sa.Column("draft_id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("account_id", sa.String(36), nullable=False),
        sa.Column("page_type", sa.String(40), nullable=False),
        sa.Column("source", sa.String(20), nullable=False, server_default="paste"),
        sa.Column("url", sa.String(512), nullable=True),
        sa.Column("server_time", sa.String(32), nullable=True),
        sa.Column("raw_kind", sa.String(10), nullable=False, server_default="html"),
        sa.Column("raw_content", sa.Text(), nullable=False),
        sa.Column("parsed_json", sa.JSON(), nullable=False),
        sa.Column("warnings_json", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_parse_drafts_user_id", "parse_drafts", ["user_id"])


def downgrade() -> None:
    op.drop_table("parse_drafts")
    op.drop_table("troop_movements")
