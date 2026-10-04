"""遊戲帳號 API 單元測試."""

from datetime import date, datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints.game_accounts import router
from app.core.dependencies import get_current_user, get_db
from app.infrastructure.database.models.game_account import GameAccount, TribeType
from app.infrastructure.database.models.user import User

app = FastAPI()
app.include_router(router)


def create_mock_account(
    account_id: str = "acc-123",
    user_id: str = "user-123",
    server_url: str = "https://ts1.travian.com",
    server_name: str | None = None,
    server_speed: int = 1,
    tribe: TribeType | None = None,
    player_name: str | None = None,
    alliance_name: str | None = None,
    server_start_date: date | None = None,
    is_active: bool = True,
) -> GameAccount:
    """建立模擬帳號."""
    account = GameAccount(
        account_id=account_id,
        user_id=user_id,
        server_url=server_url,
        server_name=server_name,
        server_speed=server_speed,
        tribe=tribe,
        player_name=player_name,
        alliance_name=alliance_name,
        server_start_date=server_start_date,
        is_active=is_active,
    )
    account.created_at = datetime.now()
    account.last_updated = None
    return account


@pytest.fixture
def mock_user() -> User:
    """模擬當前用戶."""
    user = User(
        user_id="user-123",
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
    )
    return user


@pytest.fixture
def mock_db() -> MagicMock:
    """模擬資料庫 session."""
    return MagicMock()


@pytest.fixture
def client(mock_user: User, mock_db: MagicMock) -> TestClient:
    """建立測試客戶端."""
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestCreateGameAccount:
    """建立遊戲帳號 API 測試."""

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_create_account_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功建立帳號."""
        mock_account = create_mock_account(
            account_id="acc-123",
            user_id="user-123",
            server_url="https://ts1.travian.com",
            server_name="Speed 3x",
            server_speed=3,
            tribe=TribeType.ROMANS,
            player_name="TestPlayer",
            is_active=True,
        )
        mock_service_class.return_value.create_account.return_value = mock_account

        response = client.post(
            "/game-accounts",
            json={
                "server_url": "https://ts1.travian.com",
                "server_name": "Speed 3x",
                "server_speed": 3,
                "tribe": "romans",
                "player_name": "TestPlayer",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["account_id"] == "acc-123"
        assert data["server_url"] == "https://ts1.travian.com"

    def test_create_account_invalid_url(self, client: TestClient) -> None:
        """測試無效的 URL."""
        response = client.post(
            "/game-accounts",
            json={
                "server_url": "invalid-url",
            },
        )

        assert response.status_code == 422

    def test_create_account_missing_required(self, client: TestClient) -> None:
        """測試缺少必要欄位."""
        response = client.post("/game-accounts", json={})

        assert response.status_code == 422


class TestGetGameAccounts:
    """取得遊戲帳號列表 API 測試."""

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_get_accounts_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功取得帳號列表."""
        mock_accounts = [
            create_mock_account(
                account_id="acc-1",
                user_id="user-123",
                server_url="https://ts1.travian.com",
            ),
            create_mock_account(
                account_id="acc-2",
                user_id="user-123",
                server_url="https://ts2.travian.com",
            ),
        ]
        mock_service_class.return_value.get_accounts_by_user.return_value = (
            mock_accounts
        )

        response = client.get("/game-accounts")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["accounts"]) == 2

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_get_accounts_empty(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試空列表."""
        mock_service_class.return_value.get_accounts_by_user.return_value = []

        response = client.get("/game-accounts")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["accounts"] == []

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_get_accounts_include_inactive(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試包含非活躍帳號."""
        mock_service_class.return_value.get_accounts_by_user.return_value = []

        response = client.get("/game-accounts?include_inactive=true")

        assert response.status_code == 200
        mock_service_class.return_value.get_accounts_by_user.assert_called_once()


class TestGetGameAccount:
    """取得單一遊戲帳號 API 測試."""

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_get_account_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功取得帳號."""
        mock_account = create_mock_account(
            account_id="acc-123",
            user_id="user-123",
            server_url="https://ts1.travian.com",
        )
        mock_service_class.return_value.get_account_by_id.return_value = mock_account

        response = client.get("/game-accounts/acc-123")

        assert response.status_code == 200
        data = response.json()
        assert data["account_id"] == "acc-123"

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_get_account_not_found(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試帳號不存在."""
        mock_service_class.return_value.get_account_by_id.return_value = None

        response = client.get("/game-accounts/acc-999")

        assert response.status_code == 404
        assert response.json()["detail"] == "遊戲帳號不存在"


class TestUpdateGameAccount:
    """更新遊戲帳號 API 測試."""

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_update_account_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功更新帳號."""
        mock_account = create_mock_account(
            account_id="acc-123",
            user_id="user-123",
            server_url="https://ts1.travian.com",
            player_name="NewName",
        )
        mock_service_class.return_value.update_account.return_value = mock_account

        response = client.put(
            "/game-accounts/acc-123",
            json={"player_name": "NewName"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["player_name"] == "NewName"

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_update_account_not_found(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試更新不存在的帳號."""
        mock_service_class.return_value.update_account.return_value = None

        response = client.put(
            "/game-accounts/acc-999",
            json={"player_name": "NewName"},
        )

        assert response.status_code == 404


class TestDeleteGameAccount:
    """刪除遊戲帳號 API 測試."""

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_delete_account_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功刪除帳號."""
        mock_service_class.return_value.delete_account.return_value = True

        response = client.delete("/game-accounts/acc-123")

        assert response.status_code == 204

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_delete_account_not_found(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試刪除不存在的帳號."""
        mock_service_class.return_value.delete_account.return_value = False

        response = client.delete("/game-accounts/acc-999")

        assert response.status_code == 404


class TestNoStoredCredentials:
    """Travian 登入憑證不得被接受、儲存或回傳."""

    @patch("app.api.v1.endpoints.game_accounts.GameAccountService")
    def test_login_fields_in_payload_are_ignored(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        mock_service_class.return_value.create_account.return_value = (
            create_mock_account()
        )
        response = client.post(
            "/game-accounts",
            json={
                "server_url": "https://ts1.travian.com",
                "login_email": "someone@example.com",
                "login_password": "do-not-store",
            },
        )
        assert response.status_code == 201
        passed = mock_service_class.return_value.create_account.call_args
        dumped = repr(passed)
        assert "do-not-store" not in dumped
        assert "someone@example.com" not in dumped
        body = response.text
        assert "login_password" not in body and "login_email" not in body
        assert "has_login_credentials" not in body

    def test_model_has_no_credential_columns(self) -> None:
        cols = set(GameAccount.__table__.columns.keys())
        assert not {"login_email", "login_password"} & cols
