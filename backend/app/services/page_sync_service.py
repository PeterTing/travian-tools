"""把共用解析器結果寫入既有 SyncService."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.domain.schemas.sync import (
    BuildingData,
    ProductionData,
    ReportData,
    ReportsSync,
    ResourceData,
    ResourceFieldData,
    TroopData,
    TroopStatisticsSync,
    VillageCenterSync,
    VillageOverviewSync,
    VillageTroopsData,
)
from app.parsers import PageInput, parse_page
from app.parsers.types import PageType
from app.services.sync_service import SyncService


def _resources(data: dict) -> ResourceData:
    r = data.get("resources") or {}
    return ResourceData(
        wood=int(r.get("wood") or 0),
        clay=int(r.get("clay") or 0),
        iron=int(r.get("iron") or 0),
        crop=int(r.get("crop") or 0),
    )


def _production(data: dict) -> ProductionData:
    p = data.get("production") or {}
    return ProductionData(
        wood=int(p.get("wood") or 0),
        clay=int(p.get("clay") or 0),
        iron=int(p.get("iron") or 0),
        crop=int(p.get("crop") or 0),
    )


def _troops(items: list[dict] | None) -> list[TroopData]:
    result: list[TroopData] = []
    for t in items or []:
        result.append(
            TroopData(
                troop_id=str(t.get("troop_id") or "troop_0"),
                count=int(t.get("count") or 0),
                location=str(t.get("location") or "home"),
                is_training=bool(t.get("is_training") or False),
            )
        )
    return result


class PageSyncService:
    """解析 HTML 後呼叫既有 sync 方法；不存原始 HTML."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.sync = SyncService(db)

    def sync_page(
        self,
        user_id: str,
        *,
        account_id: str,
        html: str,
        url: str | None = None,
        page_type: str | None = None,
        server_time: str | None = None,
    ) -> dict[str, Any]:
        hint: PageType | None = None
        if page_type in (
            "village_overview",
            "village_center",
            "reports",
            "troop_statistics",
            "rally_point",
            "statistics_overview",
            "statistics_resources",
            "statistics_culturepoints",
            "statistics_troops",
        ):
            hint = page_type  # type: ignore[assignment]

        parsed = parse_page(
            PageInput(
                kind="html",
                html=html,
                url=url,
                page_type_hint=hint,
            )
        )
        if not parsed.ok:
            msg = parsed.warnings[0].message if parsed.warnings else "解析失敗"
            return {
                "success": False,
                "message": msg,
                "page_type": parsed.page_type,
            }

        pt = parsed.page_type
        data = parsed.data

        if pt == "village_overview":
            overview_body = VillageOverviewSync(
                account_id=account_id,
                village_id=data.get("village_id"),
                village_name=data.get("village_name"),
                coordinate_x=data.get("coordinate_x"),
                coordinate_y=data.get("coordinate_y"),
                population=int(data.get("population") or 0),
                is_capital=bool(data.get("is_capital") or False),
                village_type=data.get("village_type"),
                capital_village_id=data.get("capital_village_id"),
                resources=_resources(data),
                production=_production(data),
                resource_fields=[
                    ResourceFieldData(**f) for f in (data.get("resource_fields") or [])
                ],
                troops=_troops(data.get("troops")),
            )
            ok, message, village_id = self.sync.sync_village_overview(
                user_id, overview_body
            )
            return {
                "success": ok,
                "message": message,
                "page_type": pt,
                "village_id": village_id,
            }

        if pt == "village_center":
            center_body = VillageCenterSync(
                account_id=account_id,
                village_id=data.get("village_id"),
                village_name=data.get("village_name"),
                coordinate_x=data.get("coordinate_x"),
                coordinate_y=data.get("coordinate_y"),
                population=int(data.get("population") or 0),
                is_capital=bool(data.get("is_capital") or False),
                capital_village_id=data.get("capital_village_id"),
                buildings=[BuildingData(**b) for b in (data.get("buildings") or [])],
                troops=_troops(data.get("troops")),
            )
            ok, message, village_id = self.sync.sync_village_center(
                user_id, center_body
            )
            return {
                "success": ok,
                "message": message,
                "page_type": pt,
                "village_id": village_id,
            }

        if pt == "reports":
            reports_body = ReportsSync(
                account_id=account_id,
                reports=[ReportData(**r) for r in (data.get("reports") or [])],
            )
            ok, message, count, new_count, updated_count = self.sync.sync_reports(
                user_id, reports_body
            )
            return {
                "success": ok,
                "message": message,
                "page_type": pt,
                "count": count,
                "new_count": new_count,
                "updated_count": updated_count,
            }

        if pt == "troop_statistics":
            villages = []
            for v in data.get("villages_troops") or []:
                villages.append(
                    VillageTroopsData(
                        village_id=str(v["village_id"]),
                        village_name=v.get("village_name"),
                        troops=_troops(v.get("troops")),
                    )
                )
            troop_body = TroopStatisticsSync(
                account_id=account_id, villages_troops=villages
            )
            ok, message, villages_synced, troops_synced = (
                self.sync.sync_troop_statistics(user_id, troop_body)
            )
            return {
                "success": ok,
                "message": message,
                "page_type": pt,
                "villages_synced": villages_synced,
                "troops_synced": troops_synced,
            }

        if pt == "rally_point":
            # P0-05／P0-06 才會把來襲寫入 DB；這裡只回解析成功，不存檔。
            return {
                "success": False,
                "message": "集結點的上傳還在做，目前請到村莊總覽再按",
                "page_type": pt,
            }

        return {
            "success": False,
            "message": f"這一頁類型還不能上傳：{pt}",
            "page_type": pt,
        }
