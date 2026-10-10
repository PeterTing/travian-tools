"""P0-25: one account, several tribes (Keep Tribe on Conquest worlds).

Revision ID: 0009_multi_tribe
Revises: 0008_sync_type_rally
Create Date: 2026-10-11

Official Travian support (evidence in
scripts/game_data/evidence/official_support_multitribe_2026-10-11.json):
on "Keep Tribe on Conquest" special gameworlds a conquered village keeps its
original tribe, while the hero's tribe ability always stays with the tribe
chosen at registration.

Schema changes (all additive, so the previous app revision keeps working on
the upgraded database):

* ``game_accounts.birth_tribe`` — 出生部族. Backfilled from
  ``game_accounts.tribe``; the app keeps both columns equal from now on.
* ``villages.tribe`` — each village's own tribe. Backfilled with the owning
  account's tribe (NULL when the account has no tribe yet).
* ``game_worlds.keep_tribe_on_conquest`` — the per-world switch, default
  false (= every existing world stays a single-tribe world).

Downgrade copies ``birth_tribe`` back into ``game_accounts.tribe`` (a no-op
while the app keeps them equal, but it makes the round trip lossless for the
account tribe) and drops the three columns. Only the per-village tribe
choices and the world switch are lost — data that did not exist before this
revision.

Helpers are not imported from app code so this file stays stable.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009_multi_tribe"
down_revision: str | None = "0008_sync_type_rally"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Same values / name as game_accounts.tribe in 0001_baseline.
_TRIBES = (
    "romans",
    "gauls",
    "teutons",
    "huns",
    "egyptians",
    "vikings",
    "spartans",
)


def _tribe_enum() -> sa.Enum:
    return sa.Enum(*_TRIBES, name="tribetype")


def upgrade() -> None:
    with op.batch_alter_table("game_accounts") as batch:
        batch.add_column(
            sa.Column(
                "birth_tribe",
                _tribe_enum(),
                nullable=True,
                comment="出生部族（註冊時選的部族，英雄能力跟著它）",
            )
        )
    with op.batch_alter_table("villages") as batch:
        batch.add_column(
            sa.Column(
                "tribe",
                _tribe_enum(),
                nullable=True,
                comment="村莊的部族；NULL = 跟帳號的出生部族一樣",
            )
        )
    with op.batch_alter_table("game_worlds") as batch:
        batch.add_column(
            sa.Column(
                "keep_tribe_on_conquest",
                sa.Boolean(),
                nullable=False,
                server_default="0",
                comment="征服保留部族的特殊伺服器（一個帳號多個部族）",
            )
        )

    bind = op.get_bind()
    bind.execute(
        sa.text("UPDATE game_accounts SET birth_tribe = tribe WHERE tribe IS NOT NULL")
    )
    bind.execute(
        sa.text(
            "UPDATE villages SET tribe = ("
            " SELECT a.tribe FROM game_accounts a"
            " WHERE a.account_id = villages.account_id"
            ")"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE game_accounts SET tribe = birth_tribe WHERE birth_tribe IS NOT NULL"
        )
    )
    with op.batch_alter_table("game_worlds") as batch:
        batch.drop_column("keep_tribe_on_conquest")
    with op.batch_alter_table("villages") as batch:
        batch.drop_column("tribe")
    with op.batch_alter_table("game_accounts") as batch:
        batch.drop_column("birth_tribe")
