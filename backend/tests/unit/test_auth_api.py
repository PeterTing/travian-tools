"""認證 API 端點測試."""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """建立測試客戶端."""
    return TestClient(app)


@pytest.fixture
def mock_db():
    """模擬資料庫 session."""
    return MagicMock()


class TestRegisterEndpoint:
    """註冊端點測試."""

    def test_register_validation_username_too_short(self, client: TestClient):
        """測試使用者名稱太短."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "ab",  # 少於 3 字元
                "email": "test@example.com",
                "password": "Password123",
            },
        )
        assert response.status_code == 422

    def test_register_validation_username_invalid_chars(self, client: TestClient):
        """測試使用者名稱包含無效字元."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "user@name",  # 包含 @
                "email": "test@example.com",
                "password": "Password123",
            },
        )
        assert response.status_code == 422

    def test_register_validation_invalid_email(self, client: TestClient):
        """測試無效的電子郵件格式."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "validuser",
                "email": "invalid-email",
                "password": "Password123",
            },
        )
        assert response.status_code == 422

    def test_register_validation_password_too_short(self, client: TestClient):
        """測試密碼太短."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "validuser",
                "email": "test@example.com",
                "password": "Pass1",  # 少於 8 字元
            },
        )
        assert response.status_code == 422

    def test_register_validation_password_no_uppercase(self, client: TestClient):
        """測試密碼沒有大寫字母."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "validuser",
                "email": "test@example.com",
                "password": "password123",  # 沒有大寫
            },
        )
        assert response.status_code == 422

    def test_register_validation_password_no_lowercase(self, client: TestClient):
        """測試密碼沒有小寫字母."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "validuser",
                "email": "test@example.com",
                "password": "PASSWORD123",  # 沒有小寫
            },
        )
        assert response.status_code == 422

    def test_register_validation_password_no_number(self, client: TestClient):
        """測試密碼沒有數字."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "validuser",
                "email": "test@example.com",
                "password": "PasswordABC",  # 沒有數字
            },
        )
        assert response.status_code == 422


class TestLoginEndpoint:
    """登入端點測試."""

    def test_login_validation_invalid_email(self, client: TestClient):
        """測試無效的電子郵件格式."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "invalid-email",
                "password": "Password123",
            },
        )
        assert response.status_code == 422

    def test_login_validation_missing_password(self, client: TestClient):
        """測試缺少密碼."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
            },
        )
        assert response.status_code == 422


class TestRefreshEndpoint:
    """刷新 Token 端點測試."""

    def test_refresh_validation_missing_token(self, client: TestClient):
        """測試缺少 refresh token."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={},
        )
        assert response.status_code == 422

    def test_refresh_invalid_token(self, client: TestClient):
        """測試無效的 refresh token."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid-token"},
        )
        assert response.status_code == 401


class TestMeEndpoint:
    """取得當前使用者端點測試."""

    def test_me_without_token(self, client: TestClient):
        """測試沒有提供 Token."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_me_with_invalid_token(self, client: TestClient):
        """測試無效的 Token."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401


class TestLogoutEndpoint:
    """登出端點測試."""

    def test_logout_without_token(self, client: TestClient):
        """測試沒有提供 Token."""
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 401
