"""API v1 module."""

import logging

from fastapi import APIRouter

from app.api.v1.endpoints import (
    advanced_calculator,
    auth,
    automation,
    buildings,
    calculator,
    conversations,
    execution,
    game_accounts,
    map_sql,
    reminders,
    resources,
    scheduler,
    statistics,
    strategy,
    sync,
    sync_logs,
    transport,
    tribes,
    troops,
    villages,
)

logger = logging.getLogger(__name__)

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
router.include_router(sync_logs.router)
router.include_router(scheduler.router)
router.include_router(strategy.router)
router.include_router(conversations.router)
router.include_router(execution.router)
router.include_router(reminders.router)
router.include_router(transport.router)
router.include_router(automation.router)
router.include_router(statistics.router)
router.include_router(
    advanced_calculator.router,
    prefix="/advanced-calculator",
    tags=["advanced-calculator"],
)

# Scraper router requires nodriver (Chrome automation) which is not available in Docker
# Only load it when nodriver is installed (local development)
try:
    from app.api.v1.endpoints import scraper

    router.include_router(scraper.router)
    logger.info("Scraper router loaded successfully (nodriver available)")
except ImportError:
    logger.warning(
        "Scraper router not loaded: nodriver not installed. "
        "This is expected in Docker environment."
    )
