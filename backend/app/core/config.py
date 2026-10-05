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
    # 交給瀏覽器擴充的登入憑證有效時間（分鐘）。過期後擴充視為登出，
    # 使用者再打開工具網站就會自動換發新的。
    JWT_EXTENSION_TOKEN_EXPIRE_MINUTES: int = 480

    # map.sql 每日抓取（唯一允許連線至 Travian 的功能）
    # 只下載公開的 /map.sql：不帶 cookie/憑證、不用瀏覽器、固定排程。
    # 預設開啟（PM 決定）；設為 false 可停用。啟動時不會立即抓取，只在排程時間執行。
    MAP_SQL_DAILY_FETCH_ENABLED: bool = True
    MAP_SQL_FETCH_HOUR_UTC: int = 4
    MAP_SQL_FETCH_MINUTE_UTC: int = 15
    MAP_SQL_USER_AGENT: str = (
        "travian-tools-mapsql/0.1 (+https://github.com/PeterTing/travian-tools; "
        "public map.sql, once per day)"
    )

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
