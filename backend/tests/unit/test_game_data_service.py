"""Unit tests for game data service."""

from pathlib import Path

import pytest

from app.domain.schemas.game_data import (
    BuildingCategory,
    BuildingData,
    TroopTribe,
)
from app.services.game_data_service import (
    GameDataService,
)


class TestGameDataService:
    """Tests for GameDataService."""

    @pytest.fixture
    def service(self) -> GameDataService:
        """Create a service with test data directory."""
        data_dir = Path(__file__).parent.parent.parent / "data" / "static"
        return GameDataService(data_dir)

    def test_load_buildings(self, service: GameDataService) -> None:
        """Test loading buildings data."""
        buildings = service.buildings
        assert buildings is not None
        assert "barracks" in buildings.buildings

    def test_load_troops(self, service: GameDataService) -> None:
        """Test loading troops data."""
        troops = service.troops
        assert troops is not None
        assert "legionnaire" in troops.troops

    def test_load_resources(self, service: GameDataService) -> None:
        """Test loading resources data."""
        resources = service.resources
        assert resources is not None
        assert "wood" in resources.resource_fields

    def test_load_oases(self, service: GameDataService) -> None:
        """Test loading oases data."""
        oases = service.oases
        assert oases is not None
        assert "wood_25" in oases.oases
        assert "wolf" in oases.beasts

    def test_load_artefacts(self, service: GameDataService) -> None:
        """Test loading artefacts data."""
        artefacts = service.artefacts
        assert artefacts is not None
        assert "trainer_small" in artefacts.artefacts

    def test_validate_all(self, service: GameDataService) -> None:
        """Test validating all data files."""
        results = service.validate_all()
        for filename, (is_valid, errors) in results.items():
            assert is_valid, f"{filename} validation failed: {errors}"

    def test_building_data_methods(self, service: GameDataService) -> None:
        """Test BuildingData methods."""
        buildings = service.buildings

        # Test get_building
        barracks = buildings.get_building("barracks")
        assert barracks is not None
        assert barracks.name_zh == "兵營"

        # Test get_buildings_by_category
        military = buildings.get_buildings_by_category(BuildingCategory.MILITARY)
        assert len(military) >= 1

    def test_troop_data_methods(self, service: GameDataService) -> None:
        """Test TroopData methods."""
        troops = service.troops

        # Test get_troop
        legionnaire = troops.get_troop("legionnaire")
        assert legionnaire is not None
        assert legionnaire.tribe == TroopTribe.ROMANS

        # Test get_troops_by_tribe
        romans = troops.get_troops_by_tribe(TroopTribe.ROMANS)
        assert len(romans) >= 1

    def test_lazy_loading(self, service: GameDataService) -> None:
        """Test lazy loading behavior."""
        # Initially None
        assert service._buildings is None

        # Load triggers
        _ = service.buildings
        assert service._buildings is not None

    def test_reload(self, service: GameDataService) -> None:
        """Test reload method."""
        # Load data
        _ = service.buildings
        assert service._buildings is not None

        # Reload clears cache
        service.reload()
        assert service._buildings is None

    def test_file_not_found(self) -> None:
        """Test handling of missing data file."""
        service = GameDataService("/nonexistent/path")
        is_valid, errors = service.validate_json_file("buildings.json", BuildingData)
        assert not is_valid
        assert len(errors) == 1
        assert errors[0]["type"] == "file_not_found"
