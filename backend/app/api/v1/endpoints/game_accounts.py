"""遊戲帳號 API 端點."""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.game_account import (
    GameAccountCreate,
    GameAccountListResponse,
    GameAccountResponse,
    GameAccountUpdate,
)
from app.services.game_account_service import GameAccountService

router = APIRouter(prefix="/game-accounts", tags=["game-accounts"])


@router.post(
    "",
    response_model=GameAccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增遊戲帳號",
    description="新增一個 Travian 遊戲帳號",
)
def create_game_account(
    data: GameAccountCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> GameAccountResponse:
    """新增遊戲帳號."""
    service = GameAccountService(db)
    account = service.create_account(current_user.user_id, data)
    return GameAccountResponse.model_validate(account)


@router.get(
    "",
    response_model=GameAccountListResponse,
    summary="取得遊戲帳號列表",
    description="取得當前用戶的所有遊戲帳號",
)
def get_game_accounts(
    db: DBSession,
    current_user: CurrentUser,
    include_inactive: bool = False,
) -> GameAccountListResponse:
    """取得用戶的遊戲帳號列表."""
    service = GameAccountService(db)
    accounts = service.get_accounts_by_user(current_user.user_id, include_inactive)
    return GameAccountListResponse(
        accounts=[GameAccountResponse.model_validate(a) for a in accounts],
        total=len(accounts),
    )


@router.get(
    "/{account_id}",
    response_model=GameAccountResponse,
    summary="取得遊戲帳號詳情",
    description="取得指定遊戲帳號的詳細資訊",
)
def get_game_account(
    account_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> GameAccountResponse:
    """取得指定遊戲帳號."""
    service = GameAccountService(db)
    account = service.get_account_by_id(account_id, current_user.user_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="遊戲帳號不存在",
        )
    return GameAccountResponse.model_validate(account)


@router.put(
    "/{account_id}",
    response_model=GameAccountResponse,
    summary="更新遊戲帳號",
    description="更新指定遊戲帳號的資訊",
)
def update_game_account(
    account_id: str,
    data: GameAccountUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> GameAccountResponse:
    """更新遊戲帳號."""
    service = GameAccountService(db)
    account = service.update_account(account_id, current_user.user_id, data)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="遊戲帳號不存在",
        )
    return GameAccountResponse.model_validate(account)


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除遊戲帳號",
    description="刪除指定遊戲帳號",
)
def delete_game_account(
    account_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """刪除遊戲帳號."""
    service = GameAccountService(db)
    if not service.delete_account(account_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="遊戲帳號不存在",
        )
