"""資源運送服務."""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.infrastructure.database.models.resource_transport import (
    TransportLog,
    TransportMode,
    TransportSchedule,
    VillageTransportConfig,
    VillageTransportRole,
)

logger = logging.getLogger(__name__)


class ResourceTransportService:
    """資源運送服務."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db

    # ============ 村莊運送配置 ============

    def get_transport_config(
        self, village_id: str, user_id: str
    ) -> VillageTransportConfig | None:
        """取得村莊運送配置."""
        return (
            self.db.query(VillageTransportConfig)
            .filter(
                VillageTransportConfig.village_id == village_id,
                VillageTransportConfig.user_id == user_id,
            )
            .first()
        )

    def get_transport_configs_by_account(
        self, account_id: str, user_id: str
    ) -> list[VillageTransportConfig]:
        """取得帳號所有村莊運送配置."""
        return (
            self.db.query(VillageTransportConfig)
            .filter(
                VillageTransportConfig.account_id == account_id,
                VillageTransportConfig.user_id == user_id,
            )
            .order_by(VillageTransportConfig.priority)
            .all()
        )

    def create_or_update_transport_config(
        self,
        user_id: str,
        account_id: str,
        village_id: str,
        transport_role: VillageTransportRole,
        max_full_time_hours: int = 8,
        reserve_wood: int = 0,
        reserve_clay: int = 0,
        reserve_iron: int = 0,
        reserve_crop: int = 0,
        priority: int = 100,
        enabled: bool = True,
    ) -> VillageTransportConfig:
        """建立或更新村莊運送配置."""
        config = self.get_transport_config(village_id, user_id)

        if config:
            config.transport_role = transport_role
            config.max_full_time_hours = max_full_time_hours
            config.reserve_wood = reserve_wood
            config.reserve_clay = reserve_clay
            config.reserve_iron = reserve_iron
            config.reserve_crop = reserve_crop
            config.priority = priority
            config.enabled = enabled
            config.updated_at = datetime.utcnow()
        else:
            config = VillageTransportConfig(
                config_id=str(uuid.uuid4()),
                user_id=user_id,
                account_id=account_id,
                village_id=village_id,
                transport_role=transport_role,
                max_full_time_hours=max_full_time_hours,
                reserve_wood=reserve_wood,
                reserve_clay=reserve_clay,
                reserve_iron=reserve_iron,
                reserve_crop=reserve_crop,
                priority=priority,
                enabled=enabled,
            )
            self.db.add(config)

        self.db.commit()
        self.db.refresh(config)
        return config

    def update_village_priority(
        self, village_id: str, user_id: str, new_priority: int
    ) -> VillageTransportConfig | None:
        """更新村莊搬運優先順序."""
        config = self.get_transport_config(village_id, user_id)
        if config:
            config.priority = new_priority
            config.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(config)
        return config

    def batch_update_priorities(
        self, user_id: str, priorities: list[dict[str, Any]]
    ) -> int:
        """批量更新村莊優先順序.

        Args:
            user_id: 用戶 ID
            priorities: [{"village_id": "xxx", "priority": 1}, ...]

        Returns:
            更新數量
        """
        count = 0
        for item in priorities:
            village_id = item.get("village_id")
            priority = item.get("priority")
            if village_id and priority is not None:
                config = self.get_transport_config(village_id, user_id)
                if config:
                    config.priority = priority
                    config.updated_at = datetime.utcnow()
                    count += 1
        self.db.commit()
        return count

    def delete_transport_config(self, village_id: str, user_id: str) -> bool:
        """刪除村莊運送配置."""
        config = self.get_transport_config(village_id, user_id)
        if config:
            self.db.delete(config)
            self.db.commit()
            return True
        return False

    # ============ 運送排程 ============

    def get_transport_schedule(
        self, account_id: str, user_id: str
    ) -> TransportSchedule | None:
        """取得運送排程."""
        return (
            self.db.query(TransportSchedule)
            .filter(
                TransportSchedule.account_id == account_id,
                TransportSchedule.user_id == user_id,
            )
            .first()
        )

    def create_or_update_transport_schedule(
        self,
        user_id: str,
        account_id: str,
        enabled: bool = False,
        interval_minutes: int = 30,
        transport_mode: TransportMode = TransportMode.AUTO_BALANCE,
        target_village_id: str | None = None,
    ) -> TransportSchedule:
        """建立或更新運送排程."""
        schedule = self.get_transport_schedule(account_id, user_id)

        if schedule:
            schedule.enabled = enabled
            schedule.interval_minutes = interval_minutes
            schedule.transport_mode = transport_mode
            schedule.target_village_id = target_village_id
            schedule.updated_at = datetime.utcnow()
            if enabled:
                schedule.next_execute_at = datetime.utcnow() + timedelta(
                    minutes=interval_minutes
                )
        else:
            schedule = TransportSchedule(
                schedule_id=str(uuid.uuid4()),
                user_id=user_id,
                account_id=account_id,
                enabled=enabled,
                interval_minutes=interval_minutes,
                transport_mode=transport_mode,
                target_village_id=target_village_id,
                next_execute_at=(
                    datetime.utcnow() + timedelta(minutes=interval_minutes)
                    if enabled
                    else None
                ),
            )
            self.db.add(schedule)

        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def update_schedule_execution(self, schedule_id: str) -> None:
        """更新排程執行時間."""
        schedule = (
            self.db.query(TransportSchedule)
            .filter(TransportSchedule.schedule_id == schedule_id)
            .first()
        )
        if schedule:
            schedule.last_executed_at = datetime.utcnow()
            schedule.next_execute_at = datetime.utcnow() + timedelta(
                minutes=schedule.interval_minutes
            )
            self.db.commit()

    def get_pending_schedules(self) -> list[TransportSchedule]:
        """取得待執行的排程."""
        now = datetime.utcnow()
        return (
            self.db.query(TransportSchedule)
            .filter(
                TransportSchedule.enabled == True,  # noqa: E712
                TransportSchedule.next_execute_at <= now,
            )
            .all()
        )

    # ============ 運送計算 ============

    def calculate_transport_plan(
        self,
        account_id: str,
        user_id: str,
        village_resources: dict[str, dict[str, int]],
    ) -> list[dict[str, Any]]:
        """計算運送計畫.

        Args:
            account_id: 帳號 ID
            user_id: 用戶 ID
            village_resources: 村莊資源狀態
                {
                    "village_id": {
                        "wood": 5000, "clay": 5000, "iron": 5000, "crop": 5000,
                        "warehouse_capacity": 10000, "granary_capacity": 10000,
                        "wood_production": 500, "clay_production": 500,
                        "iron_production": 500, "crop_production": 500
                    }
                }

        Returns:
            運送計畫列表
        """
        configs = self.get_transport_configs_by_account(account_id, user_id)
        schedule = self.get_transport_schedule(account_id, user_id)

        if not schedule:
            return []

        # 區分 sender 和 receiver
        senders = []
        receivers = []

        for config in configs:
            if not config.enabled:
                continue

            village_id = config.village_id
            if village_id not in village_resources:
                continue

            resources = village_resources[village_id]

            if config.transport_role in [
                VillageTransportRole.SENDER,
                VillageTransportRole.BOTH,
            ]:
                # 計算可運出的資源（當前 - 保留）
                available = {
                    "wood": max(0, resources.get("wood", 0) - config.reserve_wood),
                    "clay": max(0, resources.get("clay", 0) - config.reserve_clay),
                    "iron": max(0, resources.get("iron", 0) - config.reserve_iron),
                    "crop": max(0, resources.get("crop", 0) - config.reserve_crop),
                }
                if sum(available.values()) > 0:
                    senders.append(
                        {
                            "village_id": village_id,
                            "config": config,
                            "available": available,
                            "resources": resources,
                        }
                    )

            if config.transport_role in [
                VillageTransportRole.RECEIVER,
                VillageTransportRole.BOTH,
            ]:
                # 計算需要的資源（倉庫容量 - 當前）
                needed = {
                    "wood": max(
                        0,
                        resources.get("warehouse_capacity", 10000)
                        - resources.get("wood", 0),
                    ),
                    "clay": max(
                        0,
                        resources.get("warehouse_capacity", 10000)
                        - resources.get("clay", 0),
                    ),
                    "iron": max(
                        0,
                        resources.get("warehouse_capacity", 10000)
                        - resources.get("iron", 0),
                    ),
                    "crop": max(
                        0,
                        resources.get("granary_capacity", 10000)
                        - resources.get("crop", 0),
                    ),
                }
                if sum(needed.values()) > 0:
                    receivers.append(
                        {
                            "village_id": village_id,
                            "config": config,
                            "needed": needed,
                            "resources": resources,
                        }
                    )

        # 根據模式計算運送計畫
        transport_plan = []

        if schedule.transport_mode == TransportMode.MANY_TO_ONE:
            # 多對一：所有 sender 運送到指定目標
            if schedule.target_village_id:
                for sender in senders:
                    if sender["village_id"] == schedule.target_village_id:
                        continue
                    transport_plan.append(
                        {
                            "source_village_id": sender["village_id"],
                            "target_village_id": schedule.target_village_id,
                            "wood": sender["available"]["wood"],
                            "clay": sender["available"]["clay"],
                            "iron": sender["available"]["iron"],
                            "crop": sender["available"]["crop"],
                        }
                    )

        elif schedule.transport_mode == TransportMode.ONE_TO_MANY:
            # 一對多：從指定來源分配到所有 receiver
            if schedule.target_village_id:
                source = next(
                    (
                        s
                        for s in senders
                        if s["village_id"] == schedule.target_village_id
                    ),
                    None,
                )
                if source:
                    total_available = source["available"]
                    total_needed = {
                        "wood": sum(r["needed"]["wood"] for r in receivers),
                        "clay": sum(r["needed"]["clay"] for r in receivers),
                        "iron": sum(r["needed"]["iron"] for r in receivers),
                        "crop": sum(r["needed"]["crop"] for r in receivers),
                    }

                    for receiver in receivers:
                        if receiver["village_id"] == schedule.target_village_id:
                            continue
                        # 按比例分配
                        allocation = {}
                        for resource in ["wood", "clay", "iron", "crop"]:
                            if total_needed[resource] > 0:
                                ratio = (
                                    receiver["needed"][resource]
                                    / total_needed[resource]
                                )
                                allocation[resource] = int(
                                    total_available[resource] * ratio
                                )
                            else:
                                allocation[resource] = 0

                        if sum(allocation.values()) > 0:
                            transport_plan.append(
                                {
                                    "source_village_id": schedule.target_village_id,
                                    "target_village_id": receiver["village_id"],
                                    **allocation,
                                }
                            )

        else:  # AUTO_BALANCE
            # 自動平衡：從資源多的村莊運送到資源少的村莊
            # 按優先順序排序
            senders.sort(key=lambda x: x["config"].priority)
            receivers.sort(key=lambda x: x["config"].priority)

            for sender in senders:
                for receiver in receivers:
                    if sender["village_id"] == receiver["village_id"]:
                        continue

                    # 計算可以運送的數量（取 sender 可用和 receiver 需要的較小值）
                    transfer = {
                        "wood": min(
                            sender["available"]["wood"], receiver["needed"]["wood"]
                        ),
                        "clay": min(
                            sender["available"]["clay"], receiver["needed"]["clay"]
                        ),
                        "iron": min(
                            sender["available"]["iron"], receiver["needed"]["iron"]
                        ),
                        "crop": min(
                            sender["available"]["crop"], receiver["needed"]["crop"]
                        ),
                    }

                    if sum(transfer.values()) > 0:
                        transport_plan.append(
                            {
                                "source_village_id": sender["village_id"],
                                "target_village_id": receiver["village_id"],
                                **transfer,
                            }
                        )

                        # 更新剩餘可用/需要資源
                        for resource in ["wood", "clay", "iron", "crop"]:
                            sender["available"][resource] -= transfer[resource]
                            receiver["needed"][resource] -= transfer[resource]

        return transport_plan

    # ============ 運送日誌 ============

    def create_transport_log(
        self,
        user_id: str,
        account_id: str,
        source_village_id: str,
        target_village_id: str | None = None,
        target_x: int | None = None,
        target_y: int | None = None,
        wood: int = 0,
        clay: int = 0,
        iron: int = 0,
        crop: int = 0,
        success: bool = True,
        error_message: str | None = None,
    ) -> TransportLog:
        """建立運送日誌."""
        log = TransportLog(
            log_id=str(uuid.uuid4()),
            user_id=user_id,
            account_id=account_id,
            source_village_id=source_village_id,
            target_village_id=target_village_id,
            target_x=target_x,
            target_y=target_y,
            wood=wood,
            clay=clay,
            iron=iron,
            crop=crop,
            success=success,
            error_message=error_message,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_transport_logs(
        self,
        user_id: str,
        account_id: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        success: bool | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[TransportLog], int]:
        """取得運送日誌."""
        query = self.db.query(TransportLog).filter(TransportLog.user_id == user_id)

        if account_id:
            query = query.filter(TransportLog.account_id == account_id)
        if start_date:
            query = query.filter(TransportLog.executed_at >= start_date)
        if end_date:
            query = query.filter(TransportLog.executed_at <= end_date)
        if success is not None:
            query = query.filter(TransportLog.success == success)

        total = query.count()
        logs = (
            query.order_by(TransportLog.executed_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return logs, total

    def get_transport_stats(
        self, user_id: str, account_id: str, days: int = 7
    ) -> dict[str, Any]:
        """取得運送統計."""
        start_date = datetime.utcnow() - timedelta(days=days)

        logs = (
            self.db.query(TransportLog)
            .filter(
                TransportLog.user_id == user_id,
                TransportLog.account_id == account_id,
                TransportLog.executed_at >= start_date,
            )
            .all()
        )

        total_wood = sum(log.wood for log in logs if log.success)
        total_clay = sum(log.clay for log in logs if log.success)
        total_iron = sum(log.iron for log in logs if log.success)
        total_crop = sum(log.crop for log in logs if log.success)

        success_count = sum(1 for log in logs if log.success)
        failure_count = sum(1 for log in logs if not log.success)

        return {
            "total_transports": len(logs),
            "success_count": success_count,
            "failure_count": failure_count,
            "total_resources": {
                "wood": total_wood,
                "clay": total_clay,
                "iron": total_iron,
                "crop": total_crop,
                "total": total_wood + total_clay + total_iron + total_crop,
            },
            "period_days": days,
        }
