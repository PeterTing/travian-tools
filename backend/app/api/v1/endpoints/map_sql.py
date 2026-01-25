"""Map.sql 解析 API 端點."""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.domain.schemas.map_sql import (
    MapAlliance,
    MapDownloadAndSaveRequest,
    MapDownloadRequest,
    MapParseRequest,
    MapParseResponse,
    MapPlayer,
    MapSaveRequest,
    MapSaveResponse,
    MapVillage,
)
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.user import User
from app.services.map_sql_service import MapSqlService

router = APIRouter(prefix="/map-sql", tags=["Map SQL"])


@router.post("/parse", response_model=MapParseResponse)
async def parse_map_sql(
    request: MapParseRequest,
    current_user: User = Depends(get_current_user),
) -> MapParseResponse:
    """解析 map.sql 檔案內容.

    解析 map.sql 格式的數據，返回村莊、玩家和聯盟資訊。
    此端點僅進行解析，不會儲存數據。
    """
    service = MapSqlService()
    result = service.parse_sql(request.sql_content)
    return result


@router.post("/search/player", response_model=list[MapPlayer])
async def search_player(
    request: MapParseRequest,
    player_name: str,
    current_user: User = Depends(get_current_user),
) -> list[MapPlayer]:
    """在 map.sql 中搜尋玩家.

    搜尋名稱包含指定字串的玩家。
    """
    service = MapSqlService()
    parse_result = service.parse_sql(request.sql_content)
    players = service.search_player(parse_result, player_name)
    return players


@router.post("/search/alliance", response_model=list[MapAlliance])
async def search_alliance(
    request: MapParseRequest,
    alliance_name: str,
    current_user: User = Depends(get_current_user),
) -> list[MapAlliance]:
    """在 map.sql 中搜尋聯盟.

    搜尋名稱包含指定字串的聯盟。
    """
    service = MapSqlService()
    parse_result = service.parse_sql(request.sql_content)
    alliances = service.search_alliance(parse_result, alliance_name)
    return alliances


@router.post("/search/villages-in-range", response_model=list[MapVillage])
async def search_villages_in_range(
    request: MapParseRequest,
    center_x: int,
    center_y: int,
    radius: int,
    current_user: User = Depends(get_current_user),
) -> list[MapVillage]:
    """搜尋指定範圍內的村莊.

    以指定座標為中心，搜尋指定半徑範圍內的村莊。
    """
    if radius < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="半徑不能為負數",
        )
    if radius > 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="半徑不能超過 400",
        )

    service = MapSqlService()
    parse_result = service.parse_sql(request.sql_content)
    villages = service.get_villages_in_range(parse_result, center_x, center_y, radius)
    return villages


@router.post("/download", response_model=MapParseResponse)
async def download_and_parse_map_sql(
    request: MapDownloadRequest,
    current_user: User = Depends(get_current_user),
) -> MapParseResponse:
    """從伺服器下載並解析 map.sql.

    根據提供的伺服器網址下載 map.sql 檔案並解析。
    此端點僅進行下載和解析，不會儲存數據。
    """
    try:
        sql_content = MapSqlService.download_map_sql(request.server_url)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"無法從伺服器下載 map.sql: {e!s}",
        ) from e

    service = MapSqlService()
    return service.parse_sql(sql_content)


@router.post("/download-and-save", response_model=MapSaveResponse)
async def download_and_save_map_sql(
    request: MapDownloadAndSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MapSaveResponse:
    """從遊戲帳號的伺服器下載 map.sql 並儲存.

    根據遊戲帳號設定的伺服器網址自動下載 map.sql，
    解析並儲存到資料庫。
    """
    # 取得遊戲帳號
    account = (
        db.query(GameAccount)
        .filter(
            GameAccount.account_id == request.account_id,
            GameAccount.user_id == current_user.user_id,
        )
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到此遊戲帳號",
        )

    if not account.server_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="此遊戲帳號未設定伺服器網址",
        )

    # 下載 map.sql
    try:
        sql_content = MapSqlService.download_map_sql(account.server_url)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"無法從伺服器下載 map.sql: {e!s}",
        ) from e

    # 儲存到資料庫
    service = MapSqlService(db)
    return service.save_to_database(
        user_id=current_user.user_id,
        account_id=request.account_id,
        sql_content=sql_content,
    )


@router.post("/save", response_model=MapSaveResponse)
async def save_map_sql(
    request: MapSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MapSaveResponse:
    """儲存 map.sql 解析結果.

    解析 map.sql 並將結果儲存到資料庫。
    建立一個快照，包含所有村莊、玩家和聯盟數據。
    """
    service = MapSqlService(db)
    return service.save_to_database(
        user_id=current_user.user_id,
        account_id=request.account_id,
        sql_content=request.sql_content,
    )
