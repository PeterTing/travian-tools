"""Game data service for loading and validating static JSON data."""

import json
from pathlib import Path
from typing import Any, TypeVar, cast

from pydantic import BaseModel, ValidationError

from app.domain.schemas.game_data import (
    ArtefactData,
    BuildingData,
    OasisData,
    ResourceFieldData,
    TroopData,
)

T = TypeVar("T", bound=BaseModel)


class GameDataValidationError(Exception):
    """JSON 數據驗證錯誤."""

    def __init__(self, file_path: str, errors: list[dict[str, Any]]) -> None:
        self.file_path = file_path
        self.errors = errors
        super().__init__(f"Validation failed for {file_path}: {errors}")


class GameDataService:
    """遊戲靜態數據服務.

    提供載入、驗證和存取遊戲靜態 JSON 數據的功能。
    """

    def __init__(self, data_dir: Path | str | None = None) -> None:
        """初始化服務.

        Args:
            data_dir: 數據目錄路徑，預設為 backend/data/static
        """
        if data_dir is None:
            # 預設路徑: backend/data/static
            self.data_dir = Path(__file__).parent.parent.parent / "data" / "static"
        else:
            self.data_dir = Path(data_dir)

        self._buildings: BuildingData | None = None
        self._troops: TroopData | None = None
        self._resources: ResourceFieldData | None = None
        self._oases: OasisData | None = None
        self._artefacts: ArtefactData | None = None

    def _load_json(self, filename: str) -> dict[str, Any]:
        """載入 JSON 檔案."""
        file_path = self.data_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Data file not found: {file_path}")

        with file_path.open("r", encoding="utf-8") as f:
            data: dict[str, Any] = json.load(f)
            return data

    def _validate_and_load(self, filename: str, schema_class: type[T]) -> T:
        """載入並驗證 JSON 數據.

        Args:
            filename: JSON 檔案名稱
            schema_class: Pydantic schema 類別

        Returns:
            驗證後的數據物件

        Raises:
            GameDataValidationError: 驗證失敗時
            FileNotFoundError: 檔案不存在時
        """
        data = self._load_json(filename)
        try:
            return schema_class.model_validate(data)
        except ValidationError as e:
            raise GameDataValidationError(
                file_path=str(self.data_dir / filename),
                errors=cast(list[dict[str, Any]], e.errors()),
            ) from e

    def validate_json_file(
        self, filename: str, schema_class: type[BaseModel]
    ) -> tuple[bool, list[dict[str, Any]]]:
        """驗證 JSON 檔案是否符合 Schema.

        Args:
            filename: JSON 檔案名稱
            schema_class: Pydantic schema 類別

        Returns:
            (is_valid, errors) 元組
        """
        try:
            data = self._load_json(filename)
            schema_class.model_validate(data)
            return True, []
        except FileNotFoundError as e:
            return False, [{"type": "file_not_found", "msg": str(e)}]
        except ValidationError as e:
            return False, cast(list[dict[str, Any]], e.errors())

    def validate_all(self) -> dict[str, tuple[bool, list[dict[str, Any]]]]:
        """驗證所有數據檔案.

        Returns:
            {filename: (is_valid, errors)} 字典
        """
        validations: dict[str, type[BaseModel]] = {
            "buildings.json": BuildingData,
            "troops.json": TroopData,
            "resources.json": ResourceFieldData,
            "oases.json": OasisData,
            "artefacts.json": ArtefactData,
        }

        results: dict[str, tuple[bool, list[dict[str, Any]]]] = {}
        for filename, schema_class in validations.items():
            results[filename] = self.validate_json_file(filename, schema_class)

        return results

    @property
    def buildings(self) -> BuildingData:
        """取得建築數據（惰性載入）."""
        if self._buildings is None:
            self._buildings = self._validate_and_load("buildings.json", BuildingData)
        return self._buildings

    @property
    def troops(self) -> TroopData:
        """取得兵種數據（惰性載入）."""
        if self._troops is None:
            self._troops = self._validate_and_load("troops.json", TroopData)
        return self._troops

    @property
    def resources(self) -> ResourceFieldData:
        """取得資源田數據（惰性載入）."""
        if self._resources is None:
            self._resources = self._validate_and_load(
                "resources.json", ResourceFieldData
            )
        return self._resources

    @property
    def oases(self) -> OasisData:
        """取得綠洲數據（惰性載入）."""
        if self._oases is None:
            self._oases = self._validate_and_load("oases.json", OasisData)
        return self._oases

    @property
    def artefacts(self) -> ArtefactData:
        """取得神器數據（惰性載入）."""
        if self._artefacts is None:
            self._artefacts = self._validate_and_load("artefacts.json", ArtefactData)
        return self._artefacts

    def reload(self) -> None:
        """重新載入所有數據."""
        self._buildings = None
        self._troops = None
        self._resources = None
        self._oases = None
        self._artefacts = None


# 全域實例（可用於依賴注入）
_game_data_service: GameDataService | None = None


def get_game_data_service() -> GameDataService:
    """取得遊戲數據服務實例."""
    global _game_data_service
    if _game_data_service is None:
        _game_data_service = GameDataService()
    return _game_data_service
