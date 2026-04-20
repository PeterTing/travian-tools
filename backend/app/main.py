"""FastAPI 應用程式入口點."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_v1_router
from app.core.config import settings
from app.services.scheduler_service import scheduler_service

# 配置 logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

# 設定特定模組的 log 級別
logging.getLogger("app.services.scheduler_service").setLevel(logging.INFO)
logging.getLogger("app.services.village_sync_service").setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """應用程式生命週期管理."""
    # 啟動時
    scheduler_service.start()
    # 載入待處理的完成事件
    scheduler_service.load_pending_completion_events()
    # 恢復所有帳號的週期性同步任務
    scheduler_service.restore_periodic_sync_jobs()
    yield
    # 關閉時
    scheduler_service.shutdown()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Travian: Legends 助手系統 API",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS 設定 - 限制允許的方法和標頭
# 對於 Chrome 擴充功能，需要允許 chrome-extension:// origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^chrome-extension://.*$",  # 允許所有 Chrome 擴充功能
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """健康檢查端點."""
    return {"status": "healthy"}


# 註冊 API 路由
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
