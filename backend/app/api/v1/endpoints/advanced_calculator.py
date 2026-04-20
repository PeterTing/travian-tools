"""進階計算器 API 端點."""

from fastapi import APIRouter

from app.domain.schemas.advanced_calculator import (
    CropScouterRequest,
    CropScouterResponse,
    CulturePointsRequest,
    CulturePointsResponse,
    FakeTroopsRequest,
    FakeTroopsResponse,
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
    TsOptimizerRequest,
    TsOptimizerResponse,
    VillageBuilderRequest,
    VillageBuilderResponse,
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


@router.post("/village-builder", response_model=VillageBuilderResponse)
async def calculate_village_builder(
    request: VillageBuilderRequest,
) -> VillageBuilderResponse:
    """最佳建造順序計算器 — 依 cropper 類型 + 綠洲 + Plus 產出 Lumi 風格建造序列."""
    service = get_advanced_calculator_service()
    return service.calculate_village_builder(request)


@router.post("/crop-scouter", response_model=CropScouterResponse)
async def calculate_crop_scouter(
    request: CropScouterRequest,
) -> CropScouterResponse:
    """首都類型反推器 — 從偵查產量推測對手 cropper 類型."""
    service = get_advanced_calculator_service()
    return service.calculate_crop_scouter(request)


@router.post("/ts-optimizer", response_model=TsOptimizerResponse)
async def calculate_ts_optimizer(
    request: TsOptimizerRequest,
) -> TsOptimizerResponse:
    """攻擊 TS 優化器 — 多個攻擊者對同一目標同步抵達時間."""
    service = get_advanced_calculator_service()
    return service.calculate_ts_optimizer(request)


@router.post("/fake-troops", response_model=FakeTroopsResponse)
async def calculate_fake_troops(
    request: FakeTroopsRequest,
) -> FakeTroopsResponse:
    """佯攻部隊計算器 — 計算看起來像真打的最小兵量."""
    service = get_advanced_calculator_service()
    return service.calculate_fake_troops(request)
