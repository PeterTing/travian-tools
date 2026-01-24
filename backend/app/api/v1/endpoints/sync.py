"""數據同步 API 端點."""

from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.sync import (
    FullSync,
    FullSyncResponse,
    SyncResponse,
    TroopSync,
    VillageCenterSync,
    VillageOverviewSync,
)
from app.services.sync_service import SyncService

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post(
    "/village-overview",
    response_model=SyncResponse,
    summary="同步村莊總覽",
    description="同步村莊資源田數據（對應 dorf1.php）",
)
def sync_village_overview(
    data: VillageOverviewSync,
    db: DBSession,
    current_user: CurrentUser,
) -> SyncResponse:
    """同步村莊總覽數據."""
    service = SyncService(db)
    success, message, village_id = service.sync_village_overview(
        current_user.user_id, data
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )

    return SyncResponse(
        success=success,
        message=message,
        synced_at=datetime.now(),
        village_id=village_id,
    )


@router.post(
    "/village-center",
    response_model=SyncResponse,
    summary="同步村莊中心",
    description="同步村莊建築數據（對應 dorf2.php）",
)
def sync_village_center(
    data: VillageCenterSync,
    db: DBSession,
    current_user: CurrentUser,
) -> SyncResponse:
    """同步村莊中心數據."""
    service = SyncService(db)
    success, message, village_id = service.sync_village_center(
        current_user.user_id, data
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )

    return SyncResponse(
        success=success,
        message=message,
        synced_at=datetime.now(),
        village_id=village_id,
    )


@router.post(
    "/troops",
    response_model=SyncResponse,
    summary="同步部隊",
    description="同步村莊部隊數據",
)
def sync_troops(
    data: TroopSync,
    db: DBSession,
    current_user: CurrentUser,
) -> SyncResponse:
    """同步部隊數據."""
    service = SyncService(db)
    success, message = service.sync_troops(current_user.user_id, data)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN
            if "無權" in message
            else status.HTTP_404_NOT_FOUND,
            detail=message,
        )

    return SyncResponse(
        success=success,
        message=message,
        synced_at=datetime.now(),
        village_id=data.village_id,
    )


@router.post(
    "/full",
    response_model=FullSyncResponse,
    summary="完整同步",
    description="同步所有村莊數據",
)
def sync_full(
    data: FullSync,
    db: DBSession,
    current_user: CurrentUser,
) -> FullSyncResponse:
    """完整同步."""
    service = SyncService(db)
    success, message, villages, buildings, troops = service.sync_full(
        current_user.user_id, data
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )

    return FullSyncResponse(
        success=success,
        message=message,
        synced_at=datetime.now(),
        villages_synced=villages,
        buildings_synced=buildings,
        troops_synced=troops,
    )
