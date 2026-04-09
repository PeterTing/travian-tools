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

            # Fetch 4 pages
            html_pages: dict[str, str] = {}
            for name, path in self.STATS_PAGES:
                url = f"{server_url}{path}"
                logger.info("[STATS_SYNC] Fetching %s: %s", name, url)
                await scraper._navigate(url)
                html_pages[name] = await scraper._page.content()

            # Parse all pages
            overview = StatisticsPageParser.parse_overview(html_pages["overview"])
            resources = StatisticsPageParser.parse_resources(html_pages["resources"])
            culture_points = StatisticsPageParser.parse_culture_points(
                html_pages["culturepoints"]
            )
            troops = StatisticsPageParser.parse_troops(html_pages["troops"])

            # Merge data
            merged = StatisticsPageParser.merge_all(
                overview, resources, culture_points, troops
            )

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

        # Update fields from statistics data
        village.name = data.get("name", village.name)
        village.wood = data.get("wood", 0)
        village.clay = data.get("clay", 0)
        village.iron = data.get("iron", 0)
        village.crop = data.get("crop", 0)
        village.has_incoming_attack = data.get("has_attack", False)
        village.last_updated = now

        # cp_per_day is not on the Village model yet; skip for now.
        # population is available on the model but not returned by the parser.

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
