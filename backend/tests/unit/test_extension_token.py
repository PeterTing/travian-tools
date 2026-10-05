"""擴充登入憑證（/auth/extension-token）測試."""

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.dependencies import get_db
from app.main import app
from app.services.auth_service import EXTENSION_SCOPE, AuthService


class _FakeUser:
    user_id = "user-ext-1"
    username = "petert"
    email = "peter@example.com"


class _FakeQuery:
    def filter(self, *_args: object) -> "_FakeQuery":
        return self

    def first(self) -> _FakeUser:
        return _FakeUser()


class _FakeDB:
    def query(self, *_args: object) -> _FakeQuery:
        return _FakeQuery()


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: _FakeDB()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class TestCreateExtensionToken:
    def test_token_has_expiry_and_extension_scope(self) -> None:
        before = datetime.now(UTC)
        token, expires_at = AuthService.create_extension_token("u1")
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        assert payload["sub"] == "u1"
        assert payload["type"] == "access"
        assert payload["scope"] == EXTENSION_SCOPE
        assert payload["exp"] == int(expires_at.timestamp())
        ttl = timedelta(minutes=settings.JWT_EXTENSION_TOKEN_EXPIRE_MINUTES)
        assert before + ttl - timedelta(seconds=2) <= expires_at
        assert expires_at <= datetime.now(UTC) + ttl

    def test_is_extension_token(self) -> None:
        ext, _ = AuthService.create_extension_token("u1")
        assert AuthService.is_extension_token(ext) is True
        assert (
            AuthService.is_extension_token(AuthService.create_access_token("u1"))
            is False
        )
        assert AuthService.is_extension_token("garbage") is False

    def test_expired_extension_token_is_rejected(self) -> None:
        payload = {
            "sub": "u1",
            "type": "access",
            "scope": EXTENSION_SCOPE,
            "exp": datetime.now(UTC) - timedelta(seconds=1),
        }
        token = jwt.encode(
            payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        )
        assert AuthService.decode_token(token) is None
        assert AuthService(_FakeDB()).get_current_user(token) is None  # type: ignore[arg-type]


class TestExtensionTokenEndpoint:
    def test_requires_login(self, client: TestClient) -> None:
        assert client.post("/api/v1/auth/extension-token").status_code == 401

    def test_site_token_mints_extension_token(self, client: TestClient) -> None:
        site_token = AuthService.create_access_token(_FakeUser.user_id)
        resp = client.post("/api/v1/auth/extension-token", headers=_auth(site_token))
        assert resp.status_code == 200
        body = resp.json()
        assert body["token_type"] == "bearer"
        assert body["user"]["username"] == "petert"
        assert (
            0 < body["expires_in"] <= settings.JWT_EXTENSION_TOKEN_EXPIRE_MINUTES * 60
        )
        expires_at = datetime.fromisoformat(body["expires_at"])
        assert expires_at.tzinfo is not None
        assert AuthService.is_extension_token(body["access_token"])

    def test_extension_token_works_for_api_calls(self, client: TestClient) -> None:
        ext, _ = AuthService.create_extension_token(_FakeUser.user_id)
        resp = client.get("/api/v1/auth/me", headers=_auth(ext))
        assert resp.status_code == 200
        assert resp.json()["user_id"] == _FakeUser.user_id

    def test_extension_token_cannot_mint_another(self, client: TestClient) -> None:
        ext, _ = AuthService.create_extension_token(_FakeUser.user_id)
        resp = client.post("/api/v1/auth/extension-token", headers=_auth(ext))
        assert resp.status_code == 403

    def test_extension_token_cannot_refresh(self, client: TestClient) -> None:
        ext, _ = AuthService.create_extension_token(_FakeUser.user_id)
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": ext})
        assert resp.status_code == 401
