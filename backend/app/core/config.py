"""應用程式配置."""

import re
from functools import lru_cache
from typing import Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# 公開在 repo 裡的預設值：只能在 DEBUG=true 時使用。
DEFAULT_JWT_SECRET_KEY = "your-secret-key-change-in-production"
MIN_JWT_SECRET_LENGTH = 32


class Settings(BaseSettings):
    """應用程式設定."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        # 驗證錯誤不要把輸入值（DATABASE_URL、JWT_SECRET_KEY）印進 log
        hide_input_in_errors=True,
    )

    # 基本設定
    PROJECT_NAME: str = "Travian Tools API"
    VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # 資料庫設定 - 必須從環境變數設定，無預設值
    DATABASE_URL: str

    # CORS 設定 - 生產環境應明確設定 (以逗號分隔的字串)
    # 正式環境（Cloud Run）只放工具網站的正式網址，見 docs/deploy-cloud-run.md
    CORS_ORIGINS: str = ""
    # 允許的擴充 ID（以逗號分隔）。預設是 manifest.json 的 key 固定下來的 ID；
    # 不再接受任意 chrome-extension:// 來源。
    CORS_EXTENSION_IDS: str = "nkgbmaokaapljaciiifbhgohlejmdcdn"

    # JWT 認證設定
    # 預設值只給本機開發（DEBUG=true）用；DEBUG=false 時必須另外設定、
    # 至少 32 字元，否則啟動就失敗（見 _require_real_jwt_secret）。
    JWT_SECRET_KEY: str = DEFAULT_JWT_SECRET_KEY
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
        "public map.sql, at most every 4 hours)"
    )

    # 截圖辨識（P0-07）：後端把使用者上傳的截圖轉給 tt-ocr（RapidOCR，自架 Cloud Run）。
    # 沒設網址時截圖辨識關閉（API 回 503 OCR_UNAVAILABLE）。
    # OCR_AUTH=id_token：用 Cloud Run metadata server 拿 ID token（tt-ocr 不開放匿名呼叫）；
    # OCR_AUTH=none：只給本機開發（docker-compose 的 tt-ocr 容器）。
    OCR_SERVICE_URL: str = ""
    OCR_AUTH: str = "id_token"
    OCR_TIMEOUT_SECONDS: float = 30.0  # 單張上限
    # 一次上傳多張時整批的總時限：要小於 tt-api 的 Cloud Run request timeout（60 秒），
    # 超過就回 504 OCR_TIMEOUT，而不是讓 Cloud Run 回 504 HTML。
    OCR_TOTAL_DEADLINE_SECONDS: float = 50.0
    OCR_MAX_IMAGES: int = 4
    OCR_MAX_IMAGE_BYTES: int = 8 * 1024 * 1024
    # 每位使用者每分鐘最多幾張（記憶體內計數，每個 tt-api instance 各自計算；
    # tt-ocr 另有 max-instances 2、concurrency 1）
    OCR_RATE_LIMIT_PER_MINUTE: int = 12

    @property
    def cors_origins_list(self) -> list[str]:
        """取得 CORS origins 列表."""
        if not self.CORS_ORIGINS:
            return []
        return [i.strip() for i in self.CORS_ORIGINS.split(",") if i.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        """只允許指定 ID 的擴充（chrome-extension://<id>）."""
        ids = [
            i.strip()
            for i in self.CORS_EXTENSION_IDS.split(",")
            if re.fullmatch(r"[a-p]{32}", i.strip())
        ]
        if not ids:
            return None
        return r"^chrome-extension://(" + "|".join(ids) + r")$"

    @model_validator(mode="after")
    def _require_real_jwt_secret(self) -> Self:
        """正式環境（DEBUG=false）不能用公開的預設值或太短的 JWT secret.

        錯誤訊息只說原因，不包含 secret 本身。
        """
        if self.DEBUG:
            return self
        if self.JWT_SECRET_KEY == DEFAULT_JWT_SECRET_KEY:
            raise ValueError(
                "JWT_SECRET_KEY must be set (the built-in default is only "
                "allowed when DEBUG=true)"
            )
        if len(self.JWT_SECRET_KEY) < MIN_JWT_SECRET_LENGTH:
            raise ValueError(
                f"JWT_SECRET_KEY must be at least {MIN_JWT_SECRET_LENGTH} "
                "characters when DEBUG=false"
            )
        return self

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
