"""create_initial_tables

Revision ID: 001
Revises:
Create Date: 2026-01-23

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create all initial tables."""
    # Users table
    op.create_table(
        "users",
        sa.Column("user_id", sa.String(36), primary_key=True),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("email", sa.String(100), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("preferences", mysql.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
        ),
        sa.Column("last_login", sa.DateTime(), nullable=True),
    )

    # Game accounts table
    op.create_table(
        "game_accounts",
        sa.Column("account_id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("server_url", sa.String(200), nullable=False),
        sa.Column("server_name", sa.String(50), nullable=True),
        sa.Column("server_speed", sa.Integer(), default=1),
        sa.Column(
            "tribe",
            sa.Enum(
                "romans",
                "gauls",
                "teutons",
                "huns",
                "egyptians",
                "vikings",
                "spartans",
                name="tribetype",
            ),
            nullable=True,
        ),
        sa.Column("player_name", sa.String(50), nullable=True),
        sa.Column("alliance_name", sa.String(50), nullable=True),
        sa.Column("account_age_days", sa.Integer(), default=0),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("last_updated", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
        ),
    )

    # Villages table
    op.create_table(
        "villages",
        sa.Column("village_id", sa.String(36), primary_key=True),
        sa.Column(
            "account_id",
            sa.String(36),
            sa.ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(50), nullable=True),
        sa.Column("coordinate_x", sa.Integer(), nullable=True),
        sa.Column("coordinate_y", sa.Integer(), nullable=True),
        sa.Column("population", sa.Integer(), default=0),
        sa.Column(
            "village_type",
            sa.Enum(
                "4-4-4-6",
                "3-4-5-6",
                "15c",
                "9c",
                "7c",
                "6c",
                name="villagetype",
            ),
            nullable=True,
        ),
        sa.Column("is_capital", sa.Boolean(), default=False),
        sa.Column(
            "role",
            sa.Enum(
                "capital",
                "hammer",
                "anvil",
                "resource",
                "mixed",
                "ww",
                name="villagerole",
            ),
            nullable=True,
        ),
        sa.Column("last_updated", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
        ),
    )

    # Building instances table
    op.create_table(
        "building_instances",
        sa.Column("instance_id", sa.String(36), primary_key=True),
        sa.Column(
            "village_id",
            sa.String(36),
            sa.ForeignKey("villages.village_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("building_id", sa.String(50), nullable=False),
        sa.Column("slot", sa.Integer(), nullable=False),
        sa.Column("current_level", sa.Integer(), default=0),
        sa.Column("target_level", sa.Integer(), nullable=True),
        sa.Column("is_upgrading", sa.Boolean(), default=False),
        sa.Column("upgrade_finish_time", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
        ),
        sa.Column("last_updated", sa.DateTime(), nullable=True),
    )

    # Troop instances table
    op.create_table(
        "troop_instances",
        sa.Column("instance_id", sa.String(36), primary_key=True),
        sa.Column(
            "village_id",
            sa.String(36),
            sa.ForeignKey("villages.village_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("troop_id", sa.String(50), nullable=False),
        sa.Column("count", sa.Integer(), default=0),
        sa.Column("location", sa.String(20), default="home"),
        sa.Column("is_training", sa.Boolean(), default=False),
        sa.Column("training_finish_time", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
        ),
        sa.Column("last_updated", sa.DateTime(), nullable=True),
    )

    # Battle reports table
    op.create_table(
        "battle_reports",
        sa.Column("report_id", sa.String(36), primary_key=True),
        sa.Column(
            "account_id",
            sa.String(36),
            sa.ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("report_type", sa.String(20), nullable=False),
        sa.Column("battle_time", sa.DateTime(), nullable=False),
        sa.Column("attacker_troops", mysql.JSON(), nullable=True),
        sa.Column("defender_troops", mysql.JSON(), nullable=True),
        sa.Column("attacker_losses", mysql.JSON(), nullable=True),
        sa.Column("defender_losses", mysql.JSON(), nullable=True),
        sa.Column("result", sa.String(20), nullable=True),
        sa.Column("resources_stolen", mysql.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
        ),
    )

    # Create indexes
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_game_accounts_user_id", "game_accounts", ["user_id"])
    op.create_index("ix_villages_account_id", "villages", ["account_id"])
    op.create_index(
        "ix_building_instances_village_id", "building_instances", ["village_id"]
    )
    op.create_index("ix_troop_instances_village_id", "troop_instances", ["village_id"])
    op.create_index("ix_battle_reports_account_id", "battle_reports", ["account_id"])


def downgrade() -> None:
    """Drop all tables."""
    op.drop_index("ix_battle_reports_account_id", table_name="battle_reports")
    op.drop_index("ix_troop_instances_village_id", table_name="troop_instances")
    op.drop_index("ix_building_instances_village_id", table_name="building_instances")
    op.drop_index("ix_villages_account_id", table_name="villages")
    op.drop_index("ix_game_accounts_user_id", table_name="game_accounts")
    op.drop_index("ix_users_email", table_name="users")

    op.drop_table("battle_reports")
    op.drop_table("troop_instances")
    op.drop_table("building_instances")
    op.drop_table("villages")
    op.drop_table("game_accounts")
    op.drop_table("users")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS tribetype")
    op.execute("DROP TYPE IF EXISTS villagetype")
    op.execute("DROP TYPE IF EXISTS villagerole")
