"""數據同步服務."""

from sqlalchemy.orm import Session

from app.domain.schemas.sync import (
    BuildingData,
    FullSync,
    ResourceFieldData,
    TroopData,
    TroopSync,
    VillageCenterSync,
    VillageOverviewSync,
)
from app.infrastructure.database.models.building_instance import BuildingInstance
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.sync_log import SyncStatus, SyncType
from app.infrastructure.database.models.troop_instance import TroopInstance
from app.infrastructure.database.models.village import Village
from app.services.sync_log_service import SyncLogService


class SyncService:
    """數據同步服務類."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db
        self.log_service = SyncLogService(db)

    def _verify_account_ownership(self, account_id: str, user_id: str) -> bool:
        """驗證帳號所有權."""
        account = (
            self.db.query(GameAccount)
            .filter(
                GameAccount.account_id == account_id,
                GameAccount.user_id == user_id,
            )
            .first()
        )
        return account is not None

    def _find_or_create_village(
        self,
        account_id: str,
        village_id: str | None,
        name: str | None,
        x: int | None,
        y: int | None,
    ) -> Village:
        """查找或建立村莊."""
        village = None

        if village_id:
            village = (
                self.db.query(Village).filter(Village.village_id == village_id).first()
            )

        if not village and x is not None and y is not None:
            village = (
                self.db.query(Village)
                .filter(
                    Village.account_id == account_id,
                    Village.coordinate_x == x,
                    Village.coordinate_y == y,
                )
                .first()
            )

        if not village:
            village = Village(
                account_id=account_id,
                name=name,
                coordinate_x=x,
                coordinate_y=y,
            )
            self.db.add(village)
            self.db.flush()

        return village

    def _sync_resource_fields(
        self, village: Village, resource_fields: list[ResourceFieldData]
    ) -> int:
        """同步資源田."""
        count = 0
        for field in resource_fields:
            existing = (
                self.db.query(BuildingInstance)
                .filter(
                    BuildingInstance.village_id == village.village_id,
                    BuildingInstance.position == field.position,
                )
                .first()
            )

            building_id = f"{field.resource_type}_field"

            if existing:
                existing.building_id = building_id
                existing.current_level = field.level
            else:
                instance = BuildingInstance(
                    village_id=village.village_id,
                    building_id=building_id,
                    position=field.position,
                    current_level=field.level,
                )
                self.db.add(instance)
            count += 1

        return count

    def _sync_buildings(self, village: Village, buildings: list[BuildingData]) -> int:
        """同步建築."""
        count = 0
        for building in buildings:
            existing = (
                self.db.query(BuildingInstance)
                .filter(
                    BuildingInstance.village_id == village.village_id,
                    BuildingInstance.position == building.position,
                )
                .first()
            )

            if existing:
                existing.building_id = building.building_id
                existing.current_level = building.level
                existing.is_upgrading = building.is_upgrading
                existing.upgrade_finish_time = building.upgrade_finish_time
            else:
                instance = BuildingInstance(
                    village_id=village.village_id,
                    building_id=building.building_id,
                    position=building.position,
                    current_level=building.level,
                    is_upgrading=building.is_upgrading,
                    upgrade_finish_time=building.upgrade_finish_time,
                )
                self.db.add(instance)
            count += 1

        return count

    def _sync_troops(self, village: Village, troops: list[TroopData]) -> int:
        """同步部隊."""
        count = 0
        for troop in troops:
            existing = (
                self.db.query(TroopInstance)
                .filter(
                    TroopInstance.village_id == village.village_id,
                    TroopInstance.troop_id == troop.troop_id,
                )
                .first()
            )

            if existing:
                existing.count = troop.count
                existing.is_training = troop.is_training
                existing.training_finish_time = troop.training_finish_time
            else:
                instance = TroopInstance(
                    village_id=village.village_id,
                    troop_id=troop.troop_id,
                    count=troop.count,
                    is_training=troop.is_training,
                    training_finish_time=troop.training_finish_time,
                )
                self.db.add(instance)
            count += 1

        return count

    def sync_village_overview(
        self, user_id: str, data: VillageOverviewSync
    ) -> tuple[bool, str, str | None]:
        """同步村莊總覽數據."""
        log = self.log_service.create_log(
            user_id=user_id,
            sync_type=SyncType.VILLAGE_OVERVIEW,
            account_id=data.account_id,
        )

        try:
            if not self._verify_account_ownership(data.account_id, user_id):
                self.log_service.complete_log(
                    log, SyncStatus.FAILED, message="無權存取此遊戲帳號"
                )
                self.db.commit()
                return False, "無權存取此遊戲帳號", None

            village = self._find_or_create_village(
                data.account_id,
                data.village_id,
                data.village_name,
                data.coordinate_x,
                data.coordinate_y,
            )
            log.village_id = village.village_id

            if data.village_name:
                village.name = data.village_name

            items_synced = self._sync_resource_fields(village, data.resource_fields)

            self.log_service.complete_log(
                log,
                SyncStatus.SUCCESS,
                items_synced=items_synced,
                message="村莊總覽同步成功",
            )
            self.db.commit()
            return True, "村莊總覽同步成功", village.village_id
        except Exception as e:
            self.log_service.complete_log(log, SyncStatus.FAILED, error_details=str(e))
            self.db.commit()
            raise

    def sync_village_center(
        self, user_id: str, data: VillageCenterSync
    ) -> tuple[bool, str, str | None]:
        """同步村莊中心數據."""
        log = self.log_service.create_log(
            user_id=user_id,
            sync_type=SyncType.VILLAGE_CENTER,
            account_id=data.account_id,
            village_id=data.village_id,
        )

        try:
            if not self._verify_account_ownership(data.account_id, user_id):
                self.log_service.complete_log(
                    log, SyncStatus.FAILED, message="無權存取此遊戲帳號"
                )
                self.db.commit()
                return False, "無權存取此遊戲帳號", None

            village = self._find_or_create_village(
                data.account_id,
                data.village_id,
                None,
                None,
                None,
            )
            log.village_id = village.village_id

            items_synced = self._sync_buildings(village, data.buildings)

            self.log_service.complete_log(
                log,
                SyncStatus.SUCCESS,
                items_synced=items_synced,
                message="村莊中心同步成功",
            )
            self.db.commit()
            return True, "村莊中心同步成功", village.village_id
        except Exception as e:
            self.log_service.complete_log(log, SyncStatus.FAILED, error_details=str(e))
            self.db.commit()
            raise

    def sync_troops(self, user_id: str, data: TroopSync) -> tuple[bool, str]:
        """同步部隊數據."""
        log = self.log_service.create_log(
            user_id=user_id,
            sync_type=SyncType.TROOPS,
            account_id=data.account_id,
            village_id=data.village_id,
        )

        try:
            if not self._verify_account_ownership(data.account_id, user_id):
                self.log_service.complete_log(
                    log, SyncStatus.FAILED, message="無權存取此遊戲帳號"
                )
                self.db.commit()
                return False, "無權存取此遊戲帳號"

            village = (
                self.db.query(Village)
                .filter(Village.village_id == data.village_id)
                .first()
            )
            if not village:
                self.log_service.complete_log(
                    log, SyncStatus.FAILED, message="村莊不存在"
                )
                self.db.commit()
                return False, "村莊不存在"

            items_synced = self._sync_troops(village, data.troops)

            self.log_service.complete_log(
                log,
                SyncStatus.SUCCESS,
                items_synced=items_synced,
                message="部隊同步成功",
            )
            self.db.commit()
            return True, "部隊同步成功"
        except Exception as e:
            self.log_service.complete_log(log, SyncStatus.FAILED, error_details=str(e))
            self.db.commit()
            raise

    def sync_full(
        self, user_id: str, data: FullSync
    ) -> tuple[bool, str, int, int, int]:
        """完整同步."""
        log = self.log_service.create_log(
            user_id=user_id,
            sync_type=SyncType.FULL,
            account_id=data.account_id,
        )

        try:
            if not self._verify_account_ownership(data.account_id, user_id):
                self.log_service.complete_log(
                    log, SyncStatus.FAILED, message="無權存取此遊戲帳號"
                )
                self.db.commit()
                return False, "無權存取此遊戲帳號", 0, 0, 0

            villages_synced = 0
            buildings_synced = 0
            troops_synced = 0

            for village_data in data.villages:
                village = self._find_or_create_village(
                    data.account_id,
                    None,
                    village_data.name,
                    village_data.coordinate_x,
                    village_data.coordinate_y,
                )

                if village_data.name:
                    village.name = village_data.name
                if village_data.population:
                    village.population = village_data.population
                if village_data.village_type:
                    village.village_type = village_data.village_type
                if village_data.is_capital:
                    village.is_capital = village_data.is_capital
                if village_data.role:
                    village.role = village_data.role

                buildings_synced += self._sync_resource_fields(
                    village, village_data.resource_fields
                )
                buildings_synced += self._sync_buildings(
                    village, village_data.buildings
                )
                troops_synced += self._sync_troops(village, village_data.troops)

                villages_synced += 1

            total_items = villages_synced + buildings_synced + troops_synced
            self.log_service.complete_log(
                log,
                SyncStatus.SUCCESS,
                items_synced=total_items,
                message=f"完整同步成功: {villages_synced} 村莊, {buildings_synced} 建築, {troops_synced} 部隊",
            )
            self.db.commit()
            return (
                True,
                "完整同步成功",
                villages_synced,
                buildings_synced,
                troops_synced,
            )
        except Exception as e:
            self.log_service.complete_log(log, SyncStatus.FAILED, error_details=str(e))
            self.db.commit()
            raise
