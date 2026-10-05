"""認證 API 端點."""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.auth import (
    ExtensionTokenResponse,
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
    """刷新 Token（擴充上傳 Token 一律 403）."""
    if AuthService.is_extension_token(request.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="擴充憑證不能刷新，請在工具網站登入",
        )
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
    "/extension-token",
    response_model=ExtensionTokenResponse,
    summary="換發擴充登入憑證",
    description=(
        "工具網站登入後呼叫，取得交給瀏覽器擴充的短效 Token（有到期時間）。"
        "擴充專用 Token 不能再拿來換發。"
    ),
)
async def create_extension_token(current_user: CurrentUser) -> ExtensionTokenResponse:
    """換發擴充登入憑證.

    CurrentUser 已經擋掉擴充上傳 Token（403），所以擴充不能自己續期。
    """
    token, expires_at = AuthService.create_extension_token(
        current_user.user_id, AuthService.user_token_version(current_user)
    )
    expires_in = max(0, int((expires_at - datetime.now(UTC)).total_seconds()))
    return ExtensionTokenResponse(
        access_token=token,
        expires_at=expires_at,
        expires_in=expires_in,
        user=UserResponse.model_validate(current_user),
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="使用者登出",
    description="登出並撤銷這個使用者先前發出的所有 Token（含擴充 Token）",
)
async def logout(current_user: CurrentUser, db: DBSession) -> MessageResponse:
    """使用者登出.

    token_version +1：這個使用者先前發出的所有 Token（網站的 access / refresh
    與交給擴充的上傳 Token）都會立刻失效（401）。
    """
    AuthService(db).revoke_tokens(current_user)
    return MessageResponse(message="登出成功")
