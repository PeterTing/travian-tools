"""基礎實體定義."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseEntity(BaseModel):
    """基礎實體."""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
