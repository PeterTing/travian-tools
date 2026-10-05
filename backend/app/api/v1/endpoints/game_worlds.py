"""遊戲世界 API 端點（P0-02）.

世界在新增遊戲帳號時自動建立（同一個使用者、同一個伺服器網址共用一筆）。
這裡只能看和手動改世界設定；UTC 時差從貼上的頁面自動算是 P0-05 的事。
"""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.game_world import (
    GameWorldListResponse,
    GameWorldResponse,
    GameWorldUpdate,
)
from app.infrastructure.database.models.game_world import GameWorld
from app.services.game_world_service import GameWorldService

router = APIRouter(prefix="/game-worlds", tags=["game-worlds"])


def _to_response(world: GameWorld) -> GameWorldResponse:
    accounts = world.accounts if isinstance(world.accounts, list) else []
    return GameWorldResponse(
        world_id=world.world_id,
        server_url=world.server_url,
        utc_offset=world.utc_offset,
        account_count=len(accounts),
    )


@router.get(
    "",
    response_model=GameWorldListResponse,
    summary="取得世界列表",
    description="目前使用者的遊戲世界（新增遊戲帳號時自動建立）",
)
def list_game_worlds(db: DBSession, current_user: CurrentUser) -> GameWorldListResponse:
    """列出世界."""
    worlds = GameWorldService(db).list_worlds(current_user.user_id)
    return GameWorldListResponse(
        worlds=[_to_response(w) for w in worlds], total=len(worlds)
    )


@router.patch(
    "/{world_id}",
    response_model=GameWorldResponse,
    summary="修改世界設定",
    description="手動修改伺服器的 UTC 時差（分鐘）；null = 不換算",
)
def update_game_world(
    world_id: str,
    data: GameWorldUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> GameWorldResponse:
    """修改世界設定."""
    world = GameWorldService(db).update_world(world_id, current_user.user_id, data)
    if world is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="世界不存在")
    return _to_response(world)
