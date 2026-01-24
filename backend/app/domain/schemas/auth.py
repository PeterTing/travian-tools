"""認證相關的 Pydantic Schema."""

import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegisterRequest(BaseModel):
    """使用者註冊請求."""

    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="使用者名稱（3-50 字元）",
    )
    email: EmailStr = Field(..., description="電子郵件")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="密碼（至少 8 字元）",
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """驗證使用者名稱格式."""
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("使用者名稱只能包含字母、數字、底線和連字號")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """驗證密碼強度."""
        if not re.search(r"[A-Z]", v):
            raise ValueError("密碼必須包含至少一個大寫字母")
        if not re.search(r"[a-z]", v):
            raise ValueError("密碼必須包含至少一個小寫字母")
        if not re.search(r"\d", v):
            raise ValueError("密碼必須包含至少一個數字")
        return v


class UserLoginRequest(BaseModel):
    """使用者登入請求."""

    email: EmailStr = Field(..., description="電子郵件")
    password: str = Field(..., description="密碼")


class TokenResponse(BaseModel):
    """Token 回應."""

    access_token: str = Field(..., description="存取 Token")
    refresh_token: str = Field(..., description="刷新 Token")
    token_type: str = Field(default="bearer", description="Token 類型")


class TokenRefreshRequest(BaseModel):
    """Token 刷新請求."""

    refresh_token: str = Field(..., description="刷新 Token")


class UserResponse(BaseModel):
    """使用者資訊回應."""

    user_id: str = Field(..., description="使用者 ID")
    username: str = Field(..., description="使用者名稱")
    email: str = Field(..., description="電子郵件")

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """通用訊息回應."""

    message: str = Field(..., description="訊息內容")
