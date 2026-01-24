"""村莊服務."""

from sqlalchemy.orm import Session, joinedload

from app.domain.schemas.village import (
    BuildingInstanceCreate,
    BuildingInstanceUpdate,
    TroopInstanceCreate,
    TroopInstanceUpdate,
    VillageCreate,
    VillageUpdate,
)
from app.infrastructure.database.models.building_instance import BuildingInstance
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.troop_instance import TroopInstance
from app.infrastructure.database.models.village import Village


class VillageService:
    """村莊服務類."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db

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

    def create_village(self, user_id: str, data: VillageCreate) -> Village | None:
        """建立村莊."""
        if not self._verify_account_ownership(data.account_id, user_id):
            return None

        village = Village(
            account_id=data.account_id,
            name=data.name,
            coordinate_x=data.coordinate_x,
            coordinate_y=data.coordinate_y,
            population=data.population,
            village_type=data.village_type,
            is_capital=data.is_capital,
            role=data.role,
        )
        self.db.add(village)
        self.db.commit()
        self.db.refresh(village)
        return village

    def get_village_by_id(
        self, village_id: str, user_id: str, include_details: bool = False
    ) -> Village | None:
        """根據 ID 取得村莊."""
        query = self.db.query(Village).join(GameAccount)

        if include_details:
            query = query.options(
                joinedload(Village.building_instances),
                joinedload(Village.troop_instances),
            )

        village = query.filter(
            Village.village_id == village_id,
            GameAccount.user_id == user_id,
        ).first()

        return village

    def get_villages_by_account(self, account_id: str, user_id: str) -> list[Village]:
        """取得帳號的所有村莊."""
        if not self._verify_account_ownership(account_id, user_id):
            return []

        return (
            self.db.query(Village)
            .filter(Village.account_id == account_id)
            .order_by(Village.created_at)
            .all()
        )

    def get_all_villages_by_user(self, user_id: str) -> list[Village]:
        """取得用戶所有村莊."""
        return (
            self.db.query(Village)
            .join(GameAccount)
            .filter(GameAccount.user_id == user_id)
            .order_by(Village.created_at)
            .all()
        )

    def update_village(
        self, village_id: str, user_id: str, data: VillageUpdate
    ) -> Village | None:
        """更新村莊."""
        village = self.get_village_by_id(village_id, user_id)
        if not village:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(village, field, value)

        self.db.commit()
        self.db.refresh(village)
        return village

    def delete_village(self, village_id: str, user_id: str) -> bool:
        """刪除村莊."""
        village = self.get_village_by_id(village_id, user_id)
        if not village:
            return False

        self.db.delete(village)
        self.db.commit()
        return True

    # ============ 建築實例 ============

    def add_building(
        self, village_id: str, user_id: str, data: BuildingInstanceCreate
    ) -> BuildingInstance | None:
        """新增建築實例."""
        village = self.get_village_by_id(village_id, user_id)
        if not village:
            return None

        building = BuildingInstance(
            village_id=village_id,
            building_id=data.building_id,
            position=data.position,
            current_level=data.current_level,
        )
        self.db.add(building)
        self.db.commit()
        self.db.refresh(building)
        return building

    def update_building(
        self,
        village_id: str,
        instance_id: str,
        user_id: str,
        data: BuildingInstanceUpdate,
    ) -> BuildingInstance | None:
        """更新建築實例."""
        village = self.get_village_by_id(village_id, user_id)
        if not village:
            return None

        building = (
            self.db.query(BuildingInstance)
            .filter(
                BuildingInstance.instance_id == instance_id,
                BuildingInstance.village_id == village_id,
            )
            .first()
        )
        if not building:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(building, field, value)

        self.db.commit()
        self.db.refresh(building)
        return building

    def delete_building(self, village_id: str, instance_id: str, user_id: str) -> bool:
        """刪除建築實例."""
        village = self.get_village_by_id(village_id, user_id)
        if not village:
            return False

        building = (
            self.db.query(BuildingInstance)
            .filter(
                BuildingInstance.instance_id == instance_id,
                BuildingInstance.village_id == village_id,
            )
            .first()
        )
        if not building:
            return False

        self.db.delete(building)
        self.db.commit()
        return True

    # ============ 部隊實例 ============

    def add_troop(
        self, village_id: str, user_id: str, data: TroopInstanceCreate
    ) -> TroopInstance | None:
        """新增部隊實例."""
        village = self.get_village_by_id(village_id, user_id)
        if not village:
            return None

        troop = TroopInstance(
            village_id=village_id,
            troop_id=data.troop_id,
            count=data.count,
        )
        self.db.add(troop)
        self.db.commit()
        self.db.refresh(troop)
        return troop

    def update_troop(
        self,
        village_id: str,
        instance_id: str,
        user_id: str,
        data: TroopInstanceUpdate,
    ) -> TroopInstance | None:
        """更新部隊實例."""
        village = self.get_village_by_id(village_id, user_id)
        if not village:
            return None

        troop = (
            self.db.query(TroopInstance)
            .filter(
                TroopInstance.instance_id == instance_id,
                TroopInstance.village_id == village_id,
            )
            .first()
        )
        if not troop:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(troop, field, value)

        self.db.commit()
        self.db.refresh(troop)
        return troop

    def delete_troop(self, village_id: str, instance_id: str, user_id: str) -> bool:
        """刪除部隊實例."""
        village = self.get_village_by_id(village_id, user_id)
        if not village:
            return False

        troop = (
            self.db.query(TroopInstance)
            .filter(
                TroopInstance.instance_id == instance_id,
                TroopInstance.village_id == village_id,
            )
            .first()
        )
        if not troop:
            return False

        self.db.delete(troop)
        self.db.commit()
        return True
