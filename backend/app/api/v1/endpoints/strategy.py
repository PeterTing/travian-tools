"""策略建議 API 端點."""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.strategy import (
    HealthCheckRequest,
    HealthCheckResponse,
    PhaseDetectionRequest,
    PhaseDetectionResponse,
)
from app.services.strategy_service import StrategyService

router = APIRouter(prefix="/strategy", tags=["strategy"])


@router.post("/phase", response_model=PhaseDetectionResponse)
async def detect_game_phase(
    request: PhaseDetectionRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> PhaseDetectionResponse:
    """偵測遊戲階段.

    根據帳號的天數、村莊數、人口等數據判斷當前遊戲階段，
    並提供該階段的標準目標和策略建議。

    Args:
        request: 包含 account_id 的請求
        db: 資料庫 session
        current_user: 當前登入用戶

    Returns:
        PhaseDetectionResponse: 階段判斷結果

    Raises:
        HTTPException: 帳號不存在或無權限
    """
    service = StrategyService(db)
    result = service.detect_phase(request.account_id, current_user.user_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該遊戲帳號或無權限存取",
        )

    return result


@router.post("/health-check", response_model=HealthCheckResponse)
async def health_check(
    request: HealthCheckRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> HealthCheckResponse:
    """帳號健康檢查.

    全面診斷帳號狀況，包括：
    - 糧食平衡狀況
    - 文化點產出效率
    - 村莊配置合理性
    - 部隊訓練進度
    - 資源利用率

    Args:
        request: 包含 account_id 的請求
        db: 資料庫 session
        current_user: 當前登入用戶

    Returns:
        HealthCheckResponse: 健康檢查結果，包含總體評分和改進建議

    Raises:
        HTTPException: 帳號不存在或無權限
    """
    service = StrategyService(db)
    result = service.health_check(request.account_id, current_user.user_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該遊戲帳號或無權限存取",
        )

    return result
