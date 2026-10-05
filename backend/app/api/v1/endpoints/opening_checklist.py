"""開局攻略清單 API（P0-10）.

- ``GET /opening-checklist``：清單內容（兩套攻略、參考表；靜態資料）
- ``GET /opening-checklist/progress/{account_id}/{strategy}``：勾選進度
- ``PUT /opening-checklist/progress/{account_id}/{strategy}/{step_id}``：勾選或取消

進度按帳號 × 世界 × 攻略分開；只能讀寫自己的帳號。
"""

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.opening_checklist import (
    OpeningProgressResponse,
    OpeningStrategy,
    StepCheckUpdate,
)
from app.infrastructure.database.models.game_account import GameAccount
from app.services.opening_checklist_service import (
    OpeningChecklistService,
    UnknownStepError,
    load_checklist,
    optional_step_ids,
    step_order,
)

router = APIRouter(prefix="/opening-checklist", tags=["opening-checklist"])


def _owned_account(
    service: OpeningChecklistService, account_id: str, user_id: str
) -> GameAccount:
    account = service.get_account(account_id, user_id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="遊戲帳號不存在"
        )
    return account


def _progress(
    account: GameAccount, strategy: OpeningStrategy, checked: list[str]
) -> OpeningProgressResponse:
    assert account.world_id is not None  # get_account 已經補上世界
    optional = optional_step_ids(strategy.value)
    return OpeningProgressResponse(
        account_id=account.account_id,
        world_id=account.world_id,
        strategy=strategy,
        checked_step_ids=checked,
        # 主進度只算必做；選做（便宜的文明點建築）另外算
        required_checked=sum(1 for sid in checked if sid not in optional),
        required_total=len(step_order(strategy.value)) - len(optional),
        optional_checked=sum(1 for sid in checked if sid in optional),
        optional_total=len(optional),
    )


@router.get(
    "",
    summary="開局攻略清單內容",
    description="兩套攻略（4P 農開、3P 兵開）的步驟、跟部族有關的欄位、參考表。"
    "內容來自 Peter 的 Excel，是靜態資料。",
)
def get_checklist(current_user: CurrentUser) -> dict[str, Any]:
    """清單內容."""
    return load_checklist()


@router.get(
    "/progress/{account_id}/{strategy}",
    response_model=OpeningProgressResponse,
    summary="取得勾選進度",
    description="這個帳號在目前的世界、這套攻略勾掉了哪些步驟",
)
def get_progress(
    account_id: str,
    strategy: OpeningStrategy,
    db: DBSession,
    current_user: CurrentUser,
) -> OpeningProgressResponse:
    """取得進度."""
    service = OpeningChecklistService(db)
    account = _owned_account(service, account_id, current_user.user_id)
    return _progress(account, strategy, service.checked_steps(account, strategy))


@router.put(
    "/progress/{account_id}/{strategy}/{step_id}",
    response_model=OpeningProgressResponse,
    summary="勾選或取消一步",
    description="checked=true 勾選、false 取消；同樣的請求送幾次結果都一樣",
)
def set_step(
    account_id: str,
    strategy: OpeningStrategy,
    step_id: str,
    data: StepCheckUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> OpeningProgressResponse:
    """勾選或取消."""
    service = OpeningChecklistService(db)
    account = _owned_account(service, account_id, current_user.user_id)
    try:
        checked = service.set_step(account, strategy, step_id, data.checked)
    except UnknownStepError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="這套攻略沒有這一步"
        ) from None
    return _progress(account, strategy, checked)
