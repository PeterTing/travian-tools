"""Alembic environment configuration."""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

# Import every model module so Base.metadata is complete for autogenerate /
# `alembic check` (the package __init__ imports all model classes).
import app.infrastructure.database.models  # noqa: E402,F401
from alembic import context
from app.core.config import settings
from app.infrastructure.database.base import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


_NOW_DEFAULTS = {"now()", "current_timestamp()", "current_timestamp"}


def compare_server_default(
    context,  # noqa: ANN001
    inspected_column,  # noqa: ANN001
    metadata_column,  # noqa: ANN001
    inspected_default: str | None,
    metadata_default,  # noqa: ANN001
    rendered_metadata_default: str | None,
) -> bool | None:
    """Treat MariaDB's ``current_timestamp()`` as equal to ``func.now()``.

    Returns False (= no difference) for that pair and None otherwise so Alembic
    falls back to its default comparison.
    """

    def norm(value: str | None) -> str | None:
        return value.strip("'\" ").lower() if value else value

    if norm(inspected_default) in _NOW_DEFAULTS and (
        norm(rendered_metadata_default) in _NOW_DEFAULTS
    ):
        return False
    return None


COMPARE_OPTS = {
    "compare_type": True,
    "compare_server_default": compare_server_default,
}


def get_url() -> str:
    """Get database URL from settings."""
    return settings.DATABASE_URL


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        **COMPARE_OPTS,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            **COMPARE_OPTS,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
