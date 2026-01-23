"""依賴注入."""

from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.infrastructure.database.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """取得資料庫 session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 類型別名，用於依賴注入
DBSession = Annotated[Session, Depends(get_db)]
