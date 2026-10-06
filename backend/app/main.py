"""FastAPI 應用程式入口點."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_v1_router
from app.core.config import settings
from app.services.map_sql_scheduler import map_sql_scheduler

# 配置 logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """應用程式生命週期管理."""
    # 啟動時：只有固定排程（每日公開 map.sql 抓取 + log 清理）
    map_sql_scheduler.start()
    yield
    # 關閉時
    map_sql_scheduler.shutdown()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Travian: Legends 助手系統 API",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS 設定 - 限制允許的來源、方法和標頭
# 網頁來源只看 CORS_ORIGINS（正式環境只有工具網站）；擴充只允許
# CORS_EXTENSION_IDS 列出的 ID，不再放行任意 chrome-extension://。
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex,
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
