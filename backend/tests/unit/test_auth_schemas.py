"""認證 Schema 單元測試."""

import pytest
from pydantic import ValidationError

from app.domain.schemas.auth import (
    MessageResponse,
    TokenRefreshRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)


class TestUserRegisterRequest:
    """使用者註冊請求 Schema 測試."""

    def test_valid_register_request(self):
        """測試有效的註冊請求."""
        request = UserRegisterRequest(
            username="validuser",
            email="test@example.com",
            password="Password123",
        )
        assert request.username == "validuser"
        assert request.email == "test@example.com"
        assert request.password == "Password123"

    def test_username_with_underscore_and_hyphen(self):
        """測試使用者名稱可包含底線和連字號."""
        request = UserRegisterRequest(
            username="valid_user-name",
            email="test@example.com",
            password="Password123",
        )
        assert request.username == "valid_user-name"

    def test_username_too_short(self):
        """測試使用者名稱太短."""
        with pytest.raises(ValidationError) as exc_info:
            UserRegisterRequest(
                username="ab",
                email="test@example.com",
                password="Password123",
            )
        assert "String should have at least 3 characters" in str(exc_info.value)

    def test_username_too_long(self):
        """測試使用者名稱太長."""
        with pytest.raises(ValidationError) as exc_info:
            UserRegisterRequest(
                username="a" * 51,
                email="test@example.com",
                password="Password123",
            )
        assert "String should have at most 50 characters" in str(exc_info.value)

    def test_username_invalid_characters(self):
        """測試使用者名稱包含無效字元."""
        with pytest.raises(ValidationError) as exc_info:
            UserRegisterRequest(
                username="user@name",
                email="test@example.com",
                password="Password123",
            )
        assert "使用者名稱只能包含字母、數字、底線和連字號" in str(exc_info.value)

    def test_invalid_email(self):
        """測試無效的電子郵件."""
        with pytest.raises(ValidationError) as exc_info:
            UserRegisterRequest(
                username="validuser",
                email="invalid-email",
                password="Password123",
            )
        assert "value is not a valid email address" in str(exc_info.value)

    def test_password_too_short(self):
        """測試密碼太短."""
        with pytest.raises(ValidationError) as exc_info:
            UserRegisterRequest(
                username="validuser",
                email="test@example.com",
                password="Pass1",
            )
        assert "String should have at least 8 characters" in str(exc_info.value)

    def test_password_no_uppercase(self):
        """測試密碼沒有大寫字母."""
        with pytest.raises(ValidationError) as exc_info:
            UserRegisterRequest(
                username="validuser",
                email="test@example.com",
                password="password123",
            )
        assert "密碼必須包含至少一個大寫字母" in str(exc_info.value)

    def test_password_no_lowercase(self):
        """測試密碼沒有小寫字母."""
        with pytest.raises(ValidationError) as exc_info:
            UserRegisterRequest(
                username="validuser",
                email="test@example.com",
                password="PASSWORD123",
            )
        assert "密碼必須包含至少一個小寫字母" in str(exc_info.value)

    def test_password_no_number(self):
        """測試密碼沒有數字."""
        with pytest.raises(ValidationError) as exc_info:
            UserRegisterRequest(
                username="validuser",
                email="test@example.com",
                password="PasswordABC",
            )
        assert "密碼必須包含至少一個數字" in str(exc_info.value)


class TestUserLoginRequest:
    """使用者登入請求 Schema 測試."""

    def test_valid_login_request(self):
        """測試有效的登入請求."""
        request = UserLoginRequest(
            email="test@example.com",
            password="Password123",
        )
        assert request.email == "test@example.com"
        assert request.password == "Password123"

    def test_invalid_email(self):
        """測試無效的電子郵件."""
        with pytest.raises(ValidationError) as exc_info:
            UserLoginRequest(
                email="invalid-email",
                password="Password123",
            )
        assert "value is not a valid email address" in str(exc_info.value)

    def test_missing_password(self):
        """測試缺少密碼."""
        with pytest.raises(ValidationError) as exc_info:
            UserLoginRequest(email="test@example.com")
        assert "Field required" in str(exc_info.value)


class TestTokenResponse:
    """Token 回應 Schema 測試."""

    def test_valid_token_response(self):
        """測試有效的 Token 回應."""
        response = TokenResponse(
            access_token="access-token",
            refresh_token="refresh-token",
        )
        assert response.access_token == "access-token"
        assert response.refresh_token == "refresh-token"
        assert response.token_type == "bearer"

    def test_custom_token_type(self):
        """測試自訂 Token 類型."""
        response = TokenResponse(
            access_token="access-token",
            refresh_token="refresh-token",
            token_type="custom",
        )
        assert response.token_type == "custom"


class TestTokenRefreshRequest:
    """Token 刷新請求 Schema 測試."""

    def test_valid_refresh_request(self):
        """測試有效的刷新請求."""
        request = TokenRefreshRequest(refresh_token="refresh-token")
        assert request.refresh_token == "refresh-token"

    def test_missing_refresh_token(self):
        """測試缺少刷新 Token."""
        with pytest.raises(ValidationError) as exc_info:
            TokenRefreshRequest()
        assert "Field required" in str(exc_info.value)


class TestUserResponse:
    """使用者回應 Schema 測試."""

    def test_valid_user_response(self):
        """測試有效的使用者回應."""
        response = UserResponse(
            user_id="user-123",
            username="testuser",
            email="test@example.com",
        )
        assert response.user_id == "user-123"
        assert response.username == "testuser"
        assert response.email == "test@example.com"

    def test_from_orm_object(self):
        """測試從 ORM 物件建立."""

        class MockUser:
            user_id = "user-123"
            username = "testuser"
            email = "test@example.com"

        response = UserResponse.model_validate(MockUser())
        assert response.user_id == "user-123"
        assert response.username == "testuser"


class TestMessageResponse:
    """訊息回應 Schema 測試."""

    def test_valid_message_response(self):
        """測試有效的訊息回應."""
        response = MessageResponse(message="操作成功")
        assert response.message == "操作成功"

    def test_missing_message(self):
        """測試缺少訊息."""
        with pytest.raises(ValidationError) as exc_info:
            MessageResponse()
        assert "Field required" in str(exc_info.value)
