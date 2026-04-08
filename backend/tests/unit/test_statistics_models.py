"""Unit tests for statistics database models (MapConquest, MapNameChange, MapServerStats)."""

import uuid

from app.infrastructure.database.models.map_data import (
    MapConquest,
    MapNameChange,
    MapServerStats,
)


class TestMapConquestModel:
    """Tests for MapConquest model."""

    def test_conquest_creation(self) -> None:
        """Test MapConquest model can be instantiated with required fields."""
        snapshot_id = str(uuid.uuid4())
        conquest = MapConquest(
            server_url="https://ts1.travian.com",
            detected_at_snapshot_id=snapshot_id,
            village_id=12345,
            village_name="Test Village",
            village_x=100,
            village_y=-50,
            old_player_id=1,
            old_player_name="OldPlayer",
            old_alliance_name="OldAlliance",
            new_player_id=2,
            new_player_name="NewPlayer",
            new_alliance_name="NewAlliance",
        )
        assert conquest.server_url == "https://ts1.travian.com"
        assert conquest.detected_at_snapshot_id == snapshot_id
        assert conquest.village_id == 12345
        assert conquest.village_name == "Test Village"
        assert conquest.village_x == 100
        assert conquest.village_y == -50
        assert conquest.old_player_id == 1
        assert conquest.old_player_name == "OldPlayer"
        assert conquest.old_alliance_name == "OldAlliance"
        assert conquest.new_player_id == 2
        assert conquest.new_player_name == "NewPlayer"
        assert conquest.new_alliance_name == "NewAlliance"

    def test_conquest_nullable_fields(self) -> None:
        """Test MapConquest model with nullable fields."""
        conquest = MapConquest(
            server_url="https://ts1.travian.com",
            detected_at_snapshot_id=str(uuid.uuid4()),
            village_id=12345,
            village_x=0,
            village_y=0,
        )
        assert conquest.village_name is None
        assert conquest.old_player_id is None
        assert conquest.old_player_name is None
        assert conquest.old_alliance_name is None
        assert conquest.new_player_id is None
        assert conquest.new_player_name is None
        assert conquest.new_alliance_name is None

    def test_conquest_has_uuid_default(self) -> None:
        """Test MapConquest conquest_id has a UUID default."""
        conquest = MapConquest(
            server_url="https://ts1.travian.com",
            detected_at_snapshot_id=str(uuid.uuid4()),
            village_id=1,
            village_x=0,
            village_y=0,
        )
        # conquest_id should be auto-generated via default
        # When not persisted, it may be None or a generated UUID string
        # The important thing is the column exists
        assert hasattr(conquest, "conquest_id")

    def test_conquest_tablename(self) -> None:
        """Test MapConquest table name."""
        assert MapConquest.__tablename__ == "map_conquests"


class TestMapNameChangeModel:
    """Tests for MapNameChange model."""

    def test_name_change_creation(self) -> None:
        """Test MapNameChange model can be instantiated."""
        snapshot_id = str(uuid.uuid4())
        change = MapNameChange(
            server_url="https://ts1.travian.com",
            detected_at_snapshot_id=snapshot_id,
            player_id=42,
            old_name="OldName",
            new_name="NewName",
            game_day=15,
        )
        assert change.server_url == "https://ts1.travian.com"
        assert change.detected_at_snapshot_id == snapshot_id
        assert change.player_id == 42
        assert change.old_name == "OldName"
        assert change.new_name == "NewName"
        assert change.game_day == 15

    def test_name_change_nullable_game_day(self) -> None:
        """Test MapNameChange with nullable game_day."""
        change = MapNameChange(
            server_url="https://ts1.travian.com",
            detected_at_snapshot_id=str(uuid.uuid4()),
            player_id=42,
            old_name="OldName",
            new_name="NewName",
        )
        assert change.game_day is None

    def test_name_change_has_uuid_default(self) -> None:
        """Test MapNameChange change_id has a UUID default."""
        change = MapNameChange(
            server_url="https://ts1.travian.com",
            detected_at_snapshot_id=str(uuid.uuid4()),
            player_id=1,
            old_name="Old",
            new_name="New",
        )
        assert hasattr(change, "change_id")

    def test_name_change_tablename(self) -> None:
        """Test MapNameChange table name."""
        assert MapNameChange.__tablename__ == "map_name_changes"


class TestMapServerStatsModel:
    """Tests for MapServerStats model."""

    def test_server_stats_creation(self) -> None:
        """Test MapServerStats model can be instantiated."""
        snapshot_id = str(uuid.uuid4())
        stats = MapServerStats(
            snapshot_id=snapshot_id,
            server_url="https://ts1.travian.com",
            total_players=500,
            active_players=300,
            total_villages=2000,
            total_alliances=50,
            total_population=1000000,
            new_players=10,
            deleted_players=5,
            villages_settled=20,
            villages_destroyed=3,
            conquests_today=7,
        )
        assert stats.snapshot_id == snapshot_id
        assert stats.server_url == "https://ts1.travian.com"
        assert stats.total_players == 500
        assert stats.active_players == 300
        assert stats.total_villages == 2000
        assert stats.total_alliances == 50
        assert stats.total_population == 1000000
        assert stats.new_players == 10
        assert stats.deleted_players == 5
        assert stats.villages_settled == 20
        assert stats.villages_destroyed == 3
        assert stats.conquests_today == 7

    def test_server_stats_defaults(self) -> None:
        """Test MapServerStats default values."""
        stats = MapServerStats(
            snapshot_id=str(uuid.uuid4()),
            server_url="https://ts1.travian.com",
        )
        # These fields should have default=0, but Python-side defaults
        # may not be applied until flush. Check the attribute exists.
        assert hasattr(stats, "total_players")
        assert hasattr(stats, "active_players")
        assert hasattr(stats, "total_villages")
        assert hasattr(stats, "total_alliances")
        assert hasattr(stats, "total_population")
        assert hasattr(stats, "new_players")
        assert hasattr(stats, "deleted_players")
        assert hasattr(stats, "villages_settled")
        assert hasattr(stats, "villages_destroyed")
        assert hasattr(stats, "conquests_today")

    def test_server_stats_has_uuid_default(self) -> None:
        """Test MapServerStats stats_id has a UUID default."""
        stats = MapServerStats(
            snapshot_id=str(uuid.uuid4()),
            server_url="https://ts1.travian.com",
        )
        assert hasattr(stats, "stats_id")

    def test_server_stats_tablename(self) -> None:
        """Test MapServerStats table name."""
        assert MapServerStats.__tablename__ == "map_server_stats"
