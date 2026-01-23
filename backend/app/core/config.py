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

    # CORS 設定 - 生產環境應明確設定
    CORS_ORIGINS: list[str] = []

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """驗證資料庫 URL 不為空."""
        if not v or v == "":
            raise ValueError("DATABASE_URL must be set via environment variable")
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        """解析 CORS origins."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        raise ValueError(v)


@lru_cache
def get_settings() -> Settings:
    """取得應用程式設定 (cached)."""
    return Settings()


settings = get_settings()
