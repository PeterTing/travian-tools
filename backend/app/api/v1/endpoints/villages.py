"""村莊 API 端點."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.village import (
    BuildingInstanceCreate,
    BuildingInstanceResponse,
    BuildingInstanceUpdate,
    TroopInstanceCreate,
    TroopInstanceResponse,
    TroopInstanceUpdate,
    VillageCreate,
    VillageDetailResponse,
    VillageListResponse,
    VillageResponse,
    VillageUpdate,
)
from app.services.village_service import VillageService

router = APIRouter(prefix="/villages", tags=["villages"])


# ============ 村莊 CRUD ============


@router.post(
    "",
    response_model=VillageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增村莊",
    description="新增一個村莊到指定的遊戲帳號",
)
def create_village(
    data: VillageCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> VillageResponse:
    """新增村莊."""
    service = VillageService(db)
    village = service.create_village(current_user.user_id, data)
    if not village:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="無權存取此遊戲帳號",
        )
    return VillageResponse.model_validate(village)


@router.get(
    "",
    response_model=VillageListResponse,
    summary="取得村莊列表",
    description="取得當前用戶的所有村莊",
)
def get_villages(
    db: DBSession,
    current_user: CurrentUser,
    account_id: str | None = Query(None, description="篩選特定遊戲帳號的村莊"),
) -> VillageListResponse:
    """取得用戶的村莊列表."""
    service = VillageService(db)

    if account_id:
        villages = service.get_villages_by_account(account_id, current_user.user_id)
    else:
        villages = service.get_all_villages_by_user(current_user.user_id)

    return VillageListResponse(
        villages=[VillageResponse.model_validate(v) for v in villages],
        total=len(villages),
    )


@router.get(
    "/{village_id}",
    response_model=VillageDetailResponse,
    summary="取得村莊詳情",
    description="取得指定村莊的詳細資訊，包含建築和部隊",
)
def get_village(
    village_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> VillageDetailResponse:
    """取得指定村莊的詳情."""
    service = VillageService(db)
    village = service.get_village_by_id(
        village_id, current_user.user_id, include_details=True
    )
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="村莊不存在",
        )

    return VillageDetailResponse(
        village_id=village.village_id,
        account_id=village.account_id,
        name=village.name,
        coordinate_x=village.coordinate_x,
        coordinate_y=village.coordinate_y,
        population=village.population,
        village_type=village.village_type,
        is_capital=village.is_capital,
        role=village.role,
        last_updated=village.last_updated,
        created_at=village.created_at,
        buildings=[
            BuildingInstanceResponse.model_validate(b)
            for b in village.building_instances
        ],
        troops=[
            TroopInstanceResponse.model_validate(t) for t in village.troop_instances
        ],
    )


@router.put(
    "/{village_id}",
    response_model=VillageResponse,
    summary="更新村莊",
    description="更新指定村莊的資訊",
)
def update_village(
    village_id: str,
    data: VillageUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> VillageResponse:
    """更新村莊."""
    service = VillageService(db)
    village = service.update_village(village_id, current_user.user_id, data)
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="村莊不存在",
        )
    return VillageResponse.model_validate(village)


@router.delete(
    "/{village_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除村莊",
    description="刪除指定村莊",
)
def delete_village(
    village_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """刪除村莊."""
    service = VillageService(db)
    if not service.delete_village(village_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="村莊不存在",
        )


# ============ 建築實例 CRUD ============


@router.post(
    "/{village_id}/buildings",
    response_model=BuildingInstanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增建築",
    description="新增建築到村莊",
)
def add_building(
    village_id: str,
    data: BuildingInstanceCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> BuildingInstanceResponse:
    """新增建築."""
    service = VillageService(db)
    building = service.add_building(village_id, current_user.user_id, data)
    if not building:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="村莊不存在",
        )
    return BuildingInstanceResponse.model_validate(building)


@router.put(
    "/{village_id}/buildings/{instance_id}",
    response_model=BuildingInstanceResponse,
    summary="更新建築",
    description="更新建築等級和狀態",
)
def update_building(
    village_id: str,
    instance_id: str,
    data: BuildingInstanceUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> BuildingInstanceResponse:
    """更新建築."""
    service = VillageService(db)
    building = service.update_building(
        village_id, instance_id, current_user.user_id, data
    )
    if not building:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="建築不存在",
        )
    return BuildingInstanceResponse.model_validate(building)


@router.delete(
    "/{village_id}/buildings/{instance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除建築",
    description="刪除村莊中的建築",
)
def delete_building(
    village_id: str,
    instance_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """刪除建築."""
    service = VillageService(db)
    if not service.delete_building(village_id, instance_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="建築不存在",
        )


# ============ 部隊實例 CRUD ============


@router.post(
    "/{village_id}/troops",
    response_model=TroopInstanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增部隊",
    description="新增部隊到村莊",
)
def add_troop(
    village_id: str,
    data: TroopInstanceCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> TroopInstanceResponse:
    """新增部隊."""
    service = VillageService(db)
    troop = service.add_troop(village_id, current_user.user_id, data)
    if not troop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="村莊不存在",
        )
    return TroopInstanceResponse.model_validate(troop)


@router.put(
    "/{village_id}/troops/{instance_id}",
    response_model=TroopInstanceResponse,
    summary="更新部隊",
    description="更新部隊數量和狀態",
)
def update_troop(
    village_id: str,
    instance_id: str,
    data: TroopInstanceUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> TroopInstanceResponse:
    """更新部隊."""
    service = VillageService(db)
    troop = service.update_troop(village_id, instance_id, current_user.user_id, data)
    if not troop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="部隊不存在",
        )
    return TroopInstanceResponse.model_validate(troop)


@router.delete(
    "/{village_id}/troops/{instance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除部隊",
    description="刪除村莊中的部隊",
)
def delete_troop(
    village_id: str,
    instance_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """刪除部隊."""
    service = VillageService(db)
    if not service.delete_troop(village_id, instance_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="部隊不存在",
        )
