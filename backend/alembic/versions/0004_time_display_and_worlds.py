"""Per-account time display + per-world UTC offset (P0-02).

Revision ID: 0004_time_and_worlds
Revises: 0003_ext_token_version
Create Date: 2026-10-05

1. ``game_accounts.time_display`` / ``local_timezone``: does the player's game
   show server time or their local time (IANA zone)? This is a per-person
   preference, so it lives on the account. NULL = ask on the first paste (P0-05).
2. New ``game_worlds`` table (one row per site user x server URL) with a
   nullable ``utc_offset`` in minutes. NULL = unknown: show server time
   unconverted. P0-05 fills it from pasted pages; it can also be edited by hand.
3. ``game_accounts.world_id`` links each account to its world. Existing
   accounts are backfilled: one world per (user_id, normalized server_url).

Fully reversible: downgrade drops the link, the worlds table and the two
account columns (the UTC offsets and time settings are lost, nothing else).
"""

import uuid
from collections.abc import Sequence
from urllib.parse import urlsplit

import sqlalchemy as sa

from alembic import op

revision: str = "0004_time_and_worlds"
down_revision: str | None = "0003_ext_token_version"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

FK_ACCOUNT_WORLD = "fk_game_accounts_world_id_game_worlds"
IX_ACCOUNT_WORLD = "ix_game_accounts_world_id"


def _normalize(url: str) -> str:
    """Same rule as app.utils.world_url.normalize_server_url, but never raises.

    Copied on purpose: migrations must not import app code that may change later.
    """
    text = (url or "").strip()
    if "://" not in text:
        text = f"https://{text}"
    try:
        parts = urlsplit(text)
        host = (parts.hostname or "").lower()
        port = parts.port
    except ValueError:
        return (url or "").strip()[:200]
    if not host:
        return (url or "").strip()[:200]
    netloc = f"{host}:{port}" if port else host
    return f"{(parts.scheme or 'https').lower()}://{netloc}"[:200]


def upgrade() -> None:
    # 1. per-account time display (per-person preference)
    op.add_column(
        "game_accounts",
        sa.Column(
            "time_display",
            sa.Enum("server", "local", name="time_display"),
            nullable=True,
        ),
    )
    op.add_column(
        "game_accounts",
        sa.Column("local_timezone", sa.String(length=64), nullable=True),
    )

    # 2. worlds, with the UTC offset created directly on this table
    op.create_table(
        "game_worlds",
        sa.Column("world_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("server_url", sa.String(length=200), nullable=False),
        sa.Column(
            "utc_offset",
            sa.Integer(),
            nullable=True,
            comment="伺服器時間的 UTC 時差（分鐘）；NULL = 不換算",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("world_id"),
        sa.UniqueConstraint("user_id", "server_url", name="uq_game_worlds_user_server"),
    )

    # 3. link accounts to worlds, then backfill existing accounts
    op.add_column(
        "game_accounts",
        sa.Column("world_id", sa.String(length=36), nullable=True),
    )
    op.create_index(IX_ACCOUNT_WORLD, "game_accounts", ["world_id"])
    op.create_foreign_key(
        FK_ACCOUNT_WORLD,
        "game_accounts",
        "game_worlds",
        ["world_id"],
        ["world_id"],
        ondelete="SET NULL",
    )

    bind = op.get_bind()
    accounts = bind.execute(
        sa.text("SELECT account_id, user_id, server_url FROM game_accounts")
    ).fetchall()
    worlds: dict[tuple[str, str], str] = {}
    for account_id, user_id, server_url in accounts:
        key = (user_id, _normalize(server_url))
        if key not in worlds:
            worlds[key] = str(uuid.uuid4())
            bind.execute(
                sa.text(
                    "INSERT INTO game_worlds (world_id, user_id, server_url) "
                    "VALUES (:world_id, :user_id, :server_url)"
                ),
                {"world_id": worlds[key], "user_id": key[0], "server_url": key[1]},
            )
        bind.execute(
            sa.text(
                "UPDATE game_accounts SET world_id = :world_id WHERE account_id = :account_id"
            ),
            {"world_id": worlds[key], "account_id": account_id},
        )


def downgrade() -> None:
    op.drop_constraint(FK_ACCOUNT_WORLD, "game_accounts", type_="foreignkey")
    op.drop_index(IX_ACCOUNT_WORLD, table_name="game_accounts")
    op.drop_column("game_accounts", "world_id")
    op.drop_table("game_worlds")
    op.drop_column("game_accounts", "local_timezone")
    op.drop_column("game_accounts", "time_display")
