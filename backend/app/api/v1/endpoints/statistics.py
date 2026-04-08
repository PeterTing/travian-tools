"""統計查詢 API 端點.

所有查詢端點為公開（不需認證），手動快照觸發端點需要認證。
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_db
from app.domain.schemas.statistics import (
    PaginatedResponse,
    ServerOverview,
)
from app.services.snapshot_scheduler import SnapshotScheduler
from app.services.statistics_service import StatisticsService

router = APIRouter(prefix="/statistics", tags=["Statistics"])


@router.get("/server-overview", response_model=ServerOverview | None)
async def get_server_overview(
    server_url: str = Query(..., description="伺服器 URL"),
    db: Session = Depends(get_db),
) -> ServerOverview | None:
    """取得伺服器總覽.

    包含今天和昨天的統計數據。
    """
    service = StatisticsService(db)
    result = service.get_server_overview(server_url)
    if result is None:
        return None
    return ServerOverview(**result)


@router.get("/players/ranking", response_model=PaginatedResponse)
async def get_player_ranking(
    server_url: str = Query(..., description="伺服器 URL"),
    sort_by: str = Query("population", description="排序欄位"),
    order: str = Query("desc", description="排序方向"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁筆數"),
    search: str | None = Query(None, description="搜尋玩家名稱"),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """取得玩家排名.

    支援按人口、村莊數排序，支援搜尋過濾。
    """
    service = StatisticsService(db)
    items, total = service.get_player_ranking(
        server_url=server_url,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
        search=search,
    )
    return PaginatedResponse(
        items=[item.model_dump() for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/alliances/ranking", response_model=PaginatedResponse)
async def get_alliance_ranking(
    server_url: str = Query(..., description="伺服器 URL"),
    sort_by: str = Query("population", description="排序欄位"),
    order: str = Query("desc", description="排序方向"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁筆數"),
    search: str | None = Query(None, description="搜尋聯盟名稱"),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """取得聯盟排名.

    支援按人口、成員數排序，支援搜尋過濾。
    """
    service = StatisticsService(db)
    items, total = service.get_alliance_ranking(
        server_url=server_url,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
        search=search,
    )
    return PaginatedResponse(
        items=[item.model_dump() for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/conquests", response_model=PaginatedResponse)
async def get_conquests(
    server_url: str = Query(..., description="伺服器 URL"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁筆數"),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """取得征服記錄.

    按偵測時間降序排列。
    """
    service = StatisticsService(db)
    items, total = service.get_conquests(
        server_url=server_url,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        items=[item.model_dump() for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/name-changes", response_model=PaginatedResponse)
async def get_name_changes(
    server_url: str = Query(..., description="伺服器 URL"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁筆數"),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """取得玩家改名記錄.

    按偵測時間降序排列。
    """
    service = StatisticsService(db)
    items, total = service.get_name_changes(
        server_url=server_url,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        items=[item.model_dump() for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/search/inactives", response_model=PaginatedResponse)
async def search_inactive_villages(
    server_url: str = Query(..., description="伺服器 URL"),
    center_x: int = Query(0, description="中心 X 座標"),
    center_y: int = Query(0, description="中心 Y 座標"),
    radius: int = Query(50, ge=1, le=400, description="搜尋半徑"),
    max_population_change: int = Query(2, description="最大人口變化量"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(50, ge=1, le=200, description="每頁筆數"),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """搜尋不活躍村莊.

    在指定座標範圍內搜尋人口變化低於閾值的村莊。
    """
    service = StatisticsService(db)
    items, total = service.search_inactive_villages(
        server_url=server_url,
        center_x=center_x,
        center_y=center_y,
        radius=radius,
        max_population_change=max_population_change,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        items=[item.model_dump() for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/snapshot/trigger")
async def trigger_snapshot(
    server_url: str = Query(..., description="伺服器 URL"),
    current_user: CurrentUser = None,
    db: Session = Depends(get_db),
) -> dict:
    """手動觸發快照下載.

    需要認證。觸發指定伺服器的 map.sql 下載和處理。
    """
    scheduler = SnapshotScheduler(db)
    result = scheduler.download_snapshot(server_url)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"無法下載 {server_url} 的快照",
        )

    return {
        "success": True,
        "message": "快照下載完成",
        **result,
    }
