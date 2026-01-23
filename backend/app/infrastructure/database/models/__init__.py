"""Database models."""

from app.infrastructure.database.models.battle_report import (
    BattleReport,
    BattleResult,
    ReportType,
)
from app.infrastructure.database.models.building_instance import BuildingInstance
from app.infrastructure.database.models.game_account import GameAccount, TribeType
from app.infrastructure.database.models.troop_instance import (
    TroopInstance,
    TroopLocation,
)
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.village import Village, VillageRole, VillageType

__all__ = [
    # Models
    "User",
    "GameAccount",
    "Village",
    "BuildingInstance",
    "TroopInstance",
    "BattleReport",
    # Enums
    "TribeType",
    "VillageRole",
    "VillageType",
    "TroopLocation",
    "ReportType",
    "BattleResult",
]
