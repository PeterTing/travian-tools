"""基礎儲存庫介面."""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

T = TypeVar("T")


class BaseRepository(ABC, Generic[T]):
    """基礎儲存庫抽象類."""

    @abstractmethod
    def get_by_id(self, id: int) -> T | None:
        """根據 ID 取得實體."""
        pass

    @abstractmethod
    def get_all(self) -> list[T]:
        """取得所有實體."""
        pass

    @abstractmethod
    def create(self, entity: T) -> T:
        """建立實體."""
        pass

    @abstractmethod
    def update(self, entity: T) -> T:
        """更新實體."""
        pass

    @abstractmethod
    def delete(self, id: int) -> bool:
        """刪除實體."""
        pass
