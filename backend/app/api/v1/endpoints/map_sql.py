"""Map.sql 解析 API 端點."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
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
from app.services.map_sql_fetcher import MapSqlFetchError, decode_map_sql
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
    建立一個快照，包含所有村莊、玩家和聯盟數據。
    """
    service = MapSqlService(db)
    return service.save_to_database(
        user_id=current_user.user_id,
        account_id=request.account_id,
        sql_content=request.sql_content,
    )


@router.post("/upload", response_model=MapSaveResponse)
async def upload_map_sql(
    account_id: str = Form(..., description="遊戲帳號 ID"),
    file: UploadFile = File(..., description="map.sql 或 map.sql.gz"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MapSaveResponse:
    """手動上傳 map.sql（純文字或 gzip）並儲存為帳號快照."""
    try:
        sql_content = decode_map_sql(await file.read())
    except MapSqlFetchError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    service = MapSqlService(db)
    return service.save_to_database(
        user_id=current_user.user_id,
        account_id=account_id,
        sql_content=sql_content,
    )
