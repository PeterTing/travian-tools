"""Unit tests for database models."""

import uuid
from datetime import datetime

from app.infrastructure.database.models import (
    BattleReport,
    BattleResult,
    BuildingInstance,
    GameAccount,
    ReportType,
    TribeType,
    TroopInstance,
    TroopLocation,
    User,
    Village,
    VillageRole,
    VillageType,
)


class TestUserModel:
    """Tests for User model."""

    def test_user_creation(self) -> None:
        """Test User model can be instantiated."""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
        )
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.password_hash == "hashed_password"

    def test_user_optional_fields(self) -> None:
        """Test User model optional fields."""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
        )
        # These fields are nullable and have no Python-side defaults
        assert user.preferences is None
        assert user.last_login is None

    def test_user_repr(self) -> None:
        """Test User model __repr__."""
        user = User(
            user_id="test-uuid",
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
        )
        assert "testuser" in repr(user)


class TestGameAccountModel:
    """Tests for GameAccount model."""

    def test_game_account_creation(self) -> None:
        """Test GameAccount model can be instantiated."""
        account = GameAccount(
            user_id=str(uuid.uuid4()),
            server_url="https://ts1.travian.com",
            server_name="TS1",
            tribe=TribeType.ROMANS,
        )
        assert account.server_url == "https://ts1.travian.com"
        assert account.tribe == TribeType.ROMANS

    def test_tribe_type_enum(self) -> None:
        """Test TribeType enum values."""
        assert TribeType.ROMANS.value == "romans"
        assert TribeType.GAULS.value == "gauls"
        assert TribeType.TEUTONS.value == "teutons"
        assert TribeType.HUNS.value == "huns"
        assert TribeType.EGYPTIANS.value == "egyptians"
        assert TribeType.VIKINGS.value == "vikings"
        assert TribeType.SPARTANS.value == "spartans"

    def test_game_account_with_tribe(self) -> None:
        """Test GameAccount model with all tribe types."""
        for tribe in TribeType:
            account = GameAccount(
                user_id=str(uuid.uuid4()),
                server_url="https://ts1.travian.com",
                tribe=tribe,
            )
            assert account.tribe == tribe


class TestVillageModel:
    """Tests for Village model."""

    def test_village_creation(self) -> None:
        """Test Village model can be instantiated."""
        village = Village(
            account_id=str(uuid.uuid4()),
            name="Test Village",
            coordinate_x=100,
            coordinate_y=-50,
            population=500,
        )
        assert village.name == "Test Village"
        assert village.coordinate_x == 100
        assert village.coordinate_y == -50

    def test_village_role_enum(self) -> None:
        """Test VillageRole enum values."""
        assert VillageRole.CAPITAL.value == "capital"
        assert VillageRole.HAMMER.value == "hammer"
        assert VillageRole.ANVIL.value == "anvil"
        assert VillageRole.RESOURCE.value == "resource"
        assert VillageRole.MIXED.value == "mixed"
        assert VillageRole.WW.value == "ww"

    def test_village_type_enum(self) -> None:
        """Test VillageType enum values."""
        assert VillageType.TYPE_4446.value == "4-4-4-6"
        assert VillageType.TYPE_3456.value == "3-4-5-6"
        assert VillageType.TYPE_15C.value == "15c"
        assert VillageType.TYPE_9C.value == "9c"

    def test_village_with_role_and_type(self) -> None:
        """Test Village with role and type."""
        village = Village(
            account_id=str(uuid.uuid4()),
            name="Hammer Village",
            role=VillageRole.HAMMER,
            village_type=VillageType.TYPE_15C,
        )
        assert village.role == VillageRole.HAMMER
        assert village.village_type == VillageType.TYPE_15C


class TestBuildingInstanceModel:
    """Tests for BuildingInstance model."""

    def test_building_instance_creation(self) -> None:
        """Test BuildingInstance model can be instantiated."""
        building = BuildingInstance(
            village_id=str(uuid.uuid4()),
            building_id="barracks",
            position=19,
            current_level=10,
        )
        assert building.building_id == "barracks"
        assert building.position == 19
        assert building.current_level == 10

    def test_building_instance_upgrading(self) -> None:
        """Test BuildingInstance model with upgrading status."""
        finish_time = datetime.now()
        building = BuildingInstance(
            village_id=str(uuid.uuid4()),
            building_id="barracks",
            position=19,
            current_level=10,
            is_upgrading=True,
            upgrade_finish_time=finish_time,
        )
        assert building.is_upgrading is True
        assert building.upgrade_finish_time == finish_time


class TestTroopInstanceModel:
    """Tests for TroopInstance model."""

    def test_troop_instance_creation(self) -> None:
        """Test TroopInstance model can be instantiated."""
        troop = TroopInstance(
            village_id=str(uuid.uuid4()),
            troop_id="legionnaire",
            count=1000,
            location=TroopLocation.HOME,
        )
        assert troop.troop_id == "legionnaire"
        assert troop.count == 1000
        assert troop.location == TroopLocation.HOME

    def test_troop_location_enum(self) -> None:
        """Test TroopLocation enum values."""
        assert TroopLocation.HOME.value == "home"
        assert TroopLocation.MOVING.value == "moving"
        assert TroopLocation.STATIONED.value == "stationed"
        assert TroopLocation.ATTACKING.value == "attacking"

    def test_troop_instance_training(self) -> None:
        """Test TroopInstance model with training status."""
        finish_time = datetime.now()
        troop = TroopInstance(
            village_id=str(uuid.uuid4()),
            troop_id="legionnaire",
            count=0,
            is_training=True,
            training_finish_time=finish_time,
        )
        assert troop.is_training is True
        assert troop.training_finish_time == finish_time


class TestBattleReportModel:
    """Tests for BattleReport model."""

    def test_battle_report_creation(self) -> None:
        """Test BattleReport model can be instantiated."""
        report = BattleReport(
            account_id=str(uuid.uuid4()),
            report_type=ReportType.ATTACK,
            battle_time=datetime.now(),
            result=BattleResult.ATTACKER_WIN,
            attacker_troops={"legionnaire": 100},
            defender_troops={"phalanx": 50},
            attacker_losses={"legionnaire": 10},
            defender_losses={"phalanx": 50},
            resources_stolen={"wood": 1000, "clay": 1000},
        )
        assert report.report_type == ReportType.ATTACK
        assert report.result == BattleResult.ATTACKER_WIN
        assert report.attacker_troops == {"legionnaire": 100}

    def test_report_type_enum(self) -> None:
        """Test ReportType enum values."""
        assert ReportType.ATTACK.value == "attack"
        assert ReportType.DEFENSE.value == "defense"
        assert ReportType.SCOUT.value == "scout"
        assert ReportType.REINFORCEMENT.value == "reinforcement"

    def test_battle_result_enum(self) -> None:
        """Test BattleResult enum values."""
        assert BattleResult.ATTACKER_WIN.value == "attacker_win"
        assert BattleResult.DEFENDER_WIN.value == "defender_win"
        assert BattleResult.DRAW.value == "draw"

    def test_battle_report_all_types(self) -> None:
        """Test BattleReport with all report types."""
        for report_type in ReportType:
            report = BattleReport(
                account_id=str(uuid.uuid4()),
                report_type=report_type,
                battle_time=datetime.now(),
            )
            assert report.report_type == report_type
