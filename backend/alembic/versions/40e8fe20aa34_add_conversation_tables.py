"""add_conversation_tables

Revision ID: 40e8fe20aa34
Revises: 5eafa046e80d
Create Date: 2026-01-27 04:47:41.250118

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "40e8fe20aa34"
down_revision: str | None = "5eafa046e80d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 創建對話表
    op.create_table(
        "conversations",
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=True),
        sa.Column(
            "title",
            sa.String(length=100),
            nullable=True,
            comment="對話標題（自動從第一則訊息生成）",
        ),
        sa.Column(
            "summary",
            sa.Text(),
            nullable=True,
            comment="對話壓縮摘要（當訊息過多時生成）",
        ),
        sa.Column(
            "message_count",
            sa.Integer(),
            nullable=False,
            default=0,
            comment="訊息數量（用於判斷是否需要壓縮）",
        ),
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            default=False,
            comment="是否已封存",
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("conversation_id"),
    )
    op.create_index(
        op.f("ix_conversations_account_id"), "conversations", ["account_id"]
    )
    op.create_index(op.f("ix_conversations_user_id"), "conversations", ["user_id"])

    # 創建對話訊息表
    op.create_table(
        "conversation_messages",
        sa.Column("message_id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column(
            "role",
            sa.String(length=20),
            nullable=False,
            comment="訊息角色: user, assistant, system",
        ),
        sa.Column("content", sa.Text(), nullable=False, comment="訊息內容"),
        sa.Column(
            "sequence",
            sa.Integer(),
            nullable=False,
            comment="訊息順序（用於排序和壓縮）",
        ),
        sa.Column(
            "is_compacted",
            sa.Boolean(),
            nullable=False,
            default=False,
            comment="是否已被壓縮（壓縮後的訊息不再發送給 API）",
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.conversation_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("message_id"),
    )
    op.create_index(
        op.f("ix_conversation_messages_conversation_id"),
        "conversation_messages",
        ["conversation_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_conversation_messages_conversation_id"),
        table_name="conversation_messages",
    )
    op.drop_table("conversation_messages")
    op.drop_index(op.f("ix_conversations_user_id"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_account_id"), table_name="conversations")
    op.drop_table("conversations")
