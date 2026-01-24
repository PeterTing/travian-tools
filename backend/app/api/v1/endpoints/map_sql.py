"""Map.sql 解析 API 端點."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.domain.schemas.map_sql import (
    MapAlliance,
    MapParseRequest,
    MapParseResponse,
    MapPlayer,
    MapSaveRequest,
    MapSaveResponse,
    MapVillage,
)
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


@router.post("/save", response_model=MapSaveResponse)
async def save_map_sql(
    request: MapSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MapSaveResponse:
    """儲存 map.sql 解析結果.

    解析 map.sql 並將結果儲存到資料庫。
    目前此功能尚未完整實作，僅返回解析統計。
    """
    service = MapSqlService()
    parse_result = service.parse_sql(request.sql_content)

    # TODO: 實作資料庫儲存邏輯
    # 目前僅返回解析統計

    return MapSaveResponse(
        success=True,
        message="解析成功，但資料庫儲存功能尚未完整實作",
        villages_saved=0,
        players_found=parse_result.total_players,
        alliances_found=parse_result.total_alliances,
    )
