"""進階計算器 API 端點."""

from fastapi import APIRouter

from app.domain.schemas.advanced_calculator import (
    CulturePointsRequest,
    CulturePointsResponse,
    InterceptionRequest,
    InterceptionResponse,
    NpcCalculatorRequest,
    NpcCalculatorResponse,
    PathCalculatorRequest,
    PathCalculatorResponse,
    PathSpeedTsRequest,
    PathSpeedTsResponse,
    SaveTroopsRequest,
    SaveTroopsResponse,
    TechnologyRequest,
    TechnologyResponse,
)
from app.services.advanced_calculator_service import get_advanced_calculator_service

router = APIRouter()


@router.post("/path", response_model=PathCalculatorResponse)
async def calculate_path(request: PathCalculatorRequest) -> PathCalculatorResponse:
    """路徑計算器 — 計算兩點間行進時間."""
    service = get_advanced_calculator_service()
    return service.calculate_path(request)


@router.post("/interception", response_model=InterceptionResponse)
async def calculate_interception(
    request: InterceptionRequest,
) -> InterceptionResponse:
    """攔截計算器 — 計算何時派兵攔截歸途攻擊者."""
    service = get_advanced_calculator_service()
    return service.calculate_interception(request)


@router.post("/culture-points", response_model=CulturePointsResponse)
async def calculate_culture_points(
    request: CulturePointsRequest,
) -> CulturePointsResponse:
    """文化點計算器 — 計算各村莊所需文化點及預估日期."""
    service = get_advanced_calculator_service()
    return service.calculate_culture_points(request)


@router.post("/technology", response_model=TechnologyResponse)
async def calculate_technology(request: TechnologyRequest) -> TechnologyResponse:
    """科技計算器 — 計算各研究等級的兵種數值."""
    service = get_advanced_calculator_service()
    return service.calculate_technology(request)


@router.post("/npc", response_model=NpcCalculatorResponse)
async def calculate_npc(request: NpcCalculatorRequest) -> NpcCalculatorResponse:
    """NPC 計算器 — 按比例重新分配資源."""
    service = get_advanced_calculator_service()
    return service.calculate_npc(request)


@router.post("/save-troops", response_model=SaveTroopsResponse)
async def calculate_save_troops(
    request: SaveTroopsRequest,
) -> SaveTroopsResponse:
    """避兵計算器 — 計算派兵保護的理想距離."""
    service = get_advanced_calculator_service()
    return service.calculate_save_troops(request)


@router.post("/path-speed-ts", response_model=PathSpeedTsResponse)
async def calculate_path_speed_ts(
    request: PathSpeedTsRequest,
) -> PathSpeedTsResponse:
    """TS 反推計算器 — 從已知距離和時間反推速度 + TS 組合."""
    service = get_advanced_calculator_service()
    return service.calculate_path_speed_ts(request)
