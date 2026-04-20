"""村莊同步 ARQ Worker.

這個 worker 負責執行背景同步任務，使用 Redis 作為任務隊列。
相較於 threading hack，ARQ 提供：
- 任務持久化：伺服器重啟後任務會恢復
- 重試機制：任務失敗後自動重試
- 監控：可以查看任務狀態和歷史
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.core.config import settings
from app.infrastructure.database.models import (
    CompletionEvent,
    CompletionEventType,
    GameAccount,
    SyncTaskStatus,
    Village,
    VillageSyncTask,
)
from app.infrastructure.database.session import SessionLocal
from app.services.village_scraper_service import VillageScraperService

logger = logging.getLogger(__name__)


def get_redis_settings() -> RedisSettings:
    """取得 Redis 連線設定."""
    return RedisSettings(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        database=settings.REDIS_DB,
    )


async def get_arq_pool() -> ArqRedis:
    """取得 ARQ Redis 連線池."""
    return await create_pool(get_redis_settings())


# ==================== 任務函數 ====================


async def sync_all_villages_task(
    ctx: dict[str, Any],
    task_id: str,
) -> dict[str, Any]:
    """同步所有村莊的背景任務.

    Args:
        ctx: ARQ context（包含 redis 連線等）
        task_id: 同步任務 ID

    Returns:
        任務結果
    """
    logger.info(f"[ARQ] 開始執行同步任務: {task_id}")

    db = SessionLocal()

    try:
        # 取得同步任務
        sync_task = (
            db.query(VillageSyncTask).filter(VillageSyncTask.task_id == task_id).first()
        )

        if not sync_task:
            logger.error(f"[ARQ] 同步任務不存在: {task_id}")
            return {"success": False, "error": "Task not found"}

        # 取得帳號憑證
        account = (
            db.query(GameAccount)
            .filter(GameAccount.account_id == sync_task.account_id)
            .first()
        )

        login_email = account.login_email if account else None
        login_password = account.login_password if account else None

        if not login_email:
            login_email = settings.TRAVIAN_LOGIN_EMAIL
        if not login_password:
            login_password = settings.TRAVIAN_LOGIN_PASSWORD

        # 更新任務狀態
        sync_task.status = SyncTaskStatus.IN_PROGRESS
        sync_task.started_at = datetime.now(UTC)
        db.commit()

        # 第一步：用單一瀏覽器取得村莊列表
        list_scraper = VillageScraperService(
            login_email=login_email,
            login_password=login_password,
        )

        try:
            logger.info("[ARQ] 啟動瀏覽器取得村莊列表...")
            await list_scraper._start_browser()

            # 取得村莊列表
            villages = await list_scraper.get_village_list(sync_task.server_url)
            sync_task.total_villages = len(villages)
            db.commit()

            logger.info(f"[ARQ] 找到 {len(villages)} 個村莊")
        finally:
            await list_scraper._stop_browser()

        try:
            logger.info(f"[ARQ] 開始順序同步 {len(villages)} 個村莊（單一瀏覽器）")

            # 使用單一瀏覽器實例順序處理所有村莊（類似 travian-bot 策略）
            # 優點：更穩定、更不容易被偵測、資源佔用更少
            scraper = VillageScraperService(
                login_email=login_email,
                login_password=login_password,
            )

            synced_count = 0

            try:
                await scraper._start_browser()

                for village_info in villages:
                    try:
                        logger.info(
                            f"[ARQ] 同步村莊: {village_info.name} (id={village_info.village_id})"
                        )

                        # 更新當前同步的村莊名稱
                        sync_task.current_village_name = village_info.name
                        db.commit()

                        village_detail = await scraper.get_village_detail(
                            sync_task.server_url,
                            village_info.village_id,
                        )

                        if village_detail:
                            await _save_village_to_db(
                                db,
                                sync_task.account_id,
                                sync_task.server_url,
                                village_info,
                                village_detail,
                            )
                            synced_count += 1
                            sync_task.synced_villages = synced_count
                            db.commit()
                            logger.info(
                                f"[ARQ] 村莊同步完成: {village_info.name} ({synced_count}/{len(villages)})"
                            )
                        else:
                            logger.warning(
                                f"[ARQ] 無法取得村莊詳情: {village_info.name}"
                            )

                    except Exception as e:
                        logger.error(
                            f"[ARQ] 同步村莊失敗: {village_info.name} - {e}",
                            exc_info=True,
                        )
                        # 單個村莊失敗不影響其他村莊
                        continue

            finally:
                await scraper._stop_browser()

            # 完成同步
            sync_task.status = SyncTaskStatus.COMPLETED
            sync_task.completed_at = datetime.now(UTC)
            db.commit()

            logger.info(f"[ARQ] 同步任務完成: {task_id}")

            # 排程下次同步（10 分鐘後）
            await _schedule_next_sync(
                ctx,
                sync_task.account_id,
                sync_task.server_url,
                delay_minutes=10,
            )

            return {
                "success": True,
                "synced_villages": sync_task.synced_villages,
                "total_villages": sync_task.total_villages,
            }

        except Exception as e:
            logger.error(f"[ARQ] 同步失敗: {task_id} - {e}", exc_info=True)
            sync_task.status = SyncTaskStatus.FAILED
            sync_task.error_message = str(e)
            sync_task.completed_at = datetime.now(UTC)
            db.commit()
            return {"success": False, "error": str(e)}

    except Exception as e:
        logger.error(f"[ARQ] 任務執行異常: {task_id} - {e}", exc_info=True)
        return {"success": False, "error": str(e)}

    finally:
        db.close()


async def sync_single_village_task(
    ctx: dict[str, Any],
    account_id: str,
    server_url: str,
    travian_village_id: str,
) -> dict[str, Any]:
    """同步單一村莊的背景任務（用於完成事件觸發）.

    Args:
        ctx: ARQ context
        account_id: 遊戲帳號 ID
        server_url: 伺服器 URL
        travian_village_id: Travian 村莊 ID

    Returns:
        任務結果
    """
    logger.info(f"[ARQ] 同步單一村莊: {travian_village_id}")

    db = SessionLocal()

    try:
        # 取得帳號憑證
        account = (
            db.query(GameAccount).filter(GameAccount.account_id == account_id).first()
        )

        login_email = account.login_email if account else settings.TRAVIAN_LOGIN_EMAIL
        login_password = (
            account.login_password if account else settings.TRAVIAN_LOGIN_PASSWORD
        )

        scraper = VillageScraperService(
            login_email=login_email,
            login_password=login_password,
        )

        try:
            await scraper._start_browser()

            # 取得村莊列表（用於取得基本資訊）
            villages = await scraper.get_village_list(server_url)
            village_info = None
            for v in villages:
                if v.village_id == travian_village_id:
                    village_info = v
                    break

            if not village_info:
                return {"success": False, "error": "Village not found"}

            # 取得村莊詳細資訊
            village_detail = await scraper.get_village_detail(
                server_url,
                travian_village_id,
            )

            if village_detail:
                await _save_village_to_db(
                    db,
                    account_id,
                    server_url,
                    village_info,
                    village_detail,
                )
                return {"success": True, "village_name": village_info.name}

            return {"success": False, "error": "Could not get village detail"}

        finally:
            await scraper._stop_browser()

    except Exception as e:
        logger.error(f"[ARQ] 同步單一村莊失敗: {e}", exc_info=True)
        return {"success": False, "error": str(e)}

    finally:
        db.close()


async def scheduled_sync_task(
    ctx: dict[str, Any],
    account_id: str,
    server_url: str,
) -> dict[str, Any]:
    """週期性同步任務.

    Args:
        ctx: ARQ context
        account_id: 遊戲帳號 ID
        server_url: 伺服器 URL

    Returns:
        任務結果
    """
    logger.info(f"[ARQ] 執行週期性同步: account={account_id}")

    db = SessionLocal()

    try:
        # 檢查是否已有進行中的同步任務
        existing_task = (
            db.query(VillageSyncTask)
            .filter(
                VillageSyncTask.account_id == account_id,
                VillageSyncTask.status.in_(
                    [
                        SyncTaskStatus.PENDING,
                        SyncTaskStatus.IN_PROGRESS,
                    ]
                ),
            )
            .first()
        )

        if existing_task:
            logger.info(f"[ARQ] 已有進行中的同步任務，跳過: {existing_task.task_id}")
            return {"success": False, "reason": "Already syncing"}

        # 建立新的同步任務
        sync_task = VillageSyncTask(
            account_id=account_id,
            server_url=server_url,
            status=SyncTaskStatus.PENDING,
        )
        db.add(sync_task)
        db.commit()
        db.refresh(sync_task)

        db.close()

        # 執行同步
        return await sync_all_villages_task(ctx, sync_task.task_id)

    except Exception as e:
        logger.error(f"[ARQ] 週期性同步失敗: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


# ==================== 輔助函數 ====================


async def _save_village_to_db(
    db,
    account_id: str,
    server_url: str,
    village_info,
    village_detail,
) -> None:
    """儲存村莊資料到資料庫."""
    # 查找或建立村莊記錄
    village = (
        db.query(Village)
        .filter(
            Village.account_id == account_id,
            Village.travian_village_id == village_info.village_id,
        )
        .first()
    )

    if not village:
        village = Village(
            account_id=account_id,
            travian_village_id=village_info.village_id,
        )
        db.add(village)

    # 更新村莊資料
    if village_detail.name and village_detail.name != "未知村莊":
        village.name = village_detail.name
    elif village_info.name:
        village.name = village_info.name

    if village_detail.coordinates != (0, 0):
        village.coordinate_x = village_detail.coordinates[0]
        village.coordinate_y = village_detail.coordinates[1]
    elif village_info.coordinates != (0, 0):
        village.coordinate_x = village_info.coordinates[0]
        village.coordinate_y = village_info.coordinates[1]

    village.is_capital = village_detail.is_capital or village_info.is_capital
    village.has_incoming_attack = village_detail.has_incoming_attack
    village.attack_count = village_detail.attack_count

    # 更新資源
    village.wood = village_detail.resources.wood
    village.clay = village_detail.resources.clay
    village.iron = village_detail.resources.iron
    village.crop = village_detail.resources.crop
    village.wood_production = village_detail.resources.wood_production
    village.clay_production = village_detail.resources.clay_production
    village.iron_production = village_detail.resources.iron_production
    village.crop_production = village_detail.resources.crop_production
    village.warehouse_capacity = village_detail.resources.warehouse_capacity
    village.granary_capacity = village_detail.resources.granary_capacity

    village.last_updated = datetime.now(UTC)

    db.commit()
    db.refresh(village)

    logger.info(f"[ARQ] 村莊資料已儲存: {village.name}")

    # 更新完成事件
    await _update_completion_events(
        db,
        village.village_id,
        village_detail,
        account_id,
        server_url,
    )


async def _update_completion_events(
    db,
    village_id: str,
    village_detail,
    account_id: str,
    server_url: str,
) -> None:
    """更新完成事件（僅記錄到資料庫，不排程 ARQ 任務）.

    注意：為避免 ARQ 任務堆積導致同步緩慢，completion events 不再自動排程。
    週期性同步（每 10 分鐘）會處理所有村莊更新。
    """
    # 刪除此村莊未處理的舊事件
    db.query(CompletionEvent).filter(
        CompletionEvent.village_id == village_id,
        CompletionEvent.is_processed == False,  # noqa: E712
    ).delete()

    now = datetime.now(UTC)
    new_events_count = 0

    # 建立新的建築完成事件（僅記錄，用於前端顯示）
    for item in village_detail.building_queue:
        if item.countdown_seconds > 0:
            completion_time = now + timedelta(seconds=item.countdown_seconds)

            event = CompletionEvent(
                village_id=village_id,
                event_type=CompletionEventType.BUILDING,
                description=f"{item.name} Lv{item.level}",
                completion_time=completion_time,
            )
            db.add(event)
            new_events_count += 1

    db.commit()

    # 不再排程 ARQ 任務，避免任務堆積
    # 週期性同步會處理這些更新

    logger.info(
        f"[ARQ] 更新村莊 {village_id} 的完成事件: {new_events_count} 個（僅記錄）"
    )


async def _schedule_next_sync(
    ctx: dict[str, Any],
    account_id: str,
    server_url: str,
    delay_minutes: int = 10,
) -> None:
    """排程下次週期性同步."""
    try:
        pool = ctx.get("redis") or await get_arq_pool()

        # 使用時間戳確保 job_id 唯一（ARQ 會忽略重複的 job_id）
        import time

        job_id = f"periodic_sync_{account_id}_{int(time.time())}"

        job = await pool.enqueue_job(
            "scheduled_sync_task",
            account_id,
            server_url,
            _defer_by=timedelta(minutes=delay_minutes),
            _job_id=job_id,
        )

        if job:
            logger.info(
                f"[ARQ] 已排程下次同步: {delay_minutes}分鐘後 (job_id={job_id})"
            )
        else:
            logger.warning("[ARQ] 排程失敗（可能已存在相同任務）")

    except Exception as e:
        logger.error(f"[ARQ] 排程下次同步失敗: {e}", exc_info=True)


# ==================== ARQ Worker 設定 ====================


async def startup(ctx: dict[str, Any]) -> None:
    """Worker 啟動時執行."""
    logger.info("[ARQ] Worker 啟動")

    # 將未完成的同步任務標記為失敗（避免重新排入造成堆積）
    db = SessionLocal()
    try:
        stale_tasks = (
            db.query(VillageSyncTask)
            .filter(
                VillageSyncTask.status.in_(
                    [
                        SyncTaskStatus.PENDING,
                        SyncTaskStatus.IN_PROGRESS,
                    ]
                )
            )
            .all()
        )

        if stale_tasks:
            logger.info(f"[ARQ] 發現 {len(stale_tasks)} 個未完成的任務，標記為失敗")
            now = datetime.now(UTC)
            for task in stale_tasks:
                task.status = SyncTaskStatus.FAILED
                task.error_message = "Worker 重啟，任務中斷"
                task.completed_at = now
            db.commit()

        # 注意：不再清理 completion_events，因為這些資料用於前端顯示建築佇列
        # 只清理已過期的事件（completion_time 已過）
        now = datetime.now(UTC)
        expired_events_count = (
            db.query(CompletionEvent)
            .filter(
                CompletionEvent.is_processed == False,  # noqa: E712
                CompletionEvent.completion_time < now,
            )
            .update({CompletionEvent.is_processed: True})
        )
        db.commit()

        if expired_events_count > 0:
            logger.info(f"[ARQ] 清理了 {expired_events_count} 個已過期的完成事件")

        # 為每個有效帳號排程初始同步（延遲 30 秒讓系統穩定）
        active_accounts = (
            db.query(GameAccount)
            .filter(GameAccount.is_active == True)  # noqa: E712
            .all()
        )

        if active_accounts:
            logger.info(f"[ARQ] 為 {len(active_accounts)} 個帳號排程初始同步")
            pool = await get_arq_pool()
            for account in active_accounts:
                try:
                    job_id = f"initial_sync_{account.account_id}"
                    await pool.enqueue_job(
                        "scheduled_sync_task",
                        account.account_id,
                        account.server_url,
                        _defer_by=timedelta(seconds=30),
                        _job_id=job_id,
                    )
                    logger.info(f"[ARQ] 已排程帳號 {account.account_id} 的初始同步")
                except Exception as e:
                    logger.error(
                        f"[ARQ] 排程帳號 {account.account_id} 的初始同步失敗: {e}"
                    )
            await pool.close()

    except Exception as e:
        logger.error(f"[ARQ] 啟動時清理任務失敗: {e}", exc_info=True)
    finally:
        db.close()


async def shutdown(ctx: dict[str, Any]) -> None:
    """Worker 關閉時執行."""
    logger.info("[ARQ] Worker 關閉")


class WorkerSettings:
    """ARQ Worker 設定."""

    redis_settings = get_redis_settings()

    functions = [
        sync_all_villages_task,
        sync_single_village_task,
        scheduled_sync_task,
    ]

    on_startup = startup
    on_shutdown = shutdown

    # Worker 設定
    max_jobs = 1  # 同時最多執行 1 個任務（避免瀏覽器資源競爭）
    job_timeout = 3600  # 任務超時時間 60 分鐘（同步多個村莊需要較長時間）
    max_tries = 2  # 最大重試次數
    retry_delay = 30  # 重試延遲（秒）
