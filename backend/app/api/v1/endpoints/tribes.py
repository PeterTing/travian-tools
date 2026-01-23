"""部落相關 API 端點."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_tribes() -> dict[str, list[str]]:
    """取得所有部落列表."""
    return {"tribes": ["romans", "gauls", "teutons", "huns", "egyptians"]}


@router.get("/{tribe_name}")
async def get_tribe(tribe_name: str) -> dict[str, str]:
    """取得特定部落資訊."""
    return {
        "name": tribe_name,
        "description": f"{tribe_name.capitalize()} tribe information",
    }
