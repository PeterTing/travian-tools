"""認證 API 端點."""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.auth import (
    MessageResponse,
    TokenRefreshRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="使用者註冊",
    description="註冊新使用者帳號",
)
async def register(request: UserRegisterRequest, db: DBSession) -> UserResponse:
    """使用者註冊."""
    auth_service = AuthService(db)
    user, error = auth_service.register(
        username=request.username,
        email=request.email,
        password=request.password,
    )

    if error or not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "註冊失敗",
        )

    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="使用者登入",
    description="使用電子郵件和密碼登入",
)
async def login(request: UserLoginRequest, db: DBSession) -> TokenResponse:
    """使用者登入."""
    auth_service = AuthService(db)
    token, error = auth_service.login(
        email=request.email,
        password=request.password,
    )

    if error or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "登入失敗",
        )

    return token


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="刷新 Token",
    description="使用刷新 Token 取得新的存取 Token",
)
async def refresh_token(request: TokenRefreshRequest, db: DBSession) -> TokenResponse:
    """刷新 Token."""
    auth_service = AuthService(db)
    token, error = auth_service.refresh_tokens(request.refresh_token)

    if error or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "刷新失敗",
        )

    return token


@router.get(
    "/me",
    response_model=UserResponse,
    summary="取得當前使用者資訊",
    description="需要認證，回傳當前登入使用者的資訊",
)
async def get_me(current_user: CurrentUser) -> UserResponse:
    """取得當前使用者資訊."""
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="使用者登出",
    description="登出當前使用者（前端應清除 Token）",
)
async def logout(current_user: CurrentUser) -> MessageResponse:
    """使用者登出.

    Note: 由於 JWT 是無狀態的，實際的 Token 失效需要在前端處理。
    如需要伺服器端失效，可以實作 Token 黑名單機制。
    """
    return MessageResponse(message="登出成功")
