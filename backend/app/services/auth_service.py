"""認證服務."""

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domain.schemas.auth import TokenResponse, UserResponse
from app.infrastructure.database.models.user import User

EXTENSION_SCOPE = "extension_upload"


class AuthService:
    """認證服務類別."""

    def __init__(self, db: Session) -> None:
        """初始化認證服務."""
        self.db = db

    @staticmethod
    def hash_password(password: str) -> str:
        """雜湊密碼."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """驗證密碼."""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )

    @staticmethod
    def _encode(payload: dict[str, Any]) -> str:
        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def create_access_token(user_id: str) -> str:
        """建立存取 Token."""
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
        return AuthService._encode({"sub": user_id, "exp": expire, "type": "access"})

    @staticmethod
    def create_extension_token(
        user_id: str, extension_token_version: int = 0
    ) -> tuple[str, datetime]:
        """建立交給瀏覽器擴充的短效 Token.

        ``scope=extension_upload``：只能用在 popup 會呼叫的上傳 API，
        其他 API（含換發、刷新、帳號設定）一律 403。帶 ``ver``
        （使用者的 extension_token_version），網站登出（+1）後立刻失效。
        網站自己的 access / refresh Token 不受影響。

        Returns:
            (token, 到期時間 UTC)
        """
        expire = datetime.now(UTC).replace(microsecond=0) + timedelta(
            minutes=settings.JWT_EXTENSION_TOKEN_EXPIRE_MINUTES
        )
        token = AuthService._encode(
            {
                "sub": user_id,
                "exp": expire,
                "type": "access",
                "scope": EXTENSION_SCOPE,
                "ver": extension_token_version,
            }
        )
        return token, expire

    @classmethod
    def token_scope(cls, token: str) -> str | None:
        """回傳 Token 的 scope（一般 Token 為 None）."""
        payload = cls.decode_token(token)
        if not payload:
            return None
        scope = payload.get("scope")
        return scope if isinstance(scope, str) else None

    @classmethod
    def is_extension_token(cls, token: str) -> bool:
        """判斷 Token 是否為擴充專用（只能上傳）Token."""
        return cls.token_scope(token) == EXTENSION_SCOPE

    @staticmethod
    def create_refresh_token(user_id: str) -> str:
        """建立刷新 Token."""
        expire = datetime.now(UTC) + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        return AuthService._encode({"sub": user_id, "exp": expire, "type": "refresh"})

    @staticmethod
    def decode_token(token: str) -> dict[str, Any] | None:
        """解碼 Token."""
        try:
            payload: dict[str, Any] = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def user_extension_token_version(user: User) -> int:
        """使用者目前的 extension_token_version（尚未有值時視為 0）."""
        version = getattr(user, "extension_token_version", 0)
        return version if isinstance(version, int) else 0

    @classmethod
    def extension_version_matches(cls, payload: dict[str, Any], user: User) -> bool:
        """擴充 Token 的 ver 是否等於使用者目前的 extension_token_version."""
        ver = payload.get("ver")
        return isinstance(ver, int) and ver == cls.user_extension_token_version(user)

    def revoke_extension_tokens(self, user: User) -> int:
        """撤銷這個使用者先前發出的所有擴充 Token（網站 Token 不受影響）."""
        user.extension_token_version = self.user_extension_token_version(user) + 1
        self.db.commit()
        return user.extension_token_version

    def get_user_by_email(self, email: str) -> User | None:
        """根據 email 取得使用者."""
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_id(self, user_id: str) -> User | None:
        """根據 ID 取得使用者."""
        return self.db.query(User).filter(User.user_id == user_id).first()

    def username_exists(self, username: str) -> bool:
        """檢查使用者名稱是否已存在."""
        return self.db.query(User).filter(User.username == username).first() is not None

    def register(
        self, username: str, email: str, password: str
    ) -> tuple[UserResponse | None, str | None]:
        """註冊新使用者.

        Returns:
            (UserResponse, None) 成功時
            (None, error_message) 失敗時
        """
        # 檢查 email 是否已存在
        if self.get_user_by_email(email):
            return None, "此電子郵件已被註冊"

        # 檢查使用者名稱是否已存在
        if self.username_exists(username):
            return None, "此使用者名稱已被使用"

        # 建立新使用者
        user = User(
            username=username,
            email=email,
            password_hash=self.hash_password(password),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return UserResponse.model_validate(user), None

    def login(
        self, email: str, password: str
    ) -> tuple[TokenResponse | None, str | None]:
        """使用者登入.

        Returns:
            (TokenResponse, None) 成功時
            (None, error_message) 失敗時
        """
        # 查詢使用者
        user = self.get_user_by_email(email)
        if not user:
            return None, "電子郵件或密碼錯誤"

        # 驗證密碼
        if not self.verify_password(password, user.password_hash):
            return None, "電子郵件或密碼錯誤"

        # 更新最後登入時間
        user.last_login = datetime.now(UTC)
        self.db.commit()

        # 產生 Token
        access_token = self.create_access_token(user.user_id)
        refresh_token = self.create_refresh_token(user.user_id)

        return (
            TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
            ),
            None,
        )

    def refresh_tokens(
        self, refresh_token: str
    ) -> tuple[TokenResponse | None, str | None]:
        """刷新 Token.

        Returns:
            (TokenResponse, None) 成功時
            (None, error_message) 失敗時
        """
        # 解碼刷新 Token
        payload = self.decode_token(refresh_token)
        if not payload:
            return None, "無效或已過期的刷新 Token"

        # 驗證 Token 類型
        if payload.get("type") != "refresh":
            return None, "無效的 Token 類型"

        # 取得使用者
        user_id = payload.get("sub")
        if not user_id:
            return None, "無效的 Token"
        user = self.get_user_by_id(user_id)
        if not user:
            return None, "使用者不存在"

        # 產生新的 Token
        access_token = self.create_access_token(user.user_id)
        new_refresh_token = self.create_refresh_token(user.user_id)

        return (
            TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
            ),
            None,
        )

    def authenticate(self, token: str) -> tuple[User | None, str | None]:
        """驗證存取 Token，回傳 (使用者, scope)；無效、過期或已撤銷回傳 (None, None).

        只有擴充 Token 會檢查 ver（extension_token_version）；網站 Token 照舊。
        """
        payload = self.decode_token(token)
        if not payload or payload.get("type") != "access":
            return None, None
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or not user_id:
            return None, None
        user = self.get_user_by_id(user_id)
        if not user:
            return None, None
        scope = payload.get("scope")
        if scope is None:
            return user, None
        if not isinstance(scope, str):
            return None, None
        if scope == EXTENSION_SCOPE and not self.extension_version_matches(
            payload, user
        ):
            return None, None
        return user, scope

    def get_current_user(self, token: str) -> User | None:
        """從 Token 取得當前使用者（不檢查 scope；scope 由 dependencies 把關）."""
        user, _scope = self.authenticate(token)
        return user
