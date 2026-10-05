"""擴充登入憑證：換發、只能上傳的 scope、登出撤銷擴充 Token（extension_token_version）."""

import importlib
import pkgutil
import re
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from fastapi.dependencies.models import Dependant
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

import app.api.v1.endpoints as endpoints_pkg
from app.api.v1.endpoints import sync as sync_endpoints
from app.core.config import settings
from app.core.dependencies import get_current_user, get_db, get_upload_user
from app.main import app
from app.services.auth_service import EXTENSION_SCOPE, AuthService

# popup 會呼叫的上傳 API；只有這些接受擴充 Token
UPLOAD_PATHS = {
    "/api/v1/sync/page",
    "/api/v1/sync/village-overview",
    "/api/v1/sync/village-center",
    "/api/v1/sync/reports",
    "/api/v1/sync/troop-statistics",
}


class _FakeUser:
    def __init__(self) -> None:
        self.user_id = "user-ext-1"
        self.username = "petert"
        self.email = "peter@example.com"
        self.extension_token_version = 0


class _FakeQuery:
    def __init__(self, user: _FakeUser) -> None:
        self.user = user

    def filter(self, *_args: object) -> "_FakeQuery":
        return self

    def first(self) -> _FakeUser:
        return self.user


class _FakeDB:
    def __init__(self, user: _FakeUser) -> None:
        self.user = user
        self.commits = 0

    def query(self, *_args: object) -> _FakeQuery:
        return _FakeQuery(self.user)

    def commit(self) -> None:
        self.commits += 1


def _api_routes() -> list[tuple[str, APIRoute]]:
    """(完整路徑, route)：直接從各 endpoint 模組的 router 收集."""
    found = []
    for mod in pkgutil.iter_modules(endpoints_pkg.__path__):
        module = importlib.import_module(f"{endpoints_pkg.__name__}.{mod.name}")
        router = getattr(module, "router", None)
        for route in getattr(router, "routes", []):
            if isinstance(route, APIRoute):
                found.append((settings.API_V1_PREFIX + route.path, route))
    return found


@pytest.fixture
def user() -> _FakeUser:
    return _FakeUser()


@pytest.fixture
def db(user: _FakeUser) -> _FakeDB:
    return _FakeDB(user)


@pytest.fixture
def client(db: _FakeDB) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _ext(user: _FakeUser) -> str:
    token, _ = AuthService.create_extension_token(
        user.user_id, user.extension_token_version
    )
    return token


def _site(user: _FakeUser) -> str:
    return AuthService.create_access_token(user.user_id)


@pytest.fixture
def fake_sync(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Service:
        def __init__(self, _db: Any) -> None:
            pass

        def sync_reports(self, _uid: str, data: Any) -> tuple[bool, str, int, int, int]:
            return True, "ok", len(data.reports), 0, 0

    monkeypatch.setattr(sync_endpoints, "SyncService", _Service)


# ------------------------------------------------------------------ minting
class TestCreateExtensionToken:
    def test_token_has_expiry_upload_scope_and_version(self) -> None:
        before = datetime.now(UTC)
        token, expires_at = AuthService.create_extension_token("u1", 3)
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        assert payload["sub"] == "u1"
        assert payload["type"] == "access"
        assert payload["scope"] == EXTENSION_SCOPE == "extension_upload"
        assert payload["ver"] == 3
        assert payload["exp"] == int(expires_at.timestamp())
        ttl = timedelta(minutes=settings.JWT_EXTENSION_TOKEN_EXPIRE_MINUTES)
        assert before + ttl - timedelta(seconds=2) <= expires_at
        assert expires_at <= datetime.now(UTC) + ttl

    def test_site_tokens_have_no_version_or_scope(self) -> None:
        """網站 access / refresh Token 維持原本格式（不帶 ver、不帶 scope）."""
        for token in (
            AuthService.create_access_token("u1"),
            AuthService.create_refresh_token("u1"),
        ):
            payload = AuthService.decode_token(token)
            assert payload is not None
            assert "ver" not in payload
            assert "scope" not in payload

    def test_is_extension_token(self) -> None:
        ext, _ = AuthService.create_extension_token("u1")
        assert AuthService.is_extension_token(ext) is True
        assert not AuthService.is_extension_token(AuthService.create_access_token("u1"))
        assert AuthService.is_extension_token("garbage") is False

    def test_expired_extension_token_is_rejected(self, db: _FakeDB) -> None:
        payload = {
            "sub": "u1",
            "type": "access",
            "scope": EXTENSION_SCOPE,
            "ver": 0,
            "exp": datetime.now(UTC) - timedelta(seconds=1),
        }
        token = jwt.encode(
            payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        )
        assert AuthService.decode_token(token) is None
        assert AuthService(db).get_current_user(token) is None  # type: ignore[arg-type]

    def test_requires_login(self, client: TestClient) -> None:
        assert client.post("/api/v1/auth/extension-token").status_code == 401

    def test_site_token_mints_extension_token(
        self, client: TestClient, user: _FakeUser
    ) -> None:
        user.extension_token_version = 2
        resp = client.post("/api/v1/auth/extension-token", headers=_auth(_site(user)))
        assert resp.status_code == 200
        body = resp.json()
        assert body["token_type"] == "bearer"
        assert body["user"]["username"] == "petert"
        assert (
            0 < body["expires_in"] <= settings.JWT_EXTENSION_TOKEN_EXPIRE_MINUTES * 60
        )
        assert datetime.fromisoformat(body["expires_at"]).tzinfo is not None
        payload = AuthService.decode_token(body["access_token"])
        assert payload is not None
        assert payload["scope"] == EXTENSION_SCOPE
        assert payload["ver"] == 2


# ------------------------------------------------------------- upload scope
class TestUploadOnlyScope:
    def test_upload_ok(
        self, client: TestClient, user: _FakeUser, fake_sync: None
    ) -> None:
        resp = client.post(
            "/api/v1/sync/reports",
            json={"account_id": "acc-1", "reports": []},
            headers=_auth(_ext(user)),
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["success"] is True

    def test_site_token_can_still_upload(
        self, client: TestClient, user: _FakeUser, fake_sync: None
    ) -> None:
        resp = client.post(
            "/api/v1/sync/reports",
            json={"account_id": "acc-1", "reports": []},
            headers=_auth(_site(user)),
        )
        assert resp.status_code == 200

    def test_account_settings_403(self, client: TestClient, user: _FakeUser) -> None:
        resp = client.put(
            "/api/v1/game-accounts/acc-1",
            json={"player_name": "x"},
            headers=_auth(_ext(user)),
        )
        assert resp.status_code == 403
        assert (
            client.get("/api/v1/game-accounts", headers=_auth(_ext(user))).status_code
            == 403
        )
        assert (
            client.get("/api/v1/auth/me", headers=_auth(_ext(user))).status_code == 403
        )

    def test_mint_403(self, client: TestClient, user: _FakeUser) -> None:
        resp = client.post("/api/v1/auth/extension-token", headers=_auth(_ext(user)))
        assert resp.status_code == 403

    def test_refresh_403(self, client: TestClient, user: _FakeUser) -> None:
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": _ext(user)})
        assert resp.status_code == 403

    def test_logout_403(self, client: TestClient, user: _FakeUser, db: _FakeDB) -> None:
        resp = client.post("/api/v1/auth/logout", headers=_auth(_ext(user)))
        assert resp.status_code == 403
        assert user.extension_token_version == 0

    def test_only_upload_routes_accept_extension_tokens(self) -> None:
        def uses(dep: Dependant, target: Any) -> bool:
            return any(d.call is target or uses(d, target) for d in dep.dependencies)

        upload = {
            path for path, r in _api_routes() if uses(r.dependant, get_upload_user)
        }
        assert upload == UPLOAD_PATHS

    def test_every_other_authenticated_route_rejects_extension_token(
        self, client: TestClient, user: _FakeUser
    ) -> None:
        token = _ext(user)
        checked = 0
        for full_path, route in _api_routes():
            if full_path in UPLOAD_PATHS:
                continue
            dep_calls: list[Any] = []

            def walk(dep: Dependant, out: list[Any] = dep_calls) -> None:
                for d in dep.dependencies:
                    out.append(d.call)
                    walk(d)

            walk(route.dependant)
            if get_current_user not in dep_calls:
                continue
            path = re.sub(r"\{[^}]+\}", "1", full_path)
            for method in route.methods:
                resp = client.request(method, path, headers=_auth(token), json={})
                assert resp.status_code == 403, (
                    f"{method} {route.path}: {resp.status_code}"
                )
                checked += 1
        assert checked > 10


# --------------------------------------------------------------- revocation
class TestLogoutRevokesExtensionTokensOnly:
    def test_logout_rejects_earlier_extension_tokens(
        self, client: TestClient, user: _FakeUser, db: _FakeDB, fake_sync: None
    ) -> None:
        ext = _ext(user)
        body = {"account_id": "acc-1", "reports": []}
        ok = client.post("/api/v1/sync/reports", json=body, headers=_auth(ext))
        assert ok.status_code == 200

        resp = client.post("/api/v1/auth/logout", headers=_auth(_site(user)))
        assert resp.status_code == 200
        assert user.extension_token_version == 1
        assert db.commits == 1

        # 先前交給擴充的 Token 失效
        old = client.post("/api/v1/sync/reports", json=body, headers=_auth(ext))
        assert old.status_code == 401

        # 再次登入後換發的新擴充 Token 可用
        fresh = client.post(
            "/api/v1/sync/reports", json=body, headers=_auth(_ext(user))
        )
        assert fresh.status_code == 200

    def test_other_device_site_tokens_survive_logout(
        self, client: TestClient, user: _FakeUser, fake_sync: None
    ) -> None:
        """在「另一台裝置」登出前發出的網站 access / refresh Token 照常可用."""
        other_access = AuthService.create_access_token(user.user_id)
        other_refresh = AuthService.create_refresh_token(user.user_id)

        this_device = AuthService.create_access_token(user.user_id)
        resp = client.post("/api/v1/auth/logout", headers=_auth(this_device))
        assert resp.status_code == 200

        me = client.get("/api/v1/auth/me", headers=_auth(other_access))
        assert me.status_code == 200
        upload = client.post(
            "/api/v1/sync/reports",
            json={"account_id": "acc-1", "reports": []},
            headers=_auth(other_access),
        )
        assert upload.status_code == 200
        refreshed = client.post(
            "/api/v1/auth/refresh", json={"refresh_token": other_refresh}
        )
        assert refreshed.status_code == 200
        assert (
            client.get(
                "/api/v1/auth/me", headers=_auth(refreshed.json()["access_token"])
            ).status_code
            == 200
        )

    def test_no_logout_all_devices_feature(self) -> None:
        """「登出所有裝置」不在範圍內：沒有這種 API，網站 Token 也沒有版本可撤銷."""
        paths = {path for path, _ in _api_routes()}
        assert not any(re.search(r"logout[-_/]?all|revoke", p) for p in paths), paths
        assert not hasattr(AuthService, "revoke_tokens")
        from app.infrastructure.database.models.user import User

        assert "token_version" not in User.__table__.columns
        assert "extension_token_version" in User.__table__.columns

    def test_extension_token_without_version_is_rejected(
        self, db: _FakeDB, user: _FakeUser
    ) -> None:
        legacy = jwt.encode(
            {
                "sub": user.user_id,
                "type": "access",
                "scope": EXTENSION_SCOPE,
                "exp": datetime.now(UTC) + timedelta(minutes=5),
            },
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        assert AuthService(db).get_current_user(legacy) is None  # type: ignore[arg-type]

    def test_revoke_extension_tokens_only_bumps_extension_version(
        self, db: _FakeDB, user: _FakeUser
    ) -> None:
        service = AuthService(db)  # type: ignore[arg-type]
        site = AuthService.create_access_token(user.user_id)
        ext = _ext(user)
        assert service.revoke_extension_tokens(user) == 1  # type: ignore[arg-type]
        assert service.get_current_user(site) is user
        assert service.get_current_user(ext) is None
