"""認證服務."""

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domain.schemas.auth import TokenResponse, UserResponse
from app.infrastructure.database.models.user import User

EXTENSION_SCOPE = "extension"


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
    def create_access_token(user_id: str) -> str:
        """建立存取 Token."""
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "access",
        }
        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def create_extension_token(user_id: str) -> tuple[str, datetime]:
        """建立交給瀏覽器擴充的短效 Token.

        仍是 ``type=access``，所以同步 API 可以直接使用；另外帶
        ``scope=extension``，讓它不能再拿來換發新的擴充 Token。

        Returns:
            (token, 到期時間 UTC)
        """
        expire = datetime.now(UTC).replace(microsecond=0) + timedelta(
            minutes=settings.JWT_EXTENSION_TOKEN_EXPIRE_MINUTES
        )
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "access",
            "scope": EXTENSION_SCOPE,
        }
        token = jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        return token, expire

    @classmethod
    def is_extension_token(cls, token: str) -> bool:
        """判斷 Token 是否為擴充專用 Token."""
        payload = cls.decode_token(token)
        if not payload:
            return False
        return payload.get("scope") == EXTENSION_SCOPE

    @staticmethod
    def create_refresh_token(user_id: str) -> str:
        """建立刷新 Token."""
        expire = datetime.now(UTC) + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "refresh",
        }
        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def decode_token(token: str) -> dict[str, str] | None:
        """解碼 Token."""
        try:
            payload: dict[str, str] = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

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

    def get_current_user(self, token: str) -> User | None:
        """從 Token 取得當前使用者."""
        payload = self.decode_token(token)
        if not payload:
            return None

        if payload.get("type") != "access":
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None
        return self.get_user_by_id(user_id)
