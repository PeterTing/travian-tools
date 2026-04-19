"""執行任務 API（PRD F5.1 操作佇列）.

Phase 3 才會實作具體 endpoint；目前為 stub router 以滿足 `app/api/v1/__init__.py`
的 import，並讓後續新增 endpoint 時不需要改動 router 組裝碼。
"""

from fastapi import APIRouter

router = APIRouter(prefix="/execution", tags=["execution"])
