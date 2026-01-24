"""認證服務單元測試."""

from unittest.mock import MagicMock

import pytest

from app.services.auth_service import AuthService


class TestPasswordHashing:
    """密碼雜湊測試."""

    def test_hash_password(self):
        """測試密碼雜湊."""
        password = "TestPassword123"
        hashed = AuthService.hash_password(password)

        assert hashed != password
        assert hashed.startswith("$2b$")  # bcrypt 格式

    def test_verify_password_correct(self):
        """測試正確密碼驗證."""
        password = "TestPassword123"
        hashed = AuthService.hash_password(password)

        assert AuthService.verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """測試錯誤密碼驗證."""
        password = "TestPassword123"
        wrong_password = "WrongPassword456"
        hashed = AuthService.hash_password(password)

        assert AuthService.verify_password(wrong_password, hashed) is False


class TestJWTTokens:
    """JWT Token 測試."""

    def test_create_access_token(self):
        """測試建立存取 Token."""
        user_id = "test-user-id"
        token = AuthService.create_access_token(user_id)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token(self):
        """測試建立刷新 Token."""
        user_id = "test-user-id"
        token = AuthService.create_refresh_token(user_id)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_access_token(self):
        """測試解碼存取 Token."""
        user_id = "test-user-id"
        token = AuthService.create_access_token(user_id)
        payload = AuthService.decode_token(token)

        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == "access"

    def test_decode_refresh_token(self):
        """測試解碼刷新 Token."""
        user_id = "test-user-id"
        token = AuthService.create_refresh_token(user_id)
        payload = AuthService.decode_token(token)

        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"

    def test_decode_invalid_token(self):
        """測試解碼無效 Token."""
        payload = AuthService.decode_token("invalid-token")

        assert payload is None

    def test_access_and_refresh_tokens_are_different(self):
        """測試存取和刷新 Token 不同."""
        user_id = "test-user-id"
        access_token = AuthService.create_access_token(user_id)
        refresh_token = AuthService.create_refresh_token(user_id)

        assert access_token != refresh_token


class TestAuthServiceWithMockDB:
    """使用模擬資料庫的認證服務測試."""

    @pytest.fixture
    def mock_db(self):
        """建立模擬資料庫 session."""
        return MagicMock()

    @pytest.fixture
    def auth_service(self, mock_db):
        """建立認證服務實例."""
        return AuthService(mock_db)

    def test_get_user_by_email_not_found(self, auth_service, mock_db):
        """測試查詢不存在的使用者."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = auth_service.get_user_by_email("notfound@example.com")

        assert result is None

    def test_get_user_by_id_not_found(self, auth_service, mock_db):
        """測試根據 ID 查詢不存在的使用者."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = auth_service.get_user_by_id("non-existent-id")

        assert result is None

    def test_username_exists_false(self, auth_service, mock_db):
        """測試使用者名稱不存在."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = auth_service.username_exists("newuser")

        assert result is False

    def test_username_exists_true(self, auth_service, mock_db):
        """測試使用者名稱已存在."""
        mock_user = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        result = auth_service.username_exists("existinguser")

        assert result is True

    def test_register_email_exists(self, auth_service, mock_db):
        """測試註冊時 email 已存在."""
        mock_user = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        user, error = auth_service.register(
            username="newuser",
            email="existing@example.com",
            password="Password123",
        )

        assert user is None
        assert error == "此電子郵件已被註冊"

    def test_login_user_not_found(self, auth_service, mock_db):
        """測試登入時使用者不存在."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        token, error = auth_service.login(
            email="notfound@example.com",
            password="Password123",
        )

        assert token is None
        assert error == "電子郵件或密碼錯誤"

    def test_login_wrong_password(self, auth_service, mock_db):
        """測試登入時密碼錯誤."""
        mock_user = MagicMock()
        mock_user.password_hash = AuthService.hash_password("CorrectPassword123")
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        token, error = auth_service.login(
            email="user@example.com",
            password="WrongPassword123",
        )

        assert token is None
        assert error == "電子郵件或密碼錯誤"

    def test_login_success(self, auth_service, mock_db):
        """測試登入成功."""
        mock_user = MagicMock()
        mock_user.user_id = "test-user-id"
        mock_user.password_hash = AuthService.hash_password("Password123")
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        token, error = auth_service.login(
            email="user@example.com",
            password="Password123",
        )

        assert error is None
        assert token is not None
        assert token.access_token is not None
        assert token.refresh_token is not None
        assert token.token_type == "bearer"

    def test_refresh_tokens_invalid(self, auth_service, mock_db):
        """測試刷新無效的 Token."""
        token, error = auth_service.refresh_tokens("invalid-token")

        assert token is None
        assert error == "無效或已過期的刷新 Token"

    def test_refresh_tokens_wrong_type(self, auth_service, mock_db):
        """測試使用存取 Token 刷新."""
        access_token = AuthService.create_access_token("test-user-id")

        token, error = auth_service.refresh_tokens(access_token)

        assert token is None
        assert error == "無效的 Token 類型"

    def test_refresh_tokens_user_not_found(self, auth_service, mock_db):
        """測試刷新時使用者不存在."""
        refresh_token = AuthService.create_refresh_token("non-existent-id")
        mock_db.query.return_value.filter.return_value.first.return_value = None

        token, error = auth_service.refresh_tokens(refresh_token)

        assert token is None
        assert error == "使用者不存在"

    def test_refresh_tokens_success(self, auth_service, mock_db):
        """測試刷新 Token 成功."""
        mock_user = MagicMock()
        mock_user.user_id = "test-user-id"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        refresh_token = AuthService.create_refresh_token("test-user-id")
        token, error = auth_service.refresh_tokens(refresh_token)

        assert error is None
        assert token is not None
        assert token.access_token is not None
        assert token.refresh_token is not None

    def test_get_current_user_invalid_token(self, auth_service, mock_db):
        """測試無效 Token 取得當前使用者."""
        result = auth_service.get_current_user("invalid-token")

        assert result is None

    def test_get_current_user_wrong_type(self, auth_service, mock_db):
        """測試使用刷新 Token 取得當前使用者."""
        refresh_token = AuthService.create_refresh_token("test-user-id")

        result = auth_service.get_current_user(refresh_token)

        assert result is None

    def test_get_current_user_success(self, auth_service, mock_db):
        """測試成功取得當前使用者."""
        mock_user = MagicMock()
        mock_user.user_id = "test-user-id"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        access_token = AuthService.create_access_token("test-user-id")
        result = auth_service.get_current_user(access_token)

        assert result is not None
        assert result.user_id == "test-user-id"
