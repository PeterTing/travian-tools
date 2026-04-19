"""提醒與通知 API（PRD F5.4）.

Phase 3 才會實作具體 endpoint；目前為 stub router。
"""

from fastapi import APIRouter

router = APIRouter(prefix="/reminders", tags=["reminders"])
