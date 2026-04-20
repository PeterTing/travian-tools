#!/usr/bin/env python3
"""Local scraper server.

This server runs locally (not in Docker) to provide scraper functionality.
It uses nodriver to automate Chrome and scrape Travian game data.

Usage:
    python scripts/run_scraper_server.py

The server runs on port 8001 by default.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.services.village_scraper_service import VillageScraperService

app = FastAPI(
    title="Travian Scraper API",
    description="Local scraper service for Travian game data",
    version="1.0.0",
)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/scraper/villages")
async def scrape_village_list(
    server_url: str = Query(..., description="Travian server URL"),
):
    """Get village list from Travian."""
    service = VillageScraperService()
    try:
        await service._start_browser()

        villages = await service.get_village_list(server_url)
        attacked_count = sum(1 for v in villages if v.has_attack)

        return {
            "success": True,
            "total": len(villages),
            "attacked_count": attacked_count,
            "villages": [
                {
                    "village_id": v.village_id,
                    "name": v.name,
                    "coordinates": {"x": v.coordinates[0], "y": v.coordinates[1]},
                    "is_capital": v.is_capital,
                    "has_attack": v.has_attack,
                }
                for v in villages
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        await service._stop_browser()


@app.get("/api/v1/scraper/villages/{village_id}")
async def scrape_village_detail(
    village_id: str,
    server_url: str = Query(..., description="Travian server URL"),
):
    """Get village detail from Travian."""
    service = VillageScraperService()
    try:
        await service._start_browser()

        detail = await service.get_village_detail(server_url, village_id)

        if not detail:
            raise HTTPException(status_code=404, detail="Village not found")

        return {
            "success": True,
            "village": {
                "village_id": detail.village_id,
                "name": detail.name,
                "coordinates": {
                    "x": detail.coordinates[0],
                    "y": detail.coordinates[1],
                },
                "is_capital": detail.is_capital,
                "has_incoming_attack": detail.has_incoming_attack,
                "attack_count": detail.attack_count,
                "resources": {
                    "wood": detail.resources.wood,
                    "clay": detail.resources.clay,
                    "iron": detail.resources.iron,
                    "crop": detail.resources.crop,
                    "free_crop": detail.resources.free_crop,
                    "warehouse_capacity": detail.resources.warehouse_capacity,
                    "granary_capacity": detail.resources.granary_capacity,
                    "production": {
                        "wood": detail.resources.wood_production,
                        "clay": detail.resources.clay_production,
                        "iron": detail.resources.iron_production,
                        "crop": detail.resources.crop_production,
                    },
                },
                "building_queue": [
                    {
                        "name": b.name,
                        "level": b.level,
                        "finish_time": b.finish_time,
                        "countdown_seconds": b.countdown_seconds,
                    }
                    for b in detail.building_queue
                ],
                "troops_home": [
                    {
                        "unit_id": t.unit_id,
                        "name": t.name,
                        "count": t.count,
                    }
                    for t in detail.troops_home
                ],
                "troop_movements": [
                    {
                        "type": m.movement_type,
                        "description": m.description,
                        "arrival_time": m.arrival_time,
                        "countdown_seconds": m.countdown_seconds,
                        "troops": [
                            {"unit_id": t.unit_id, "name": t.name, "count": t.count}
                            for t in m.troops
                        ],
                    }
                    for m in detail.troop_movements
                ],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        await service._stop_browser()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "travian-scraper"}


if __name__ == "__main__":
    print("Starting Travian Scraper Server on http://localhost:8001")
    print("This server uses nodriver (undetected Chrome) to scrape Travian data.")
    print("Make sure you have logged into Travian in the Chrome profile first.")
    uvicorn.run(app, host="0.0.0.0", port=8001)
