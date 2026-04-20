"""add_reminder_tables

Revision ID: 007_reminder_tables
Revises: 006_execution_tasks
Create Date: 2026-01-29

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007_reminder_tables"
down_revision: str | None = "006_execution_tasks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 創建提醒規則表
    op.create_table(
        "reminder_rules",
        sa.Column("rule_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=True),
        # 提醒類型
        sa.Column(
            "reminder_type",
            sa.Enum(
                "build_complete",
                "train_complete",
                "resource_full",
                "hero_ready",
                "attack_incoming",
                "custom",
                name="remindertype",
            ),
            nullable=False,
        ),
        # 規則設定
        sa.Column("enabled", sa.Boolean(), nullable=False, default=True),
        sa.Column(
            "threshold",
            sa.Integer(),
            nullable=True,
            comment="閾值（如資源滿倉百分比）",
        ),
        sa.Column(
            "description",
            sa.String(length=200),
            nullable=True,
            comment="規則描述",
        ),
        # 時間戳
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        # 外鍵約束
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("rule_id"),
    )
    op.create_index(op.f("ix_reminder_rules_user_id"), "reminder_rules", ["user_id"])
    op.create_index(
        op.f("ix_reminder_rules_account_id"), "reminder_rules", ["account_id"]
    )
    op.create_index(
        op.f("ix_reminder_rules_reminder_type"), "reminder_rules", ["reminder_type"]
    )

    # 創建通知表
    op.create_table(
        "notifications",
        sa.Column("notification_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=True),
        sa.Column("rule_id", sa.String(length=36), nullable=True),
        # 通知內容
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "notification_type",
            sa.Enum(
                "build_complete",
                "train_complete",
                "resource_full",
                "hero_ready",
                "attack_incoming",
                "custom",
                name="remindertype",
            ),
            nullable=False,
        ),
        # 狀態
        sa.Column("is_read", sa.Boolean(), nullable=False, default=False),
        sa.Column(
            "is_pushed",
            sa.Boolean(),
            nullable=False,
            default=False,
            comment="是否已推播",
        ),
        # 時間戳
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        # 外鍵約束
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["rule_id"], ["reminder_rules.rule_id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("notification_id"),
    )
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"])
    op.create_index(
        op.f("ix_notifications_account_id"), "notifications", ["account_id"]
    )
    op.create_index(op.f("ix_notifications_is_read"), "notifications", ["is_read"])
    op.create_index(
        op.f("ix_notifications_created_at"), "notifications", ["created_at"]
    )

    # 創建 Push 訂閱表
    op.create_table(
        "push_subscriptions",
        sa.Column("subscription_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        # Web Push 訂閱資訊
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh_key", sa.String(length=500), nullable=False),
        sa.Column("auth_key", sa.String(length=500), nullable=False),
        # 狀態
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        # 時間戳
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        # 外鍵約束
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("subscription_id"),
    )
    op.create_index(
        op.f("ix_push_subscriptions_user_id"), "push_subscriptions", ["user_id"]
    )
    op.create_index(
        op.f("ix_push_subscriptions_is_active"), "push_subscriptions", ["is_active"]
    )


def downgrade() -> None:
    # 刪除 Push 訂閱表
    op.drop_index(
        op.f("ix_push_subscriptions_is_active"), table_name="push_subscriptions"
    )
    op.drop_index(
        op.f("ix_push_subscriptions_user_id"), table_name="push_subscriptions"
    )
    op.drop_table("push_subscriptions")

    # 刪除通知表
    op.drop_index(op.f("ix_notifications_created_at"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_is_read"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_account_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_table("notifications")

    # 刪除提醒規則表
    op.drop_index(op.f("ix_reminder_rules_reminder_type"), table_name="reminder_rules")
    op.drop_index(op.f("ix_reminder_rules_account_id"), table_name="reminder_rules")
    op.drop_index(op.f("ix_reminder_rules_user_id"), table_name="reminder_rules")
    op.drop_table("reminder_rules")

    # 刪除 Enum 類型
    op.execute("DROP TYPE IF EXISTS remindertype")
