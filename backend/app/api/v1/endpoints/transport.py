"""資源運輸 API（對應 Travco Supply/Push）.

Phase 2 L2 Supply 子系統才會實作具體 endpoint；目前為 stub router。
"""

from fastapi import APIRouter

router = APIRouter(prefix="/transport", tags=["transport"])
