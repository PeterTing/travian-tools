"""村莊同步服務.

負責背景同步村莊資料到資料庫：
- 啟動同步任務
- 追蹤同步進度
- 更新完成事件排程
"""

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

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


def _format_datetime_utc(dt: datetime | None) -> str | None:
    """格式化 datetime 為 ISO 字串，確保包含 UTC 時區資訊."""
    if dt is None:
        return None
    # 如果沒有時區資訊，假設是 UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.isoformat()


def _get_new_db_session() -> Session:
    """建立新的資料庫 session（用於背景任務）."""
    return SessionLocal()


class VillageSyncService:
    """村莊同步服務."""

    def __init__(self, db: Session):
        self._db = db

    async def create_sync_task(
        self,
        account_id: str,
        server_url: str,
    ) -> tuple[str, bool]:
        """只建立同步任務記錄（不啟動執行）.

        Args:
            account_id: 遊戲帳號 ID
            server_url: 伺服器 URL

        Returns:
            (task_id, is_new): 同步任務 ID 和是否為新建立的任務
        """
        # 檢查是否已有進行中的同步任務
        existing_task = (
            self._db.query(VillageSyncTask)
            .filter(
                VillageSyncTask.account_id == account_id,
                VillageSyncTask.status.in_([
                    SyncTaskStatus.PENDING,
                    SyncTaskStatus.IN_PROGRESS,
                ]),
            )
            .first()
        )

        if existing_task:
            logger.info(f"已有進行中的同步任務: {existing_task.task_id}")
            return existing_task.task_id, False

        # 建立新的同步任務
        sync_task = VillageSyncTask(
            account_id=account_id,
            server_url=server_url,
            status=SyncTaskStatus.PENDING,
        )
        self._db.add(sync_task)
        self._db.commit()
        self._db.refresh(sync_task)

        logger.info(f"建立同步任務: {sync_task.task_id}")
        return sync_task.task_id, True

    async def start_sync_task(
        self,
        account_id: str,
        server_url: str,
    ) -> str:
        """建立並啟動同步任務（用於排程器）.

        只有在建立新任務時才會執行，如果有現有的進行中任務則跳過執行。

        Args:
            account_id: 遊戲帳號 ID
            server_url: 伺服器 URL

        Returns:
            task_id: 同步任務 ID
        """
        task_id, is_new = await self.create_sync_task(account_id, server_url)

        if is_new:
            # 只有新任務才執行
            await self._execute_sync_task(task_id)
        else:
            logger.info(f"跳過執行，已有進行中的同步任務: {task_id}")

        return task_id

    async def _execute_sync_task(self, task_id: str) -> None:
        """執行同步任務（背景）.

        Args:
            task_id: 同步任務 ID
        """
        logger.info(f"開始執行同步任務: {task_id}")

        # 建立新的資料庫 session（背景任務需要獨立的 session）
        db = _get_new_db_session()

        try:
            # 重新取得 task
            sync_task = (
                db.query(VillageSyncTask)
                .filter(VillageSyncTask.task_id == task_id)
                .first()
            )

            if not sync_task:
                logger.error(f"同步任務不存在: {task_id}")
                return

            logger.info(f"找到同步任務: {task_id}, account_id={sync_task.account_id}")

            # 取得帳號憑證
            account = (
                db.query(GameAccount)
                .filter(GameAccount.account_id == sync_task.account_id)
                .first()
            )

            login_email = account.login_email if account else None
            login_password = account.login_password if account else None

            # 使用環境變數作為備用
            if not login_email:
                login_email = settings.TRAVIAN_LOGIN_EMAIL
            if not login_password:
                login_password = settings.TRAVIAN_LOGIN_PASSWORD

            logger.info(f"使用憑證: email={login_email is not None}")

            # 更新任務狀態
            sync_task.status = SyncTaskStatus.IN_PROGRESS
            sync_task.started_at = datetime.now(UTC)
            db.commit()

            scraper = VillageScraperService(
                login_email=login_email,
                login_password=login_password,
            )

            try:
                logger.info("啟動瀏覽器...")
                await scraper._start_browser()
                logger.info("瀏覽器已啟動")

                # 取得村莊列表
                logger.info(f"取得村莊列表: {sync_task.server_url}")
                villages = await scraper.get_village_list(sync_task.server_url)
                sync_task.total_villages = len(villages)
                db.commit()

                logger.info(f"開始同步 {len(villages)} 個村莊")

                for i, village_info in enumerate(villages):
                    try:
                        sync_task.current_village_name = village_info.name
                        db.commit()

                        logger.info(f"同步村莊 {i + 1}/{len(villages)}: {village_info.name} (id={village_info.village_id})")

                        # 取得村莊詳細資訊
                        village_detail = await scraper.get_village_detail(
                            sync_task.server_url,
                            village_info.village_id,
                        )

                        if village_detail:
                            logger.info(f"取得村莊詳情成功: {village_info.name}, resources={village_detail.resources.wood}/{village_detail.resources.clay}/{village_detail.resources.iron}/{village_detail.resources.crop}")
                            # 儲存到資料庫（使用獨立 session）
                            await self._save_village_to_db_with_session(
                                db,
                                sync_task.account_id,
                                village_info,
                                village_detail,
                            )
                        else:
                            logger.warning(f"無法取得村莊詳情: {village_info.name}")

                        sync_task.synced_villages = i + 1
                        db.commit()

                    except Exception as e:
                        logger.error(f"同步村莊失敗: {village_info.name} - {e}", exc_info=True)
                        continue

                # 完成同步
                sync_task.status = SyncTaskStatus.COMPLETED
                sync_task.completed_at = datetime.now(UTC)
                db.commit()

                logger.info(f"同步任務完成: {task_id}")

                # 週期性同步現在由 ARQ worker 自動處理
                # 每次同步完成後會自動排程下次同步
                logger.info("週期性同步由 ARQ worker 自動處理")

            except Exception as e:
                logger.error(f"同步任務失敗: {task_id} - {e}", exc_info=True)
                sync_task.status = SyncTaskStatus.FAILED
                sync_task.error_message = str(e)
                sync_task.completed_at = datetime.now(UTC)
                db.commit()

            finally:
                logger.info("停止瀏覽器...")
                await scraper._stop_browser()
                logger.info("瀏覽器已停止")

        except Exception as e:
            logger.error(f"同步任務執行異常: {task_id} - {e}", exc_info=True)
        finally:
            db.close()
            logger.info(f"同步任務 session 已關閉: {task_id}")

    async def _save_village_to_db(
        self,
        account_id: str,
        village_info,
        village_detail,
    ) -> None:
        """儲存村莊資料到資料庫（使用 self._db）.

        Args:
            account_id: 遊戲帳號 ID
            village_info: 村莊基本資訊
            village_detail: 村莊詳細資訊
        """
        await self._save_village_to_db_with_session(
            self._db,
            account_id,
            village_info,
            village_detail,
        )

    async def _save_village_to_db_with_session(
        self,
        db: Session,
        account_id: str,
        village_info,
        village_detail,
    ) -> None:
        """儲存村莊資料到資料庫（使用指定的 session）.

        Args:
            db: 資料庫 session
            account_id: 遊戲帳號 ID
            village_info: 村莊基本資訊
            village_detail: 村莊詳細資訊
        """
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
        # 優先使用 village_detail，但如果資料不完整則用 village_info 作為備用
        if village_detail.name and village_detail.name != "未知村莊":
            village.name = village_detail.name
        elif village_info.name:
            village.name = village_info.name
            logger.warning(f"使用 village_info.name 作為備用: {village_info.name}")

        # 座標：如果 detail 的座標是 (0,0) 則使用 info 的座標
        if village_detail.coordinates != (0, 0):
            village.coordinate_x = village_detail.coordinates[0]
            village.coordinate_y = village_detail.coordinates[1]
        elif village_info.coordinates != (0, 0):
            village.coordinate_x = village_info.coordinates[0]
            village.coordinate_y = village_info.coordinates[1]
            logger.warning(f"使用 village_info.coordinates 作為備用: {village_info.coordinates}")

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

        logger.info(f"村莊資料已儲存: {village.name} (id={village.village_id})")

        # 取得 server_url
        account = (
            db.query(GameAccount)
            .filter(GameAccount.account_id == account_id)
            .first()
        )
        server_url = account.server_url if account else ""

        # 更新完成事件
        await self._update_completion_events_with_session(
            db,
            village.village_id,
            village_detail,
            account_id,
            server_url,
        )

    async def _update_completion_events(
        self,
        village_id: str,
        village_detail,
        account_id: str,
        server_url: str,
    ) -> None:
        """更新完成事件（使用 self._db）.

        Args:
            village_id: 村莊 ID (內部 UUID)
            village_detail: 村莊詳細資訊
            account_id: 遊戲帳號 ID
            server_url: 伺服器 URL
        """
        await self._update_completion_events_with_session(
            self._db,
            village_id,
            village_detail,
            account_id,
            server_url,
        )

    async def _update_completion_events_with_session(
        self,
        db: Session,
        village_id: str,
        village_detail,
        account_id: str,
        server_url: str,
    ) -> None:
        """更新完成事件（使用指定的 session）.

        注意：完成事件的排程現在由 ARQ worker 處理。

        Args:
            db: 資料庫 session
            village_id: 村莊 ID (內部 UUID)
            village_detail: 村莊詳細資訊
            account_id: 遊戲帳號 ID
            server_url: 伺服器 URL
        """
        # 刪除此村莊未處理的舊事件
        db.query(CompletionEvent).filter(
            CompletionEvent.village_id == village_id,
            CompletionEvent.is_processed == False,  # noqa: E712
        ).delete()

        now = datetime.now(UTC)
        new_events = []

        # 建立新的建築完成事件
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
                new_events.append(event)

        db.commit()

        # 完成事件的排程由 ARQ worker 的 _update_completion_events 處理
        logger.info(
            f"更新村莊 {village_id} 的完成事件: "
            f"{len(new_events)} 個建築（ARQ worker 將處理排程）"
        )

    def get_sync_status(self, task_id: str) -> dict | None:
        """取得同步任務狀態.

        Args:
            task_id: 同步任務 ID

        Returns:
            同步狀態資訊
        """
        sync_task = (
            self._db.query(VillageSyncTask)
            .filter(VillageSyncTask.task_id == task_id)
            .first()
        )

        if not sync_task:
            return None

        return {
            "task_id": sync_task.task_id,
            "status": sync_task.status.value,
            "total_villages": sync_task.total_villages,
            "synced_villages": sync_task.synced_villages,
            "current_village": sync_task.current_village_name,
            "progress_percent": sync_task.progress_percent,
            "started_at": _format_datetime_utc(sync_task.started_at),
            "completed_at": _format_datetime_utc(sync_task.completed_at),
            "error_message": sync_task.error_message,
        }

    def get_cached_villages(
        self,
        account_id: str,
    ) -> dict:
        """取得快取的村莊資料.

        Args:
            account_id: 遊戲帳號 ID

        Returns:
            村莊資料
        """
        villages = (
            self._db.query(Village)
            .filter(Village.account_id == account_id)
            .all()
        )

        # 取得最後同步時間（使用村莊中最新的 last_updated）
        # 這樣無論是完整同步還是單一村莊同步，都會反映最新的更新時間
        last_synced = None
        if villages:
            min_datetime = datetime(1, 1, 1, tzinfo=UTC)
            latest_village = max(
                villages,
                key=lambda v: v.last_updated if v.last_updated else min_datetime,
            )
            last_synced = latest_village.last_updated

        # 下次同步時間：從現在起 10 分鐘後，或者如果已有排程則顯示那個時間
        # 簡化邏輯：下次同步 = 上次同步 + 10 分鐘（如果已過期則不顯示）
        next_sync = None
        if last_synced:
            potential_next = last_synced + timedelta(minutes=10)
            now = datetime.now(UTC)
            # 確保 last_synced 有時區資訊
            if last_synced.tzinfo is None:
                last_synced_tz = last_synced.replace(tzinfo=UTC)
            else:
                last_synced_tz = last_synced
            potential_next = last_synced_tz + timedelta(minutes=10)
            # 只有當下次同步時間在未來才顯示
            if potential_next > now:
                next_sync = potential_next

        return {
            "last_synced": _format_datetime_utc(last_synced),
            "next_sync": _format_datetime_utc(next_sync),
            "villages": [
                {
                    "village_id": v.village_id,
                    "travian_village_id": v.travian_village_id,
                    "name": v.name,
                    "coordinates": {
                        "x": v.coordinate_x,
                        "y": v.coordinate_y,
                    },
                    "is_capital": v.is_capital,
                    "has_incoming_attack": v.has_incoming_attack,
                    "attack_count": v.attack_count,
                    "resources": {
                        "wood": v.wood,
                        "clay": v.clay,
                        "iron": v.iron,
                        "crop": v.crop,
                    },
                    "production": {
                        "wood": v.wood_production,
                        "clay": v.clay_production,
                        "iron": v.iron_production,
                        "crop": v.crop_production,
                    },
                    "warehouse_capacity": v.warehouse_capacity,
                    "granary_capacity": v.granary_capacity,
                    "cp_per_day": getattr(v, 'cp_per_day', 0) or 0,
                    "merchants_used": getattr(v, 'merchants_used', 0) or 0,
                    "merchants_total": getattr(v, 'merchants_total', 0) or 0,
                    "total_troops": getattr(v, 'total_troops', 0) or 0,
                    "last_updated": _format_datetime_utc(v.last_updated),
                    "completion_events": [
                        {
                            "event_id": e.event_id,
                            "type": e.event_type.value,
                            "description": e.description,
                            "completion_time": _format_datetime_utc(e.completion_time),
                            "is_processed": e.is_processed,
                        }
                        for e in v.completion_events
                        # 只返回未處理且尚未完成（完成時間在未來）的事件
                        if not e.is_processed and (
                            e.completion_time is not None
                            and (e.completion_time.replace(tzinfo=UTC) if e.completion_time.tzinfo is None else e.completion_time) > datetime.now(UTC)
                        )
                    ],
                }
                for v in villages
            ],
        }

    async def sync_single_village(
        self,
        account_id: str,
        server_url: str,
        travian_village_id: str,
    ) -> bool:
        """同步單一村莊.

        Args:
            account_id: 遊戲帳號 ID
            server_url: 伺服器 URL
            travian_village_id: Travian 村莊 ID

        Returns:
            是否成功
        """
        # 取得帳號憑證
        account = (
            self._db.query(GameAccount)
            .filter(GameAccount.account_id == account_id)
            .first()
        )

        login_email = account.login_email if account else None
        login_password = account.login_password if account else None

        if not login_email:
            login_email = settings.TRAVIAN_LOGIN_EMAIL
        if not login_password:
            login_password = settings.TRAVIAN_LOGIN_PASSWORD

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
                logger.error(f"找不到村莊: {travian_village_id}")
                return False

            # 取得村莊詳細資訊
            village_detail = await scraper.get_village_detail(
                server_url,
                travian_village_id,
            )

            if village_detail:
                await self._save_village_to_db(
                    account_id,
                    village_info,
                    village_detail,
                )
                logger.info(f"同步村莊成功: {village_info.name}")
                return True

            return False

        except Exception as e:
            logger.error(f"同步單一村莊失敗: {e}")
            return False

        finally:
            await scraper._stop_browser()
