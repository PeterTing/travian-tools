"""數據同步 API 端點."""

from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DBSession, UploadUser
from app.domain.schemas.sync import (
    FullSync,
    FullSyncResponse,
    PageSyncRequest,
    PageSyncResponse,
    ReportsSync,
    ReportsSyncResponse,
    SyncResponse,
    TroopStatisticsSync,
    TroopStatisticsSyncResponse,
    TroopSync,
    VillageCenterSync,
    VillageOverviewSync,
)
from app.services.page_sync_service import PageSyncService
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
    current_user: UploadUser,
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
    current_user: UploadUser,
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


@router.post(
    "/reports",
    response_model=ReportsSyncResponse,
    summary="同步報告",
    description="同步戰鬥報告數據",
)
def sync_reports(
    data: ReportsSync,
    db: DBSession,
    current_user: UploadUser,
) -> ReportsSyncResponse:
    """同步報告數據."""
    service = SyncService(db)
    success, message, count, new_count, updated_count = service.sync_reports(
        current_user.user_id, data
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )

    return ReportsSyncResponse(
        success=success,
        message=message,
        synced_at=datetime.now(),
        count=count,
        new_count=new_count,
        updated_count=updated_count,
    )


@router.post(
    "/troop-statistics",
    response_model=TroopStatisticsSyncResponse,
    summary="同步軍隊統計",
    description="從軍隊統計頁面批量同步所有村莊的軍隊數據",
)
def sync_troop_statistics(
    data: TroopStatisticsSync,
    db: DBSession,
    current_user: UploadUser,
) -> TroopStatisticsSyncResponse:
    """同步軍隊統計數據."""
    service = SyncService(db)
    success, message, villages_synced, troops_synced = service.sync_troop_statistics(
        current_user.user_id, data
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )

    return TroopStatisticsSyncResponse(
        success=success,
        message=message,
        synced_at=datetime.now(),
        villages_synced=villages_synced,
        troops_synced=troops_synced,
    )


@router.post(
    "/page",
    response_model=PageSyncResponse,
    summary="同步整頁 HTML",
    description="擴充上傳整頁 HTML，由共用解析器解析後再寫入（不存原始 HTML）",
)
def sync_page(
    data: PageSyncRequest,
    db: DBSession,
    current_user: UploadUser,
) -> PageSyncResponse:
    """同步整頁（P0-03 共用解析器）。"""
    service = PageSyncService(db)
    result = service.sync_page(
        current_user.user_id,
        account_id=data.account_id,
        html=data.html,
        url=data.url,
        page_type=data.page_type,
        server_time=data.server_time,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST
            if "還在做" in str(result.get("message", ""))
            or "還不能" in str(result.get("message", ""))
            else status.HTTP_403_FORBIDDEN,
            detail=result.get("message") or "同步失敗",
        )
    return PageSyncResponse(
        success=True,
        message=str(result.get("message") or "ok"),
        synced_at=datetime.now(),
        page_type=result.get("page_type"),
        village_id=result.get("village_id"),
        count=int(result.get("count") or 0),
        new_count=int(result.get("new_count") or 0),
        updated_count=int(result.get("updated_count") or 0),
        villages_synced=int(result.get("villages_synced") or 0),
        troops_synced=int(result.get("troops_synced") or 0),
    )
