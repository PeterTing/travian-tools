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
    def create_access_token(user_id: str, token_version: int = 0) -> str:
        """建立存取 Token（帶使用者的 token_version，登出後即失效）."""
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
        return AuthService._encode(
            {"sub": user_id, "exp": expire, "type": "access", "ver": token_version}
        )

    @staticmethod
    def create_extension_token(
        user_id: str, token_version: int = 0
    ) -> tuple[str, datetime]:
        """建立交給瀏覽器擴充的短效 Token.

        ``scope=extension_upload``：只能用在 popup 會呼叫的上傳 API，
        其他 API（含換發、刷新、帳號設定）一律 403。帶 ``ver``，
        網站登出（token_version +1）後立刻失效。

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
                "ver": token_version,
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
    def create_refresh_token(user_id: str, token_version: int = 0) -> str:
        """建立刷新 Token（帶 token_version）."""
        expire = datetime.now(UTC) + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        return AuthService._encode(
            {"sub": user_id, "exp": expire, "type": "refresh", "ver": token_version}
        )

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
    def user_token_version(user: User) -> int:
        """使用者目前的 token_version（尚未有值時視為 0）."""
        version = getattr(user, "token_version", 0)
        return version if isinstance(version, int) else 0

    @classmethod
    def version_matches(cls, payload: dict[str, Any], user: User) -> bool:
        """Token 裡的 ver 是否等於使用者目前的 token_version.

        沒有 ver 的舊 Token 視為 0，所以部署當下已登入的人不會被踢掉；
        第一次登出後就全部失效。
        """
        ver = payload.get("ver", 0)
        return isinstance(ver, int) and ver == cls.user_token_version(user)

    def revoke_tokens(self, user: User) -> int:
        """撤銷這個使用者目前所有 Token（含擴充 Token）：token_version +1."""
        user.token_version = self.user_token_version(user) + 1
        self.db.commit()
        return user.token_version

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
        version = self.user_token_version(user)
        access_token = self.create_access_token(user.user_id, version)
        refresh_token = self.create_refresh_token(user.user_id, version)

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
        if not self.version_matches(payload, user):
            return None, "Token 已撤銷，請重新登入"

        # 產生新的 Token
        version = self.user_token_version(user)
        access_token = self.create_access_token(user.user_id, version)
        new_refresh_token = self.create_refresh_token(user.user_id, version)

        return (
            TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
            ),
            None,
        )

    def authenticate(self, token: str) -> tuple[User | None, str | None]:
        """驗證存取 Token，回傳 (使用者, scope)；無效、過期或已撤銷回傳 (None, None)."""
        payload = self.decode_token(token)
        if not payload or payload.get("type") != "access":
            return None, None
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or not user_id:
            return None, None
        user = self.get_user_by_id(user_id)
        if not user or not self.version_matches(payload, user):
            return None, None
        scope = payload.get("scope")
        return user, scope if isinstance(scope, str) else None

    def get_current_user(self, token: str) -> User | None:
        """從 Token 取得當前使用者（不檢查 scope；scope 由 dependencies 把關）."""
        user, _scope = self.authenticate(token)
        return user
