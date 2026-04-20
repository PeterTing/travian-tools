"""add_execution_tasks_tables

Revision ID: 006_execution_tasks
Revises: 40e8fe20aa34
Create Date: 2026-01-29

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006_execution_tasks"
down_revision: str | None = "40e8fe20aa34"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 創建執行任務表
    op.create_table(
        "execution_tasks",
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("village_id", sa.String(length=36), nullable=True),
        # 任務類型與目標
        sa.Column(
            "execution_type",
            sa.Enum("build", "train", "adventure", name="executiontype"),
            nullable=False,
        ),
        sa.Column(
            "target_id",
            sa.String(length=100),
            nullable=False,
            comment="建築/兵種 ID",
        ),
        sa.Column(
            "target_name",
            sa.String(length=100),
            nullable=False,
            comment="建築/兵種名稱",
        ),
        sa.Column(
            "target_level",
            sa.Integer(),
            nullable=True,
            comment="目標等級（建築用）",
        ),
        sa.Column(
            "quantity",
            sa.Integer(),
            nullable=False,
            default=1,
            comment="數量（訓練用）",
        ),
        sa.Column(
            "position",
            sa.Integer(),
            nullable=True,
            comment="建築位置（1-40）",
        ),
        # 預估成本
        sa.Column("cost_wood", sa.Integer(), nullable=False, default=0),
        sa.Column("cost_clay", sa.Integer(), nullable=False, default=0),
        sa.Column("cost_iron", sa.Integer(), nullable=False, default=0),
        sa.Column("cost_crop", sa.Integer(), nullable=False, default=0),
        sa.Column(
            "estimated_duration",
            sa.Integer(),
            nullable=False,
            default=0,
            comment="預估時間（秒）",
        ),
        # 狀態
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "confirmed",
                "executing",
                "completed",
                "failed",
                "cancelled",
                name="executionstatus",
            ),
            nullable=False,
            default="pending",
        ),
        sa.Column(
            "priority",
            sa.Integer(),
            nullable=False,
            default=0,
            comment="優先順序（數字越大越優先）",
        ),
        # 執行結果
        sa.Column("result_message", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "screenshot_path",
            sa.String(length=500),
            nullable=True,
            comment="執行截圖路徑",
        ),
        # 時間戳
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("confirmed_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        # 外鍵約束
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["village_id"], ["villages.village_id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("task_id"),
    )
    op.create_index(op.f("ix_execution_tasks_user_id"), "execution_tasks", ["user_id"])
    op.create_index(
        op.f("ix_execution_tasks_account_id"), "execution_tasks", ["account_id"]
    )
    op.create_index(op.f("ix_execution_tasks_status"), "execution_tasks", ["status"])
    op.create_index(
        op.f("ix_execution_tasks_created_at"), "execution_tasks", ["created_at"]
    )

    # 創建執行日誌表
    op.create_table(
        "execution_logs",
        sa.Column("log_id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("village_id", sa.String(length=36), nullable=True),
        # 執行資訊
        sa.Column(
            "execution_type",
            sa.Enum("build", "train", "adventure", name="executiontype"),
            nullable=False,
        ),
        sa.Column("target_id", sa.String(length=100), nullable=False),
        sa.Column("target_name", sa.String(length=100), nullable=False),
        sa.Column(
            "parameters",
            sa.Text(),
            nullable=True,
            comment="執行參數（JSON 格式）",
        ),
        # 結果
        sa.Column("success", sa.Boolean(), nullable=False, default=False),
        sa.Column("result_message", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("screenshot_path", sa.String(length=500), nullable=True),
        # 時間戳
        sa.Column(
            "started_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column(
            "duration_ms",
            sa.Integer(),
            nullable=True,
            comment="執行時間（毫秒）",
        ),
        # 外鍵約束
        sa.ForeignKeyConstraint(
            ["task_id"], ["execution_tasks.task_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["account_id"], ["game_accounts.account_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["village_id"], ["villages.village_id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("log_id"),
    )
    op.create_index(op.f("ix_execution_logs_task_id"), "execution_logs", ["task_id"])
    op.create_index(op.f("ix_execution_logs_user_id"), "execution_logs", ["user_id"])
    op.create_index(
        op.f("ix_execution_logs_account_id"), "execution_logs", ["account_id"]
    )
    op.create_index(
        op.f("ix_execution_logs_started_at"), "execution_logs", ["started_at"]
    )
    op.create_index(op.f("ix_execution_logs_success"), "execution_logs", ["success"])


def downgrade() -> None:
    # 刪除執行日誌表
    op.drop_index(op.f("ix_execution_logs_success"), table_name="execution_logs")
    op.drop_index(op.f("ix_execution_logs_started_at"), table_name="execution_logs")
    op.drop_index(op.f("ix_execution_logs_account_id"), table_name="execution_logs")
    op.drop_index(op.f("ix_execution_logs_user_id"), table_name="execution_logs")
    op.drop_index(op.f("ix_execution_logs_task_id"), table_name="execution_logs")
    op.drop_table("execution_logs")

    # 刪除執行任務表
    op.drop_index(op.f("ix_execution_tasks_created_at"), table_name="execution_tasks")
    op.drop_index(op.f("ix_execution_tasks_status"), table_name="execution_tasks")
    op.drop_index(op.f("ix_execution_tasks_account_id"), table_name="execution_tasks")
    op.drop_index(op.f("ix_execution_tasks_user_id"), table_name="execution_tasks")
    op.drop_table("execution_tasks")

    # 刪除 Enum 類型
    op.execute("DROP TYPE IF EXISTS executionstatus")
    op.execute("DROP TYPE IF EXISTS executiontype")
