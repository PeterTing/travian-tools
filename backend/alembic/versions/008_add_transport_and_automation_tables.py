"""add_transport_and_automation_tables

Revision ID: 008_transport_automation
Revises: 007_reminder_tables
Create Date: 2026-02-01

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008_transport_automation"
down_revision: str | None = "007_reminder_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 創建村莊運送配置表
    op.create_table(
        "village_transport_configs",
        sa.Column("config_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("village_id", sa.String(length=36), nullable=False),
        sa.Column(
            "transport_role",
            sa.Enum(
                "sender", "receiver", "both", "disabled", name="villagetransportrole"
            ),
            nullable=False,
        ),
        sa.Column(
            "max_full_time_hours",
            sa.Integer(),
            nullable=False,
            default=8,
            comment="滿倉時間上限（小時）",
        ),
        sa.Column("reserve_wood", sa.Integer(), nullable=False, default=0),
        sa.Column("reserve_clay", sa.Integer(), nullable=False, default=0),
        sa.Column("reserve_iron", sa.Integer(), nullable=False, default=0),
        sa.Column("reserve_crop", sa.Integer(), nullable=False, default=0),
        sa.Column("priority", sa.Integer(), nullable=False, default=100),
        sa.Column("enabled", sa.Boolean(), nullable=False, default=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["village_id"], ["villages.village_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("config_id"),
    )
    op.create_index(
        op.f("ix_village_transport_configs_user_id"),
        "village_transport_configs",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_village_transport_configs_account_id"),
        "village_transport_configs",
        ["account_id"],
    )
    op.create_index(
        op.f("ix_village_transport_configs_village_id"),
        "village_transport_configs",
        ["village_id"],
    )

    # 創建運送排程表
    op.create_table(
        "transport_schedules",
        sa.Column("schedule_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, default=False),
        sa.Column(
            "interval_minutes",
            sa.Integer(),
            nullable=False,
            default=30,
            comment="運送間隔（分鐘）",
        ),
        sa.Column(
            "transport_mode",
            sa.Enum("many_to_one", "one_to_many", "auto_balance", name="transportmode"),
            nullable=False,
        ),
        sa.Column("target_village_id", sa.String(length=36), nullable=True),
        sa.Column("last_executed_at", sa.DateTime(), nullable=True),
        sa.Column("next_execute_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["target_village_id"], ["villages.village_id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("schedule_id"),
    )
    op.create_index(
        op.f("ix_transport_schedules_user_id"),
        "transport_schedules",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_transport_schedules_account_id"),
        "transport_schedules",
        ["account_id"],
    )

    # 創建運送日誌表
    op.create_table(
        "transport_logs",
        sa.Column("log_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("source_village_id", sa.String(length=36), nullable=True),
        sa.Column("target_village_id", sa.String(length=36), nullable=True),
        sa.Column("target_x", sa.Integer(), nullable=True),
        sa.Column("target_y", sa.Integer(), nullable=True),
        sa.Column("wood", sa.Integer(), nullable=False, default=0),
        sa.Column("clay", sa.Integer(), nullable=False, default=0),
        sa.Column("iron", sa.Integer(), nullable=False, default=0),
        sa.Column("crop", sa.Integer(), nullable=False, default=0),
        sa.Column("success", sa.Boolean(), nullable=False, default=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "executed_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["source_village_id"], ["villages.village_id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["target_village_id"], ["villages.village_id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("log_id"),
    )
    op.create_index(op.f("ix_transport_logs_user_id"), "transport_logs", ["user_id"])
    op.create_index(
        op.f("ix_transport_logs_account_id"), "transport_logs", ["account_id"]
    )
    op.create_index(
        op.f("ix_transport_logs_executed_at"), "transport_logs", ["executed_at"]
    )

    # 創建自動化設定表
    op.create_table(
        "automation_settings",
        sa.Column("settings_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        # Keep-alive 設定
        sa.Column("keepalive_enabled", sa.Boolean(), nullable=False, default=True),
        sa.Column(
            "keepalive_interval_seconds",
            sa.Integer(),
            nullable=False,
            default=180,
        ),
        # 彈窗自動關閉設定
        sa.Column(
            "popup_auto_close_enabled", sa.Boolean(), nullable=False, default=True
        ),
        sa.Column(
            "popup_close_delay_seconds", sa.Integer(), nullable=False, default=60
        ),
        # MH 公告自動繼續
        sa.Column(
            "mh_auto_continue_enabled", sa.Boolean(), nullable=False, default=True
        ),
        # 攻擊警告設定
        sa.Column("attack_warning_enabled", sa.Boolean(), nullable=False, default=True),
        sa.Column(
            "attack_warning_sound",
            sa.String(length=50),
            nullable=False,
            default="alert1",
        ),
        sa.Column("attack_warning_volume", sa.Float(), nullable=False, default=0.8),
        # 快速掃描設定
        sa.Column("quick_scan_enabled", sa.Boolean(), nullable=False, default=True),
        sa.Column("scan_count", sa.Integer(), nullable=False, default=3),
        # URL 快取設定
        sa.Column("url_cache_enabled", sa.Boolean(), nullable=False, default=True),
        sa.Column("cache_ttl_seconds", sa.Integer(), nullable=False, default=60),
        # 人性化延遲設定
        sa.Column("human_delay_min", sa.Float(), nullable=False, default=1.0),
        sa.Column("human_delay_max", sa.Float(), nullable=False, default=5.0),
        # 時間戳
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("settings_id"),
    )
    op.create_index(
        op.f("ix_automation_settings_user_id"),
        "automation_settings",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_automation_settings_account_id"),
        "automation_settings",
        ["account_id"],
    )

    # 創建村莊自動升級配置表
    op.create_table(
        "village_auto_upgrade_configs",
        sa.Column("config_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("village_id", sa.String(length=36), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, default=False),
        sa.Column("skip_upgrade", sa.Boolean(), nullable=False, default=False),
        sa.Column(
            "roman_dual_build_enabled", sa.Boolean(), nullable=False, default=False
        ),
        sa.Column(
            "plus_multi_build_enabled", sa.Boolean(), nullable=False, default=False
        ),
        sa.Column(
            "priority_type", sa.String(length=20), nullable=False, default="balanced"
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["village_id"], ["villages.village_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("config_id"),
    )
    op.create_index(
        op.f("ix_village_auto_upgrade_configs_user_id"),
        "village_auto_upgrade_configs",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_village_auto_upgrade_configs_account_id"),
        "village_auto_upgrade_configs",
        ["account_id"],
    )
    op.create_index(
        op.f("ix_village_auto_upgrade_configs_village_id"),
        "village_auto_upgrade_configs",
        ["village_id"],
    )

    # 創建 Keep-alive 日誌表
    op.create_table(
        "keepalive_logs",
        sa.Column("log_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False, default=True),
        sa.Column("response_time_ms", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("session_expired", sa.Boolean(), nullable=False, default=False),
        sa.Column(
            "executed_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("log_id"),
    )
    op.create_index(op.f("ix_keepalive_logs_user_id"), "keepalive_logs", ["user_id"])
    op.create_index(
        op.f("ix_keepalive_logs_account_id"), "keepalive_logs", ["account_id"]
    )
    op.create_index(
        op.f("ix_keepalive_logs_executed_at"), "keepalive_logs", ["executed_at"]
    )


def downgrade() -> None:
    # 刪除 Keep-alive 日誌表
    op.drop_index(op.f("ix_keepalive_logs_executed_at"), table_name="keepalive_logs")
    op.drop_index(op.f("ix_keepalive_logs_account_id"), table_name="keepalive_logs")
    op.drop_index(op.f("ix_keepalive_logs_user_id"), table_name="keepalive_logs")
    op.drop_table("keepalive_logs")

    # 刪除村莊自動升級配置表
    op.drop_index(
        op.f("ix_village_auto_upgrade_configs_village_id"),
        table_name="village_auto_upgrade_configs",
    )
    op.drop_index(
        op.f("ix_village_auto_upgrade_configs_account_id"),
        table_name="village_auto_upgrade_configs",
    )
    op.drop_index(
        op.f("ix_village_auto_upgrade_configs_user_id"),
        table_name="village_auto_upgrade_configs",
    )
    op.drop_table("village_auto_upgrade_configs")

    # 刪除自動化設定表
    op.drop_index(
        op.f("ix_automation_settings_account_id"),
        table_name="automation_settings",
    )
    op.drop_index(
        op.f("ix_automation_settings_user_id"),
        table_name="automation_settings",
    )
    op.drop_table("automation_settings")

    # 刪除運送日誌表
    op.drop_index(op.f("ix_transport_logs_executed_at"), table_name="transport_logs")
    op.drop_index(op.f("ix_transport_logs_account_id"), table_name="transport_logs")
    op.drop_index(op.f("ix_transport_logs_user_id"), table_name="transport_logs")
    op.drop_table("transport_logs")

    # 刪除運送排程表
    op.drop_index(
        op.f("ix_transport_schedules_account_id"),
        table_name="transport_schedules",
    )
    op.drop_index(
        op.f("ix_transport_schedules_user_id"),
        table_name="transport_schedules",
    )
    op.drop_table("transport_schedules")

    # 刪除村莊運送配置表
    op.drop_index(
        op.f("ix_village_transport_configs_village_id"),
        table_name="village_transport_configs",
    )
    op.drop_index(
        op.f("ix_village_transport_configs_account_id"),
        table_name="village_transport_configs",
    )
    op.drop_index(
        op.f("ix_village_transport_configs_user_id"),
        table_name="village_transport_configs",
    )
    op.drop_table("village_transport_configs")

    # 刪除 Enum 類型
    op.execute("DROP TYPE IF EXISTS villagetransportrole")
    op.execute("DROP TYPE IF EXISTS transportmode")
