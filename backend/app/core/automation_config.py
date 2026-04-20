"""自動化執行配置."""

from pydantic import Field
from pydantic_settings import BaseSettings


class AutomationConfig(BaseSettings):
    """自動化執行設定.

    包含所有瀏覽器自動化相關的配置，設計原則為安全優先。
    """

    # Chrome 設定
    CHROME_HEADLESS: bool = Field(
        default=False,
        description="是否使用 Headless 模式（建議 False，更不容易被偵測）",
    )
    CHROME_USER_DATA_DIR: str | None = Field(
        default=None,
        description="Chrome 使用者資料目錄（可選，用於保存登入狀態）",
    )

    # 隨機延遲設定
    MIN_DELAY_SECONDS: float = Field(
        default=1.0,
        ge=0.5,
        description="最小隨機延遲（秒）",
    )
    MAX_DELAY_SECONDS: float = Field(
        default=5.0,
        ge=1.0,
        description="最大隨機延遲（秒）",
    )
    DELAY_MEAN: float = Field(
        default=3.0,
        description="延遲正態分佈的平均值",
    )
    DELAY_STD_DEV: float = Field(
        default=1.0,
        description="延遲正態分佈的標準差",
    )

    # 人類化行為設定
    MOUSE_OFFSET_RANGE: int = Field(
        default=5,
        ge=1,
        le=20,
        description="滑鼠點擊隨機偏移範圍（像素）",
    )
    TYPING_DELAY_MIN: float = Field(
        default=0.05,
        description="打字最小間隔（秒）",
    )
    TYPING_DELAY_MAX: float = Field(
        default=0.15,
        description="打字最大間隔（秒）",
    )

    # 每日操作限制
    DAILY_OPERATION_LIMIT: int = Field(
        default=100,
        ge=1,
        le=500,
        description="每日操作上限",
    )

    # 操作間隔限制（秒）
    MIN_OPERATION_INTERVAL: int = Field(
        default=60,
        ge=30,
        description="最小操作間隔（秒）",
    )

    # 操作時段限制
    ALLOWED_HOURS_START: int = Field(
        default=7,
        ge=0,
        le=23,
        description="允許操作的起始小時（24 小時制）",
    )
    ALLOWED_HOURS_END: int = Field(
        default=23,
        ge=0,
        le=23,
        description="允許操作的結束小時（24 小時制）",
    )

    # 功能開關
    ENABLE_BUILD_EXECUTION: bool = Field(
        default=True,
        description="啟用建造執行功能",
    )
    ENABLE_TRAIN_EXECUTION: bool = Field(
        default=True,
        description="啟用訓練執行功能",
    )
    ENABLE_ADVENTURE_EXECUTION: bool = Field(
        default=False,
        description="啟用冒險執行功能（預設關閉）",
    )
    ENABLE_TRANSPORT_EXECUTION: bool = Field(
        default=True,
        description="啟用運送執行功能",
    )
    ENABLE_KEEPALIVE_EXECUTION: bool = Field(
        default=True,
        description="啟用 Keep-alive 執行功能",
    )

    # 重試設定
    MAX_RETRIES: int = Field(
        default=3,
        ge=1,
        le=5,
        description="執行失敗最大重試次數",
    )
    RETRY_DELAY_SECONDS: float = Field(
        default=5.0,
        description="重試間隔（秒）",
    )

    # 截圖設定
    ENABLE_SCREENSHOTS: bool = Field(
        default=True,
        description="是否保存執行截圖",
    )
    SCREENSHOT_DIR: str = Field(
        default="screenshots",
        description="截圖儲存目錄",
    )

    # 頁面超時設定
    PAGE_LOAD_TIMEOUT: int = Field(
        default=30,
        ge=10,
        le=120,
        description="頁面載入超時（秒）",
    )
    ELEMENT_WAIT_TIMEOUT: int = Field(
        default=10,
        ge=5,
        le=60,
        description="元素等待超時（秒）",
    )

    class Config:
        """Pydantic 配置."""

        env_prefix = "AUTOMATION_"


# 全域配置實例
automation_config = AutomationConfig()
