"""資料庫 Session 設定."""

from typing import Any

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# 確保 DATABASE_URL 包含 charset 參數
database_url = settings.DATABASE_URL
if "charset=" not in database_url:
    separator = "&" if "?" in database_url else "?"
    database_url = (
        f"{database_url}{separator}charset=utf8mb4&collation=utf8mb4_unicode_ci"
    )

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={
        "charset": "utf8mb4",
        "use_unicode": True,
    },
)


# 設定連接時使用 utf8mb4 編碼
@event.listens_for(engine, "connect")
def set_charset(dbapi_connection: Any, connection_record: Any) -> None:
    """在每個連接建立時設定字元編碼為 utf8mb4."""
    cursor = dbapi_connection.cursor()
    cursor.execute("SET NAMES utf8mb4")
    cursor.execute("SET CHARACTER SET utf8mb4")
    cursor.execute("SET character_set_connection=utf8mb4")
    cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
