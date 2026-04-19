"""自動化設定 API（PRD F5 半自動執行系統）.

Phase 3 才會實作具體 endpoint；目前為 stub router。
"""

from fastapi import APIRouter

router = APIRouter(prefix="/automation", tags=["automation"])
