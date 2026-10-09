"""Unit tests for game data schemas."""

from app.domain.schemas.game_data import (
    Artefact,
    ArtefactData,
    ArtefactRange,
    ArtefactType,
    Beast,
    Building,
    BuildingCategory,
    BuildingLevel,
    BuildingPrerequisite,
    Oasis,
    OasisType,
    ResourceBonus,
    ResourceField,
    ResourceFieldLevel,
    ResourceType,
    Troop,
    TroopCategory,
    TroopData,
    TroopTribe,
)


class TestBuildingSchema:
    """Tests for Building schema."""

    def test_building_level_creation(self) -> None:
        """Test BuildingLevel can be created."""
        level = BuildingLevel(
            level=1,
            cost_wood=210,
            cost_clay=140,
            cost_iron=260,
            cost_crop=120,
            build_time_base=1020,
            population=4,
            culture_points=1,
            effect_value=0.95,
            effect_description="訓練時間 -5%",
        )
        assert level.level == 1
        assert level.total_cost == 730  # 210+140+260+120

    def test_building_prerequisite(self) -> None:
        """Test BuildingPrerequisite validation."""
        prereq = BuildingPrerequisite(building_id="main_building", level=3)
        assert prereq.building_id == "main_building"
        assert prereq.level == 3

    def test_building_creation(self) -> None:
        """Test Building can be created."""
        building = Building(
            building_id="barracks",
            name_zh="兵營",
            name_en="Barracks",
            category=BuildingCategory.MILITARY,
            max_level=20,
            prerequisites=[
                BuildingPrerequisite(building_id="main_building", level=3),
            ],
            levels=[
                BuildingLevel(
                    level=1,
                    cost_wood=210,
                    cost_clay=140,
                    cost_iron=260,
                    cost_crop=120,
                    build_time_base=1020,
                    population=4,
                    culture_points=1,
                ),
            ],
        )
        assert building.building_id == "barracks"
        assert building.category == BuildingCategory.MILITARY
        assert len(building.prerequisites) == 1

    def test_building_get_level(self) -> None:
        """Test Building.get_level method."""
        building = Building(
            building_id="test",
            name_zh="測試",
            name_en="Test",
            category=BuildingCategory.INFRASTRUCTURE,
            levels=[
                BuildingLevel(
                    level=1,
                    cost_wood=100,
                    cost_clay=100,
                    cost_iron=100,
                    cost_crop=100,
                    build_time_base=100,
                    population=1,
                    culture_points=1,
                ),
                BuildingLevel(
                    level=2,
                    cost_wood=200,
                    cost_clay=200,
                    cost_iron=200,
                    cost_crop=200,
                    build_time_base=200,
                    population=1,
                    culture_points=2,
                ),
            ],
        )
        level1 = building.get_level(1)
        level2 = building.get_level(2)
        level3 = building.get_level(3)

        assert level1 is not None
        assert level1.cost_wood == 100
        assert level2 is not None
        assert level2.cost_wood == 200
        assert level3 is None

    def test_building_get_upgrade_cost(self) -> None:
        """Test Building.get_upgrade_cost method."""
        building = Building(
            building_id="test",
            name_zh="測試",
            name_en="Test",
            category=BuildingCategory.INFRASTRUCTURE,
            levels=[
                BuildingLevel(
                    level=1,
                    cost_wood=100,
                    cost_clay=100,
                    cost_iron=100,
                    cost_crop=100,
                    build_time_base=100,
                    population=1,
                    culture_points=1,
                ),
                BuildingLevel(
                    level=2,
                    cost_wood=200,
                    cost_clay=200,
                    cost_iron=200,
                    cost_crop=200,
                    build_time_base=200,
                    population=1,
                    culture_points=2,
                ),
                BuildingLevel(
                    level=3,
                    cost_wood=300,
                    cost_clay=300,
                    cost_iron=300,
                    cost_crop=300,
                    build_time_base=300,
                    population=1,
                    culture_points=3,
                ),
            ],
        )
        # Upgrade from level 1 to 3
        cost = building.get_upgrade_cost(1, 3)
        assert cost is not None
        assert cost["wood"] == 500  # 200 + 300
        assert cost["clay"] == 500

        # Invalid upgrade
        assert building.get_upgrade_cost(3, 1) is None

    def test_building_category_enum(self) -> None:
        """Test BuildingCategory enum values."""
        assert BuildingCategory.MILITARY.value == "military"
        assert BuildingCategory.RESOURCE.value == "resource"
        assert BuildingCategory.INFRASTRUCTURE.value == "infrastructure"


class TestTroopSchema:
    """Tests for Troop schema."""

    def test_troop_creation(self) -> None:
        """Test Troop can be created."""
        troop = Troop(
            troop_id="legionnaire",
            name_zh="軍團兵",
            name_en="Legionnaire",
            tribe=TroopTribe.ROMANS,
            category=TroopCategory.INFANTRY,
            attack=40,
            defense_infantry=35,
            defense_cavalry=50,
            speed=6,
            speed_source="ts11",
            carry_capacity=50,
            cost_wood=120,
            cost_clay=100,
            cost_iron=150,
            cost_crop=30,
            crop_consumption=1,
            training_time_base=1600,
            training_building="barracks",
        )
        assert troop.troop_id == "legionnaire"
        assert troop.tribe == TroopTribe.ROMANS

    def test_troop_computed_fields(self) -> None:
        """Test Troop computed fields."""
        troop = Troop(
            troop_id="test",
            name_zh="測試",
            name_en="Test",
            tribe=TroopTribe.TEUTONS,
            category=TroopCategory.INFANTRY,
            attack=60,
            defense_infantry=30,
            defense_cavalry=30,
            speed=6,
            speed_source="ts11",
            carry_capacity=50,
            cost_wood=100,
            cost_clay=100,
            cost_iron=100,
            cost_crop=100,
            crop_consumption=1,
            training_time_base=1000,
            training_building="barracks",
        )
        assert troop.total_cost == 400
        assert troop.attack_per_crop == 60.0
        assert troop.defense_infantry_per_crop == 30.0

    def test_troop_tribe_enum(self) -> None:
        """Test TroopTribe enum values."""
        assert TroopTribe.ROMANS.value == "romans"
        assert TroopTribe.GAULS.value == "gauls"
        assert TroopTribe.TEUTONS.value == "teutons"
        assert TroopTribe.HUNS.value == "huns"
        assert TroopTribe.EGYPTIANS.value == "egyptians"
        assert TroopTribe.VIKINGS.value == "vikings"
        assert TroopTribe.SPARTANS.value == "spartans"

    def test_troop_data_get_by_tribe(self) -> None:
        """Test TroopData.get_troops_by_tribe method."""
        data = TroopData(
            troops={
                "legionnaire": Troop(
                    troop_id="legionnaire",
                    name_zh="軍團兵",
                    name_en="Legionnaire",
                    tribe=TroopTribe.ROMANS,
                    category=TroopCategory.INFANTRY,
                    attack=40,
                    defense_infantry=35,
                    defense_cavalry=50,
                    speed=6,
                    speed_source="ts11",
                    carry_capacity=50,
                    cost_wood=120,
                    cost_clay=100,
                    cost_iron=150,
                    cost_crop=30,
                    crop_consumption=1,
                    training_time_base=1600,
                    training_building="barracks",
                ),
                "clubswinger": Troop(
                    troop_id="clubswinger",
                    name_zh="棍棒兵",
                    name_en="Clubswinger",
                    tribe=TroopTribe.TEUTONS,
                    category=TroopCategory.INFANTRY,
                    attack=40,
                    defense_infantry=20,
                    defense_cavalry=5,
                    speed=7,
                    speed_source="ts11",
                    carry_capacity=60,
                    cost_wood=95,
                    cost_clay=75,
                    cost_iron=40,
                    cost_crop=40,
                    crop_consumption=1,
                    training_time_base=720,
                    training_building="barracks",
                ),
            }
        )
        romans = data.get_troops_by_tribe(TroopTribe.ROMANS)
        assert len(romans) == 1
        assert romans[0].troop_id == "legionnaire"


class TestResourceFieldSchema:
    """Tests for ResourceField schema."""

    def test_resource_field_level(self) -> None:
        """Test ResourceFieldLevel can be created."""
        level = ResourceFieldLevel(
            level=1,
            production_per_hour=5,
            cost_wood=40,
            cost_clay=100,
            cost_iron=50,
            cost_crop=60,
            build_time_base=260,
            population=2,
            culture_points=1,
        )
        assert level.level == 1
        assert level.production_per_hour == 5
        assert level.total_cost == 250

    def test_resource_field_creation(self) -> None:
        """Test ResourceField can be created."""
        field = ResourceField(
            resource_type=ResourceType.WOOD,
            name_zh="伐木場",
            name_en="Woodcutter",
            max_level=10,
            max_level_capital=20,
            levels=[
                ResourceFieldLevel(
                    level=0,
                    production_per_hour=2,
                    cost_wood=0,
                    cost_clay=0,
                    cost_iron=0,
                    cost_crop=0,
                    build_time_base=0,
                    population=0,
                    culture_points=0,
                ),
                ResourceFieldLevel(
                    level=1,
                    production_per_hour=5,
                    cost_wood=40,
                    cost_clay=100,
                    cost_iron=50,
                    cost_crop=60,
                    build_time_base=260,
                    population=2,
                    culture_points=1,
                ),
            ],
        )
        assert field.resource_type == ResourceType.WOOD

    def test_resource_field_roi(self) -> None:
        """Test ResourceField.calculate_roi method."""
        field = ResourceField(
            resource_type=ResourceType.WOOD,
            name_zh="伐木場",
            name_en="Woodcutter",
            levels=[
                ResourceFieldLevel(
                    level=0,
                    production_per_hour=2,
                    cost_wood=0,
                    cost_clay=0,
                    cost_iron=0,
                    cost_crop=0,
                    build_time_base=0,
                    population=0,
                    culture_points=0,
                ),
                ResourceFieldLevel(
                    level=1,
                    production_per_hour=5,
                    cost_wood=40,
                    cost_clay=100,
                    cost_iron=50,
                    cost_crop=60,
                    build_time_base=260,
                    population=2,
                    culture_points=1,
                ),
            ],
        )
        # ROI = 250 / (5-2) = 83.33 hours
        roi = field.calculate_roi(0)
        assert roi is not None
        assert abs(roi - 83.33) < 0.1

    def test_resource_type_enum(self) -> None:
        """Test ResourceType enum values."""
        assert ResourceType.WOOD.value == "wood"
        assert ResourceType.CLAY.value == "clay"
        assert ResourceType.IRON.value == "iron"
        assert ResourceType.CROP.value == "crop"


class TestOasisSchema:
    """Tests for Oasis schema."""

    def test_oasis_creation(self) -> None:
        """Test Oasis can be created."""
        oasis = Oasis(
            oasis_id="wood_50",
            oasis_type=OasisType.SINGLE,
            bonuses=[ResourceBonus(resource_type="wood", bonus_percentage=50)],
            beast_spawns=[],
        )
        assert oasis.oasis_id == "wood_50"
        assert oasis.total_bonus == 50

    def test_double_oasis(self) -> None:
        """Test double resource oasis."""
        oasis = Oasis(
            oasis_id="wood_clay_25",
            oasis_type=OasisType.DOUBLE,
            bonuses=[
                ResourceBonus(resource_type="wood", bonus_percentage=25),
                ResourceBonus(resource_type="clay", bonus_percentage=25),
            ],
        )
        assert oasis.oasis_type == OasisType.DOUBLE
        assert oasis.total_bonus == 50
        assert len(oasis.bonuses) == 2

    def test_beast_creation(self) -> None:
        """Test Beast can be created."""
        beast = Beast(
            beast_id="wolf",
            name_zh="狼",
            name_en="Wolf",
            attack=100,
            defense_infantry=80,
            defense_cavalry=70,
            resource_drop_min=5,
            resource_drop_max=10,
            hero_experience=5,
        )
        assert beast.beast_id == "wolf"
        assert beast.attack == 100


class TestArtefactSchema:
    """Tests for Artefact schema."""

    def test_artefact_creation(self) -> None:
        """Test Artefact can be created."""
        from app.domain.schemas.game_data.artefact import ArtefactEffect

        artefact = Artefact(
            artefact_id="trainer_small",
            name_zh="訓練師的小神器",
            name_en="Small Trainer Artifact",
            artefact_type=ArtefactType.SMALL,
            effect_range=ArtefactRange.VILLAGE,
            effects=[
                ArtefactEffect(
                    effect_type="training_speed",
                    effect_description_zh="訓練速度提升",
                    effect_description_en="Training speed boost",
                    effect_value=-25,
                    effect_unit="percent",
                )
            ],
            spawn_day=100,
        )
        assert artefact.artefact_id == "trainer_small"
        assert artefact.artefact_type == ArtefactType.SMALL
        assert artefact.effect_range == ArtefactRange.VILLAGE

    def test_artefact_type_enum(self) -> None:
        """Test ArtefactType enum values."""
        assert ArtefactType.SMALL.value == "small"
        assert ArtefactType.LARGE.value == "large"
        assert ArtefactType.UNIQUE.value == "unique"

    def test_artefact_data_get_by_type(self) -> None:
        """Test ArtefactData.get_artefacts_by_type method."""
        from app.domain.schemas.game_data.artefact import ArtefactEffect

        data = ArtefactData(
            artefacts={
                "trainer_small": Artefact(
                    artefact_id="trainer_small",
                    name_zh="訓練師的小神器",
                    name_en="Small Trainer",
                    artefact_type=ArtefactType.SMALL,
                    effect_range=ArtefactRange.VILLAGE,
                    effects=[
                        ArtefactEffect(
                            effect_type="training_speed",
                            effect_description_zh="訓練速度提升",
                            effect_description_en="Training speed boost",
                            effect_value=-25,
                            effect_unit="percent",
                        )
                    ],
                    spawn_day=100,
                ),
                "trainer_unique": Artefact(
                    artefact_id="trainer_unique",
                    name_zh="訓練師的獨特神器",
                    name_en="Unique Trainer",
                    artefact_type=ArtefactType.UNIQUE,
                    effect_range=ArtefactRange.ACCOUNT,
                    effects=[
                        ArtefactEffect(
                            effect_type="training_speed",
                            effect_description_zh="訓練速度提升",
                            effect_description_en="Training speed boost",
                            effect_value=-50,
                            effect_unit="percent",
                        )
                    ],
                    spawn_day=100,
                ),
            }
        )
        small = data.get_artefacts_by_type(ArtefactType.SMALL)
        unique = data.get_artefacts_by_type(ArtefactType.UNIQUE)

        assert len(small) == 1
        assert len(unique) == 1
        assert small[0].artefact_id == "trainer_small"
