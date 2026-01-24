"""依賴注入."""

from collections.abc import Generator
from typing import TYPE_CHECKING, Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.infrastructure.database.session import SessionLocal

if TYPE_CHECKING:
    from app.infrastructure.database.models.user import User

# HTTP Bearer 認證
security = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    """取得資料庫 session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> "User":
    """取得當前登入使用者."""
    from app.services.auth_service import AuthService

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供認證資訊",
            headers={"WWW-Authenticate": "Bearer"},
        )

    auth_service = AuthService(db)
    user = auth_service.get_current_user(credentials.credentials)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無效或已過期的 Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> "User | None":
    """取得當前登入使用者（可選）."""
    from app.services.auth_service import AuthService

    if not credentials:
        return None

    auth_service = AuthService(db)
    return auth_service.get_current_user(credentials.credentials)


# 類型別名，用於依賴注入
DBSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated["User", Depends(get_current_user)]
OptionalUser = Annotated["User | None", Depends(get_optional_user)]
