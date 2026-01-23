"""API v1 module."""

from fastapi import APIRouter

from app.api.v1.endpoints import calculator, tribes

router = APIRouter()

router.include_router(tribes.router, prefix="/tribes", tags=["tribes"])
router.include_router(calculator.router, prefix="/calculator", tags=["calculator"])
