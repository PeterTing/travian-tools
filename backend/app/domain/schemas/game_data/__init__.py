"""Game data schemas for static JSON data validation."""

from app.domain.schemas.game_data.artefact import (
    Artefact,
    ArtefactData,
    ArtefactRange,
    ArtefactType,
)
from app.domain.schemas.game_data.building import (
    Building,
    BuildingCategory,
    BuildingData,
    BuildingLevel,
    BuildingPrerequisite,
)
from app.domain.schemas.game_data.oasis import (
    Beast,
    BeastData,
    Oasis,
    OasisData,
    OasisType,
    ResourceBonus,
)
from app.domain.schemas.game_data.resource import (
    ResourceField,
    ResourceFieldData,
    ResourceFieldLevel,
    ResourceType,
)
from app.domain.schemas.game_data.troop import (
    Troop,
    TroopCategory,
    TroopData,
    TroopTribe,
)

__all__ = [
    # Building
    "Building",
    "BuildingLevel",
    "BuildingPrerequisite",
    "BuildingCategory",
    "BuildingData",
    # Troop
    "Troop",
    "TroopCategory",
    "TroopTribe",
    "TroopData",
    # Resource
    "ResourceField",
    "ResourceFieldLevel",
    "ResourceType",
    "ResourceFieldData",
    # Oasis
    "Oasis",
    "OasisType",
    "ResourceBonus",
    "Beast",
    "BeastData",
    "OasisData",
    # Artefact
    "Artefact",
    "ArtefactType",
    "ArtefactRange",
    "ArtefactData",
]
