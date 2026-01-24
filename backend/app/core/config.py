"""應用程式配置."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """應用程式設定."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # 基本設定
    PROJECT_NAME: str = "Travian Tools API"
    VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # 資料庫設定 - 必須從環境變數設定，無預設值
    DATABASE_URL: str

    # CORS 設定 - 生產環境應明確設定 (以逗號分隔的字串)
    CORS_ORIGINS: str = ""

    # JWT 認證設定
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @property
    def cors_origins_list(self) -> list[str]:
        """取得 CORS origins 列表."""
        if not self.CORS_ORIGINS:
            return []
        return [i.strip() for i in self.CORS_ORIGINS.split(",") if i.strip()]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """驗證資料庫 URL 不為空."""
        if not v or v == "":
            raise ValueError("DATABASE_URL must be set via environment variable")
        return v


@lru_cache
def get_settings() -> Settings:
    """取得應用程式設定 (cached)."""
    return Settings()


settings = get_settings()
