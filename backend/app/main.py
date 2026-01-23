"""FastAPI 應用程式入口點."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_v1_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Travian: Legends 助手系統 API",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 設定 - 限制允許的方法和標頭
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
