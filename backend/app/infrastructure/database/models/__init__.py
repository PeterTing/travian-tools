"""Database models."""

from app.infrastructure.database.models.battle_report import (
    BattleReport,
    BattleResult,
    ReportType,
)
from app.infrastructure.database.models.building_instance import BuildingInstance
from app.infrastructure.database.models.game_account import GameAccount, TribeType
from app.infrastructure.database.models.game_world import GameWorld
from app.infrastructure.database.models.map_data import (
    MapAllianceData,
    MapConquest,
    MapNameChange,
    MapPlayerData,
    MapServerStats,
    MapSnapshot,
    MapVillageData,
)
from app.infrastructure.database.models.opening_checklist import (
    OpeningChecklistProgress,
)
from app.infrastructure.database.models.parse_draft import ParseDraft
from app.infrastructure.database.models.reminder import (
    Notification,
    PushSubscription,
    ReminderRule,
    ReminderType,
)
from app.infrastructure.database.models.sync_log import SyncLog, SyncStatus, SyncType
from app.infrastructure.database.models.troop_instance import (
    TroopInstance,
    TroopLocation,
)
from app.infrastructure.database.models.troop_movement import TroopMovement
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.village import Village, VillageRole, VillageType

__all__ = [
    # Models
    "User",
    "GameAccount",
    "GameWorld",
    "Village",
    "BuildingInstance",
    "TroopInstance",
    "BattleReport",
    "SyncLog",
    "TroopMovement",
    "ParseDraft",
    "OpeningChecklistProgress",
    "MapSnapshot",
    "MapVillageData",
    "MapPlayerData",
    "MapAllianceData",
    "MapConquest",
    "MapNameChange",
    "MapServerStats",
    "ReminderRule",
    "Notification",
    "PushSubscription",
    # Enums
    "TribeType",
    "VillageRole",
    "VillageType",
    "TroopLocation",
    "ReportType",
    "BattleResult",
    "SyncType",
    "SyncStatus",
    "ReminderType",
]
