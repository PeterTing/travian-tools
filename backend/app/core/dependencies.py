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


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="無效、已過期或已撤銷的 Token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _authenticate(
    credentials: HTTPAuthorizationCredentials | None, db: Session
) -> tuple["User", str | None]:
    from app.services.auth_service import AuthService

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供認證資訊",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user, scope = AuthService(db).authenticate(credentials.credentials)
    if not user:
        raise _unauthorized()
    return user, scope


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> "User":
    """取得當前登入使用者（一般 API）.

    擴充專用的上傳 Token（scope=extension_upload）在這裡一律 403。
    """
    user, scope = _authenticate(credentials, db)
    if scope is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="擴充憑證只能用來上傳頁面",
        )
    return user


def get_upload_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> "User":
    """取得上傳者：只用在 popup 會呼叫的上傳 API，接受一般 Token 與擴充上傳 Token."""
    from app.services.auth_service import EXTENSION_SCOPE

    user, scope = _authenticate(credentials, db)
    if scope not in (None, EXTENSION_SCOPE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="這個 Token 不能上傳",
        )
    return user


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> "User | None":
    """取得當前登入使用者（可選；擴充上傳 Token 視為未登入）."""
    from app.services.auth_service import AuthService

    if not credentials:
        return None

    user, scope = AuthService(db).authenticate(credentials.credentials)
    return user if scope is None else None


# 類型別名，用於依賴注入
DBSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated["User", Depends(get_current_user)]
OptionalUser = Annotated["User | None", Depends(get_optional_user)]
# 只給 popup 會呼叫的上傳 API 使用
UploadUser = Annotated["User", Depends(get_upload_user)]
