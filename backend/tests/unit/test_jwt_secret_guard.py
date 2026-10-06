"""JWT_SECRET_KEY guard: no public default / short secret when DEBUG is off (P0-12 B1)."""

import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_JWT_SECRET_KEY, MIN_JWT_SECRET_LENGTH, Settings

DB = "mysql+mysqlconnector://u:p@h/db"
LONG_KEY = "k" * MIN_JWT_SECRET_LENGTH


def _settings(**overrides: object) -> Settings:
    return Settings(DATABASE_URL=DB, **overrides)  # type: ignore[arg-type]


def test_default_secret_rejected_when_debug_off() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY must be set"):
        _settings(DEBUG=False, JWT_SECRET_KEY=DEFAULT_JWT_SECRET_KEY)


def test_default_secret_rejected_when_env_has_none(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("DEBUG", raising=False)
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY must be set"):
        Settings(DATABASE_URL=DB, _env_file=None)  # type: ignore[call-arg]


def test_short_secret_rejected_when_debug_off() -> None:
    with pytest.raises(ValidationError, match=f"at least {MIN_JWT_SECRET_LENGTH}"):
        _settings(DEBUG=False, JWT_SECRET_KEY="k" * (MIN_JWT_SECRET_LENGTH - 1))


def test_error_message_does_not_leak_the_secret() -> None:
    secret = "short-but-secret-value"
    with pytest.raises(ValidationError) as exc:
        _settings(DEBUG=False, JWT_SECRET_KEY=secret)
    assert secret not in str(exc.value)


def test_debug_allows_default_secret() -> None:
    assert _settings(DEBUG=True, JWT_SECRET_KEY=DEFAULT_JWT_SECRET_KEY).DEBUG is True
    assert _settings(DEBUG=True, JWT_SECRET_KEY="short").JWT_SECRET_KEY == "short"


def test_long_secret_accepted_when_debug_off() -> None:
    assert _settings(DEBUG=False, JWT_SECRET_KEY=LONG_KEY).JWT_SECRET_KEY == LONG_KEY
