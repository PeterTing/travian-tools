"""API v1 module."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    buildings,
    calculator,
    game_accounts,
    map_sql,
    resources,
    sync,
    tribes,
    troops,
    villages,
)

router = APIRouter()

router.include_router(auth.router)
router.include_router(game_accounts.router)
router.include_router(villages.router)
router.include_router(sync.router)
router.include_router(tribes.router, prefix="/tribes", tags=["tribes"])
router.include_router(calculator.router, prefix="/calculator", tags=["calculator"])
router.include_router(buildings.router, prefix="/buildings", tags=["buildings"])
router.include_router(troops.router, prefix="/troops", tags=["troops"])
router.include_router(resources.router, prefix="/resources", tags=["resources"])
router.include_router(map_sql.router)
