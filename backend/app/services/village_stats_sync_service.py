"""Village sync via Statistics pages.

4 page loads = all village data. Replaces per-village scraping.
"""

import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.infrastructure.database.models.troop_instance import TroopInstance
from app.infrastructure.database.models.village import Village
from app.services.statistics_page_parser import StatisticsPageParser
from app.services.village_scraper_service import VillageScraperService

logger = logging.getLogger(__name__)


class VillageStatsSyncService:
    """Sync all villages via 4 Travian Statistics pages."""

    STATS_PAGES = [
        ("overview", "/village/statistics/overview"),
        ("resources", "/village/statistics/resources"),
        ("culturepoints", "/village/statistics/culturepoints"),
        ("troops", "/village/statistics/troops"),
    ]

    def __init__(self, db: Session):
        self.db = db

    async def sync_all(
        self,
        server_url: str,
        account_id: str,
        login_email: str,
        login_password: str,
    ) -> dict:
        """Sync all villages from 4 Statistics pages.

        Returns dict with: success, total_villages, message
        """
        server_url = server_url.rstrip("/")
        scraper = VillageScraperService(
            login_email=login_email,
            login_password=login_password,
        )

        try:
            await scraper._start_browser()

            # Ensure login first: navigate to main page to trigger login
            logger.info("[STATS_SYNC] Ensuring login...")
            await scraper._navigate(f"{server_url}/dorf1.php")

            # Fetch 4 pages (now guaranteed to be logged in)
            html_pages: dict[str, str] = {}
            for name, path in self.STATS_PAGES:
                url = f"{server_url}{path}"
                logger.info("[STATS_SYNC] Fetching %s: %s", name, url)
                await scraper._navigate(url)
                html_pages[name] = await scraper._page.content()

            # Parse coordinates from sidebar (present on any page)
            coordinates = StatisticsPageParser.parse_sidebar_coordinates(
                html_pages["overview"]
            )
            logger.info("[STATS_SYNC] Parsed %d village coordinates from sidebar", len(coordinates))

            # Parse all pages
            overview = StatisticsPageParser.parse_overview(html_pages["overview"])
            resources = StatisticsPageParser.parse_resources(html_pages["resources"])
            culture_points = StatisticsPageParser.parse_culture_points(
                html_pages["culturepoints"]
            )
            troops = StatisticsPageParser.parse_troops(html_pages["troops"])

            # Merge data (including coordinates)
            merged = StatisticsPageParser.merge_all(
                overview, resources, culture_points, troops, coordinates
            )

            # Fetch per-village production/capacity from dorf1
            from app.services.travian_parser import TravianParser
            for village_data in merged:
                vid = village_data.get("travian_village_id")
                if not vid:
                    continue
                try:
                    dorf1_url = f"{server_url}/dorf1.php?newdid={vid}"
                    logger.info("[STATS_SYNC] Fetching dorf1 for village %s", vid)
                    html = await scraper._navigate_fast(dorf1_url, wait_for_element="#l1")
                    parsed = TravianParser.parse_resources(html)
                    if parsed:
                        village_data["wood_production"] = parsed.wood_production
                        village_data["clay_production"] = parsed.clay_production
                        village_data["iron_production"] = parsed.iron_production
                        village_data["crop_production"] = parsed.crop_production
                        village_data["warehouse_capacity"] = parsed.warehouse_capacity or 800
                        village_data["granary_capacity"] = parsed.granary_capacity or 800
                        # Update current resources from dorf1 (more recent)
                        if parsed.wood:
                            village_data["wood"] = parsed.wood
                        if parsed.clay:
                            village_data["clay"] = parsed.clay
                        if parsed.iron:
                            village_data["iron"] = parsed.iron
                        if parsed.crop:
                            village_data["crop"] = parsed.crop
                except Exception as e:
                    logger.warning("[STATS_SYNC] Failed to fetch dorf1 for village %s: %s", vid, e)

            # Save to database
            now = datetime.now(UTC)
            saved_count = 0

            for village_data in merged:
                village = self._upsert_village(account_id, village_data, now)
                if village:
                    self._upsert_troops(
                        village.village_id, village_data.get("troops", {})
                    )
                    saved_count += 1

            self.db.commit()

            return {
                "success": True,
                "total_villages": saved_count,
                "message": f"Synced {saved_count} villages via Statistics pages",
            }
        except Exception as e:
            logger.exception("[STATS_SYNC] Sync failed")
            self.db.rollback()
            return {
                "success": False,
                "total_villages": 0,
                "message": str(e),
            }
        finally:
            await scraper._stop_browser()

    def _upsert_village(
        self, account_id: str, data: dict, now: datetime
    ) -> Village | None:
        """Insert or update village in database."""
        travian_id = str(data.get("travian_village_id", ""))
        if not travian_id:
            return None

        village = (
            self.db.query(Village)
            .filter(
                Village.account_id == account_id,
                Village.travian_village_id == travian_id,
            )
            .first()
        )

        if not village:
            village = Village(
                account_id=account_id,
                travian_village_id=travian_id,
            )
            self.db.add(village)

        # Update all fields from statistics data
        village.name = data.get("name", village.name)
        village.wood = data.get("wood", 0)
        village.clay = data.get("clay", 0)
        village.iron = data.get("iron", 0)
        village.crop = data.get("crop", 0)
        village.has_incoming_attack = data.get("has_attack", False)
        village.attack_count = 1 if data.get("has_attack", False) else 0
        village.cp_per_day = data.get("cp_per_day", 0)
        village.merchants_used = data.get("merchants_used", 0)
        village.merchants_total = data.get("merchants_total", 0)
        village.total_troops = data.get("total_troops", 0)

        # Production rates (from dorf1)
        if data.get("wood_production"):
            village.wood_production = data["wood_production"]
        if data.get("clay_production"):
            village.clay_production = data["clay_production"]
        if data.get("iron_production"):
            village.iron_production = data["iron_production"]
        if data.get("crop_production"):
            village.crop_production = data["crop_production"]

        # Warehouse/granary capacity (from dorf1)
        if data.get("warehouse_capacity") and data["warehouse_capacity"] != 800:
            village.warehouse_capacity = data["warehouse_capacity"]
        if data.get("granary_capacity") and data["granary_capacity"] != 800:
            village.granary_capacity = data["granary_capacity"]

        village.last_updated = now

        # Coordinates from sidebar
        if data.get("coordinate_x") is not None:
            village.coordinate_x = data["coordinate_x"]
        if data.get("coordinate_y") is not None:
            village.coordinate_y = data["coordinate_y"]

        self.db.flush()
        return village

    def _upsert_troops(self, village_id: str, troops: dict) -> None:
        """Update troop instances for a village.

        Replaces all existing troop records for the village with fresh data
        from the Statistics troops page.
        """
        if not troops:
            return

        # Delete existing troop instances for this village
        self.db.query(TroopInstance).filter(
            TroopInstance.village_id == village_id,
        ).delete()

        # Insert new ones
        for troop_name, count in troops.items():
            if count > 0:
                self.db.add(
                    TroopInstance(
                        village_id=village_id,
                        troop_id=troop_name,
                        count=count,
                        location="total",
                    )
                )
