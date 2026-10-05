"""Drop stored Travian credentials and the browser-automation tables.

Revision ID: 0002_drop_legacy
Revises: 0001_baseline
Create Date: 2026-10-04

DESTRUCTIVE AND IRREVERSIBLE (explicitly requested by the PM):

* ``game_accounts.login_email`` / ``game_accounts.login_password`` — the stored
  Travian login credentials are permanently deleted.
* The 10 automation tables (execution / auto-upgrade / keep-alive / transport /
  village sync / completion events) and the 2 AI-assistant conversation tables.

On a fresh database built from ``0001_baseline`` none of these exist, so this
revision is a no-op there. It does real work on legacy databases that were
re-stamped to ``0001_baseline`` (see ``alembic/README_MIGRATIONS.md``).

``downgrade()`` intentionally does not recreate anything: the data is gone and
the features were removed.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_drop_legacy"
down_revision: str | None = "0001_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Children before parents so foreign keys never block a drop.
LEGACY_TABLES: tuple[str, ...] = (
    # execution engine
    "execution_logs",
    "execution_tasks",
    # automation (auto-upgrade / keep-alive)
    "keepalive_logs",
    "village_auto_upgrade_configs",
    "automation_settings",
    # resource transport
    "transport_logs",
    "transport_schedules",
    "village_transport_configs",
    # village sync worker
    "completion_events",
    "village_sync_tasks",
    # AI assistant (removed together with the AI advisor page)
    "conversation_messages",
    "conversations",
)

CREDENTIAL_COLUMNS: tuple[str, ...] = ("login_email", "login_password")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "game_accounts" in existing_tables:
        columns = {c["name"] for c in inspector.get_columns("game_accounts")}
        for column in CREDENTIAL_COLUMNS:
            if column in columns:
                op.drop_column("game_accounts", column)

    for table in LEGACY_TABLES:
        if table in existing_tables:
            op.drop_table(table)


def downgrade() -> None:
    # Irreversible by design: credentials and automation data are not restored.
    pass
