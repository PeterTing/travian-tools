"""即時資料抓取 API 端點.

直接從 Travian 遊戲頁面抓取資料，支援自動登入。
支援背景同步和快取資料（使用 ARQ 任務隊列）。
"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.config import settings
from app.core.dependencies import CurrentUser, DBSession
from app.infrastructure.database.models.game_account import GameAccount
from app.services.village_scraper_service import VillageScraperService
from app.services.village_stats_sync_service import VillageStatsSyncService
from app.services.village_sync_service import VillageSyncService
from app.workers.sync_worker import get_arq_pool

logger = logging.getLogger(__name__)


class SyncAllRequest(BaseModel):
    """同步所有村莊請求."""

    server_url: str
    account_id: str | None = None


router = APIRouter(prefix="/scraper", tags=["scraper"])


def _normalize_server_url(url: str) -> str:
    """正規化伺服器 URL（移除結尾斜線）."""
    return url.rstrip("/")


def _find_account_by_server_url(
    db: DBSession,
    user_id: str,
    server_url: str,
) -> GameAccount | None:
    """透過 server_url 找到對應的帳號（處理有無斜線的差異）.

    優先返回有最新村莊同步的帳號，避免因為 server_url 格式不一致而返回舊資料。
    """
    from sqlalchemy import case, func

    from app.infrastructure.database.models.village import Village

    normalized_url = _normalize_server_url(server_url)
    urls_to_check = [server_url, f"{normalized_url}/", normalized_url]
    # 移除重複
    urls_to_check = list(dict.fromkeys(urls_to_check))

    logger.debug(f"[_find_account] user_id={user_id}, urls_to_check={urls_to_check}")

    # 找到所有匹配的帳號，並依照村莊最後更新時間排序
    # MySQL 不支援 NULLS LAST，用 CASE 模擬：NULL 排最後
    max_last_updated = func.max(Village.last_updated)
    accounts_with_sync_time = (
        db.query(GameAccount, max_last_updated.label("last_sync"))
        .outerjoin(Village, GameAccount.account_id == Village.account_id)
        .filter(
            GameAccount.user_id == user_id,
            GameAccount.server_url.in_(urls_to_check),
            GameAccount.is_active == True,  # noqa: E712
        )
        .group_by(GameAccount.account_id)
        .order_by(
            # NULL 排最後：has_sync = 0 for NULL, 1 for non-NULL
            case((max_last_updated.is_(None), 0), else_=1).desc(),
            max_last_updated.desc(),
        )
        .first()
    )

    if accounts_with_sync_time:
        logger.debug(
            f"[_find_account] Found account: {accounts_with_sync_time[0].account_id}"
        )
        return accounts_with_sync_time[0]

    logger.debug(f"[_find_account] No account found for user_id={user_id}")
    return None


def _get_account_credentials(
    db: DBSession, user_id: str, account_id: str | None, server_url: str
) -> tuple[str | None, str | None]:
    """從資料庫取得帳號的登入憑證.

    Args:
        db: 資料庫 session
        user_id: 使用者 ID
        account_id: 遊戲帳號 ID（可選）
        server_url: 伺服器 URL

    Returns:
        (login_email, login_password) 或 (None, None)
    """
    query = db.query(GameAccount).filter(
        GameAccount.user_id == user_id,
        GameAccount.is_active == True,  # noqa: E712
    )

    if account_id:
        query = query.filter(GameAccount.account_id == account_id)
    else:
        # 透過 server_url 找到對應的帳號
        query = query.filter(GameAccount.server_url == server_url)

    account = query.first()

    if account and account.login_email and account.login_password:
        return account.login_email, account.login_password

    # 使用環境變數預設憑證
    if settings.TRAVIAN_LOGIN_EMAIL and settings.TRAVIAN_LOGIN_PASSWORD:
        return settings.TRAVIAN_LOGIN_EMAIL, settings.TRAVIAN_LOGIN_PASSWORD

    return None, None


@router.get(
    "/villages",
    summary="即時取得村莊列表",
    description="直接從 Travian 遊戲頁面抓取村莊列表，支援自動登入",
)
async def scrape_village_list(
    db: DBSession,
    current_user: CurrentUser,
    server_url: str = Query(..., description="Travian 伺服器 URL"),
    account_id: str | None = Query(None, description="遊戲帳號 ID（可選）"),
) -> dict[str, Any]:
    """即時取得村莊列表.

    Args:
        server_url: Travian 伺服器 URL (例如 https://nys.x1.asia.travian.com)
        account_id: 遊戲帳號 ID（用於取得登入憑證）

    Returns:
        村莊列表，包含被攻擊狀態
    """
    # 從資料庫取得登入憑證
    login_email, login_password = _get_account_credentials(
        db, current_user.user_id, account_id, server_url
    )

    service = VillageScraperService(
        login_email=login_email, login_password=login_password
    )
    try:
        await service._start_browser()

        villages = await service.get_village_list(server_url)
        attacked_count = sum(1 for v in villages if v.has_attack)

        return {
            "success": True,
            "total": len(villages),
            "attacked_count": attacked_count,
            "villages": [
                {
                    "village_id": v.village_id,
                    "name": v.name,
                    "coordinates": {"x": v.coordinates[0], "y": v.coordinates[1]},
                    "is_capital": v.is_capital,
                    "has_attack": v.has_attack,
                }
                for v in villages
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        await service._stop_browser()


@router.get(
    "/villages/{village_id}",
    summary="即時取得村莊詳情",
    description="直接從 Travian 遊戲頁面抓取村莊詳細資訊",
)
async def scrape_village_detail(
    village_id: str,
    db: DBSession,
    current_user: CurrentUser,
    server_url: str = Query(..., description="Travian 伺服器 URL"),
    account_id: str | None = Query(None, description="遊戲帳號 ID（可選）"),
) -> dict[str, Any]:
    """即時取得村莊詳細資訊.

    Args:
        village_id: 村莊 ID
        server_url: Travian 伺服器 URL

    Returns:
        村莊詳細資訊（資源、建築佇列、部隊等）
    """
    # 從資料庫取得登入憑證
    login_email, login_password = _get_account_credentials(
        db, current_user.user_id, account_id, server_url
    )

    service = VillageScraperService(
        login_email=login_email, login_password=login_password
    )
    try:
        await service._start_browser()

        detail = await service.get_village_detail(server_url, village_id)

        if not detail:
            raise HTTPException(status_code=404, detail="村莊不存在或無法取得資訊")

        return {
            "success": True,
            "village": {
                "village_id": detail.village_id,
                "name": detail.name,
                "coordinates": {
                    "x": detail.coordinates[0],
                    "y": detail.coordinates[1],
                },
                "is_capital": detail.is_capital,
                "has_incoming_attack": detail.has_incoming_attack,
                "attack_count": detail.attack_count,
                "resources": {
                    "wood": detail.resources.wood,
                    "clay": detail.resources.clay,
                    "iron": detail.resources.iron,
                    "crop": detail.resources.crop,
                    "free_crop": detail.resources.free_crop,
                    "warehouse_capacity": detail.resources.warehouse_capacity,
                    "granary_capacity": detail.resources.granary_capacity,
                    "production": {
                        "wood": detail.resources.wood_production,
                        "clay": detail.resources.clay_production,
                        "iron": detail.resources.iron_production,
                        "crop": detail.resources.crop_production,
                    },
                },
                "building_queue": [
                    {
                        "name": b.name,
                        "level": b.level,
                        "finish_time": b.finish_time,
                        "countdown_seconds": b.countdown_seconds,
                    }
                    for b in detail.building_queue
                ],
                "troops_home": [
                    {
                        "unit_id": t.unit_id,
                        "name": t.name,
                        "count": t.count,
                    }
                    for t in detail.troops_home
                ],
                "troop_movements": [
                    {
                        "type": m.movement_type,
                        "description": m.description,
                        "arrival_time": m.arrival_time,
                        "countdown_seconds": m.countdown_seconds,
                        "troops": [
                            {"unit_id": t.unit_id, "name": t.name, "count": t.count}
                            for t in m.troops
                        ],
                    }
                    for m in detail.troop_movements
                ],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        await service._stop_browser()


@router.get(
    "/summary",
    summary="即時取得所有村莊摘要",
    description="直接從 Travian 遊戲頁面抓取所有村莊的摘要資訊",
)
async def scrape_villages_summary(
    db: DBSession,
    current_user: CurrentUser,
    server_url: str = Query(..., description="Travian 伺服器 URL"),
    account_id: str | None = Query(None, description="遊戲帳號 ID（可選）"),
) -> dict[str, Any]:
    """即時取得所有村莊摘要.

    Args:
        server_url: Travian 伺服器 URL

    Returns:
        所有村莊的摘要資訊
    """
    # 從資料庫取得登入憑證
    login_email, login_password = _get_account_credentials(
        db, current_user.user_id, account_id, server_url
    )

    service = VillageScraperService(
        login_email=login_email, login_password=login_password
    )
    try:
        summary = await service.get_all_villages_summary(server_url)

        if "error" in summary:
            raise HTTPException(status_code=500, detail=summary["error"])

        return {"success": True, **summary}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


# ==================== 背景同步 API ====================


async def enqueue_sync_task(task_id: str) -> None:
    """將同步任務排入 ARQ 隊列.

    使用 ARQ (Redis-based task queue) 提供：
    - 任務持久化：伺服器重啟後任務會恢復
    - 重試機制：任務失敗後自動重試
    - 可監控：可以查看任務狀態和歷史
    """
    try:
        pool = await get_arq_pool()
        await pool.enqueue_job(
            "sync_all_villages_task",
            task_id,
            _job_id=f"sync_{task_id}",
        )
        await pool.close()
        logger.info(f"[ARQ] 同步任務已排入隊列: {task_id}")
    except Exception as e:
        logger.error(f"[ARQ] 排入任務失敗: {task_id} - {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="任務隊列服務不可用，請稍後再試",
        ) from e


@router.post(
    "/sync-all",
    summary="啟動背景同步所有村莊",
    description="建立背景任務同步所有村莊資料到資料庫",
)
async def sync_all_villages(
    request: SyncAllRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """啟動背景同步所有村莊.

    Args:
        request: 同步請求

    Returns:
        task_id 和狀態
    """
    logger.info(f">>> 收到同步請求: server_url={request.server_url}")

    # 取得帳號 ID
    account_id = request.account_id
    if not account_id:
        # 透過 server_url 找到對應的帳號
        account = _find_account_by_server_url(
            db, current_user.user_id, request.server_url
        )
        if not account:
            raise HTTPException(
                status_code=404,
                detail="找不到對應的遊戲帳號，請先建立帳號",
            )
        account_id = account.account_id

    sync_service = VillageSyncService(db)
    # 使用帳號的 server_url（已正規化）
    server_url = account.server_url if account else request.server_url

    logger.info(f">>> 帳號 ID: {account_id}, server_url: {server_url}")

    # 只建立任務記錄
    task_id, is_new = await sync_service.create_sync_task(
        account_id=account_id,
        server_url=server_url,
    )

    if is_new:
        logger.info(f">>> 同步任務已建立: {task_id}")
        # 使用 ARQ 排入任務隊列
        await enqueue_sync_task(task_id)
        return {
            "task_id": task_id,
            "status": "pending",
            "message": "同步任務已建立",
        }
    else:
        logger.info(f">>> 已有進行中的同步任務: {task_id}")
        return {
            "task_id": task_id,
            "status": "in_progress",
            "message": "已有進行中的同步任務",
        }


@router.get(
    "/sync-status/{task_id}",
    summary="取得同步任務狀態",
    description="查詢背景同步任務的進度和狀態",
)
async def get_sync_status(
    task_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """取得同步任務狀態.

    Args:
        task_id: 同步任務 ID

    Returns:
        同步狀態和進度
    """
    sync_service = VillageSyncService(db)
    status = sync_service.get_sync_status(task_id)

    if not status:
        raise HTTPException(status_code=404, detail="找不到同步任務")

    return status


@router.get(
    "/cached-data",
    summary="取得快取的村莊資料",
    description="從資料庫取得已同步的村莊資料",
)
async def get_cached_villages(
    db: DBSession,
    current_user: CurrentUser,
    server_url: str = Query(..., description="Travian 伺服器 URL"),
    account_id: str | None = Query(None, description="遊戲帳號 ID（可選）"),
) -> dict[str, Any]:
    """取得快取的村莊資料.

    Args:
        server_url: Travian 伺服器 URL
        account_id: 遊戲帳號 ID（可選）

    Returns:
        村莊資料和同步時間
    """
    # 取得帳號 ID
    if not account_id:
        account = _find_account_by_server_url(db, current_user.user_id, server_url)
        if not account:
            raise HTTPException(
                status_code=404,
                detail="找不到對應的遊戲帳號",
            )
        account_id = account.account_id

    sync_service = VillageSyncService(db)
    data = sync_service.get_cached_villages(account_id)

    return {
        "success": True,
        **data,
    }


# ==================== Statistics 頁面同步 API ====================


@router.post(
    "/sync-stats",
    summary="透過 Statistics 頁面同步所有村莊",
    description="使用 4 個 Statistics 頁面一次同步所有村莊資料（取代逐村抓取）",
)
async def sync_via_statistics(
    request: SyncAllRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """透過 Statistics 頁面同步."""
    # Find account
    account_id = request.account_id
    if not account_id:
        account = _find_account_by_server_url(
            db, current_user.user_id, request.server_url
        )
        if not account:
            raise HTTPException(status_code=404, detail="找不到對應的遊戲帳號")
        account_id = account.account_id
    else:
        account = (
            db.query(GameAccount)
            .filter(
                GameAccount.account_id == account_id,
                GameAccount.user_id == current_user.user_id,
            )
            .first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="找不到對應的遊戲帳號")

    # Get credentials
    login_email, login_password = _get_account_credentials(
        db, current_user.user_id, account_id, account.server_url
    )

    if not login_email or not login_password:
        raise HTTPException(status_code=400, detail="遊戲帳號未設定登入憑證")

    # Sync via Statistics pages
    service = VillageStatsSyncService(db)
    result = await service.sync_all(
        server_url=account.server_url,
        account_id=account_id,
        login_email=login_email,
        login_password=login_password,
    )

    return result
