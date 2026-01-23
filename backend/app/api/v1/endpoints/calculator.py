"""計算器相關 API 端點."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def calculator_info() -> dict[str, str]:
    """計算器端點資訊."""
    return {"message": "Travian Calculator API", "version": "1.0.0"}
