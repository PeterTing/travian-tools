"""API v1 module."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    advanced_calculator,
    auth,
    buildings,
    calculator,
    game_accounts,
    game_worlds,
    map_sql,
    ocr,
    opening_checklist,
    parse,
    paste,
    reminders,
    resources,
    statistics,
    strategy,
    sync,
    sync_logs,
    tribes,
    troops,
    villages,
)

router = APIRouter()

router.include_router(auth.router)
router.include_router(game_accounts.router)
router.include_router(game_worlds.router)
router.include_router(villages.router)
router.include_router(sync.router)
router.include_router(parse.router)
router.include_router(paste.router)
router.include_router(ocr.router)
router.include_router(tribes.router, prefix="/tribes", tags=["tribes"])
router.include_router(calculator.router, prefix="/calculator", tags=["calculator"])
router.include_router(buildings.router, prefix="/buildings", tags=["buildings"])
router.include_router(troops.router, prefix="/troops", tags=["troops"])
router.include_router(resources.router, prefix="/resources", tags=["resources"])
router.include_router(map_sql.router)
router.include_router(sync_logs.router)
router.include_router(strategy.router)
router.include_router(opening_checklist.router)
router.include_router(reminders.router)
router.include_router(statistics.router)
router.include_router(
    advanced_calculator.router,
    prefix="/advanced-calculator",
    tags=["advanced-calculator"],
)
