"""Add users.extension_token_version for revoking extension tokens.

Revision ID: 0003_ext_token_version
Revises: 0002_drop_legacy
Create Date: 2026-10-05

Only the upload-only extension token (``scope=extension_upload``) carries
``ver``. Logging out on the site increments ``users.extension_token_version``
so every extension token issued earlier is rejected (401). The site's own
access / refresh tokens are unaffected (no "log out all devices").

Additive and non-destructive: existing rows get 0.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_ext_token_version"
down_revision: str | None = "0002_drop_legacy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "extension_token_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "extension_token_version")
