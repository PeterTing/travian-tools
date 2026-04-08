"""Database models."""

from app.infrastructure.database.models.automation_settings import (
    AutomationSettings,
    KeepAliveLog,
    VillageAutoUpgradeConfig,
)
from app.infrastructure.database.models.battle_report import (
    BattleReport,
    BattleResult,
    ReportType,
)
from app.infrastructure.database.models.building_instance import BuildingInstance
from app.infrastructure.database.models.completion_event import (
    CompletionEvent,
    CompletionEventType,
)
from app.infrastructure.database.models.conversation import (
    Conversation,
    ConversationMessage,
    MessageRole,
)
from app.infrastructure.database.models.execution_task import (
    ExecutionLog,
    ExecutionStatus,
    ExecutionTask,
    ExecutionType,
)
from app.infrastructure.database.models.game_account import GameAccount, TribeType
from app.infrastructure.database.models.map_data import (
    MapAllianceData,
    MapConquest,
    MapNameChange,
    MapPlayerData,
    MapServerStats,
    MapSnapshot,
    MapVillageData,
)
from app.infrastructure.database.models.reminder import (
    Notification,
    PushSubscription,
    ReminderRule,
    ReminderType,
)
from app.infrastructure.database.models.resource_transport import (
    TransportLog,
    TransportMode,
    TransportSchedule,
    VillageTransportConfig,
    VillageTransportRole,
)
from app.infrastructure.database.models.sync_log import SyncLog, SyncStatus, SyncType
from app.infrastructure.database.models.troop_instance import (
    TroopInstance,
    TroopLocation,
)
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.village import Village, VillageRole, VillageType
from app.infrastructure.database.models.village_sync_task import (
    SyncTaskStatus,
    VillageSyncTask,
)

__all__ = [
    # Models
    "User",
    "GameAccount",
    "Village",
    "BuildingInstance",
    "TroopInstance",
    "BattleReport",
    "SyncLog",
    "MapSnapshot",
    "MapVillageData",
    "MapPlayerData",
    "MapAllianceData",
    "MapConquest",
    "MapNameChange",
    "MapServerStats",
    "Conversation",
    "ConversationMessage",
    "ExecutionTask",
    "ExecutionLog",
    "ReminderRule",
    "Notification",
    "PushSubscription",
    # Resource Transport
    "VillageTransportConfig",
    "TransportSchedule",
    "TransportLog",
    # Automation Settings
    "AutomationSettings",
    "VillageAutoUpgradeConfig",
    "KeepAliveLog",
    # Enums
    "TribeType",
    "VillageRole",
    "VillageType",
    "TroopLocation",
    "ReportType",
    "BattleResult",
    "SyncType",
    "SyncStatus",
    "MessageRole",
    "ExecutionType",
    "ExecutionStatus",
    "ReminderType",
    "VillageTransportRole",
    "TransportMode",
    # Sync Task
    "VillageSyncTask",
    "SyncTaskStatus",
    # Completion Event
    "CompletionEvent",
    "CompletionEventType",
]
