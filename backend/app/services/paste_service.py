"""P0-05：貼上／草稿確認後存入；集結點去重."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.parse_draft import ParseDraft
from app.infrastructure.database.models.troop_movement import TroopMovement
from app.infrastructure.database.models.village import Village
from app.parsers import PageInput, parse_page
from app.parsers.types import PageType
from app.services.sync_service import SyncService

# 貼上／草稿 HTML 上限（約 1.5 MB），避免拖垮 API
MAX_RAW_BYTES = 1_500_000
DRAFT_TTL = timedelta(hours=2)

# 來襲列表與存檔一致：攻擊／突襲／偵察（增援另算，P0 不進來襲列表）
INCOMING_KINDS = frozenset({"incoming_attack", "incoming_raid", "incoming_spy"})
ARRIVAL_MATCH_TOLERANCE_SECONDS = 2


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class PasteService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.sync = SyncService(db)

    def _get_account(self, user_id: str, account_id: str) -> GameAccount | None:
        account = self.db.get(GameAccount, account_id)
        if account is None or account.user_id != user_id:
            return None
        if not account.is_active:
            return None
        return account

    def parse_and_preview(
        self,
        *,
        kind: str,
        html: str | None,
        text: str | None,
        url: str | None,
        page_type_hint: str | None,
        server_time: str | None,
    ) -> dict[str, Any]:
        raw = html or text or ""
        if len(raw.encode("utf-8")) > MAX_RAW_BYTES:
            return {
                "ok": False,
                "page_type": "unknown",
                "data": {},
                "warnings": [
                    {"code": "PARSE_ERROR", "message": "內容太大，請少貼一點再試"}
                ],
                "server_time": None,
            }
        hint: PageType | None = None
        if page_type_hint in (
            "village_overview",
            "village_center",
            "rally_point",
            "reports",
            "troop_statistics",
            "statistics_overview",
            "statistics_resources",
            "statistics_culturepoints",
            "statistics_troops",
            "unknown",
        ):
            hint = page_type_hint  # type: ignore[assignment]
        result = parse_page(
            PageInput(
                kind=kind if kind in ("html", "text", "ocr") else "text",  # type: ignore[arg-type]
                html=html,
                text=text,
                url=url,
                page_type_hint=hint,
                captured_at=server_time,
            )
        )
        # Prefer explicit server_time from client when parser didn't find one
        server = result.server_time or server_time
        return {
            "ok": result.ok,
            "page_type": result.page_type,
            "data": result.data,
            "warnings": [
                {"code": w.code, "message": w.message} for w in result.warnings
            ],
            "server_time": server,
        }

    def create_draft(
        self,
        *,
        user_id: str,
        account_id: str,
        raw_kind: str,
        raw_content: str,
        url: str | None,
        page_type_hint: str | None,
        server_time: str | None,
        source: str = "paste",
    ) -> tuple[bool, str, ParseDraft | None]:
        account = self._get_account(user_id, account_id)
        if account is None:
            return False, "找不到遊戲帳號或無權限", None
        if len(raw_content.encode("utf-8")) > MAX_RAW_BYTES:
            return False, "內容太大，請少貼一點再試", None

        preview = self.parse_and_preview(
            kind=raw_kind,
            html=raw_content if raw_kind == "html" else None,
            text=raw_content if raw_kind != "html" else None,
            url=url,
            page_type_hint=page_type_hint,
            server_time=server_time,
        )
        if not preview["ok"] and preview["page_type"] == "unknown":
            # still store so confirm can ask user to pick type
            pass

        draft = ParseDraft(
            user_id=user_id,
            account_id=account_id,
            page_type=str(preview["page_type"]),
            source=source,
            url=url,
            server_time=preview.get("server_time") or server_time,
            raw_kind=raw_kind,
            raw_content=raw_content,
            parsed_json=preview.get("data") or {},
            warnings_json=preview.get("warnings") or [],
            expires_at=_utcnow() + DRAFT_TTL,
        )
        self.db.add(draft)
        self.db.commit()
        self.db.refresh(draft)
        return True, "ok", draft

    def get_draft(self, user_id: str, draft_id: str) -> ParseDraft | None:
        draft = self.db.get(ParseDraft, draft_id)
        if draft is None or draft.user_id != user_id:
            return None
        if draft.expires_at < _utcnow():
            self.db.delete(draft)
            self.db.commit()
            return None
        return draft

    def _arrival_datetime(
        self,
        *,
        capture_at: datetime,
        timer_seconds: int | None,
        arrival_time: str | None,
        server_time: str | None,
    ) -> tuple[datetime | None, str | None]:
        """回傳 (arrival_at, arrival_second_key)."""
        if timer_seconds is not None:
            arrival = capture_at + timedelta(seconds=int(timer_seconds))
            key = arrival.strftime("%Y-%m-%dT%H:%M:%S")
            return arrival, key
        if arrival_time and server_time:
            # same calendar day as capture, use arrival_time clock
            try:
                h, m, s = [int(x) for x in arrival_time.split(":")[:3]]
                arrival = capture_at.replace(
                    hour=h % 24, minute=m, second=s, microsecond=0
                )
                # if arrival clock is before server clock on paste day, assume next day
                sh, sm, ss = [int(x) for x in server_time.split(":")[:3]]
                server_today = capture_at.replace(
                    hour=sh % 24, minute=sm, second=ss, microsecond=0
                )
                if arrival < server_today:
                    arrival = arrival + timedelta(days=1)
                return arrival, arrival.strftime("%Y-%m-%dT%H:%M:%S")
            except (ValueError, TypeError):
                return None, None
        return None, None

    def confirm_rally(
        self,
        user_id: str,
        *,
        account_id: str,
        data: dict[str, Any],
        capture_at: datetime | None,
        source: str,
        server_time: str | None,
        village_id: str | None = None,
    ) -> dict[str, Any]:
        account = self._get_account(user_id, account_id)
        if account is None:
            return {
                "success": False,
                "message": "找不到遊戲帳號或無權限",
                "error_code": "forbidden",
            }

        resolved_village_id = village_id or data.get("village_id")
        if resolved_village_id:
            from app.infrastructure.database.models.village import Village

            village = (
                self.db.query(Village)
                .filter(
                    Village.village_id == resolved_village_id,
                    Village.account_id == account_id,
                )
                .first()
            )
            if village is None:
                # Parser/extension may pass Travian data-did
                village = (
                    self.db.query(Village)
                    .filter(
                        Village.travian_village_id == str(resolved_village_id),
                        Village.account_id == account_id,
                    )
                    .first()
                )
            if village is None:
                looks_uuid = (
                    len(str(resolved_village_id)) == 36
                    and str(resolved_village_id).count("-") == 4
                )
                # Explicit UI village UUID (or junk selection) must exist;
                # bare Travian numeric ids without a row are optional.
                if looks_uuid or not str(resolved_village_id).isdigit():
                    return {
                        "success": False,
                        "message": "找不到選定的村莊",
                        "error_code": "forbidden",
                    }
                resolved_village_id = None
            else:
                resolved_village_id = village.village_id
        else:
            resolved_village_id = None

        captured = capture_at or _utcnow()
        movements_in = list(data.get("movements") or [])
        # also include incoming list if movements empty
        if not movements_in:
            movements_in = list(data.get("incoming") or []) + list(
                data.get("incoming_reinforcements") or []
            )

        # Only persist 來襲 (attack/raid/spy); reinforcements are not listed in P0-06
        to_save = [m for m in movements_in if m.get("kind") in INCOMING_KINDS]
        if not to_save:
            return {
                "success": False,
                "message": "集結點沒有可存的來襲（攻擊／突襲／偵查）。"
                "駐軍不會當成來襲存入。",
                "created": 0,
                "updated": 0,
                "total": 0,
                "error_code": "empty_parse",
            }

        # Existing incoming for this account (never auto-delete)
        existing = (
            self.db.query(TroopMovement)
            .filter(
                TroopMovement.account_id == account_id,
                TroopMovement.kind.in_(list(INCOMING_KINDS)),
            )
            .order_by(
                TroopMovement.arrival_at.is_(None), TroopMovement.arrival_at.asc()
            )
            .all()
        )

        # Group by (role, headline-ish target, arrival_second_key)
        def group_key(m: dict[str, Any], arrival_key: str | None) -> tuple:
            return (
                (m.get("role") or "").strip(),
                (m.get("headline") or "").strip(),
                arrival_key or "",
            )

        # Build new items with arrival keys
        prepared: list[tuple[tuple, dict, datetime | None, str | None]] = []
        for m in to_save:
            arrival_at, arrival_key = self._arrival_datetime(
                capture_at=captured,
                timer_seconds=m.get("timer_seconds"),
                arrival_time=m.get("arrival_time"),
                server_time=server_time or data.get("server_time"),
            )
            prepared.append((group_key(m, arrival_key), m, arrival_at, arrival_key))

        # Dedup within paste by group: keep order
        # Match against existing: for each group, existing count M, new count N,
        # update min(N,M), insert N-M. Never delete.
        from collections import defaultdict

        new_by_group: dict[tuple, list] = defaultdict(list)
        for item in prepared:
            new_by_group[item[0]].append(item)

        existing_by_group: dict[tuple, list[TroopMovement]] = defaultdict(list)
        for row in existing:
            gk = (
                (row.role or "").strip(),
                (row.headline or "").strip(),
                row.arrival_second_key or "",
            )
            existing_by_group[gk].append(row)

        created = 0
        updated = 0
        saved_ids: list[str] = []

        def existing_for_group(gk: tuple) -> list[TroopMovement]:
            role, headline, arrival_key = gk
            exact = existing_by_group.get(gk, [])
            if exact or not arrival_key:
                return list(exact)
            # 允許抵達時間差 ±2 秒（重貼時 timer／時鐘可能差一秒）
            try:
                base = datetime.strptime(arrival_key, "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                return []
            found: list[TroopMovement] = []
            used: set[str] = set()
            for delta in range(
                -ARRIVAL_MATCH_TOLERANCE_SECONDS, ARRIVAL_MATCH_TOLERANCE_SECONDS + 1
            ):
                if delta == 0:
                    continue
                alt_key = (base + timedelta(seconds=delta)).strftime(
                    "%Y-%m-%dT%H:%M:%S"
                )
                for row in existing_by_group.get((role, headline, alt_key), []):
                    if row.movement_id not in used:
                        found.append(row)
                        used.add(row.movement_id)
            return found

        for gk, items in new_by_group.items():
            old_rows = existing_for_group(gk)
            m = len(old_rows)
            for i, (_key, movement, arrival_at, arrival_key) in enumerate(items):
                needs = (
                    movement.get("coordinate_x") is None
                    or movement.get("coordinate_y") is None
                )
                payload = {
                    "kind": movement.get("kind") or "incoming_attack",
                    "role": movement.get("role"),
                    "headline": movement.get("headline"),
                    "coordinate_x": movement.get("coordinate_x"),
                    "coordinate_y": movement.get("coordinate_y"),
                    "arrival_at": arrival_at,
                    "arrival_second_key": arrival_key,
                    "needs_coords": bool(needs),
                    "troops_json": {"troops": movement.get("troops") or []},
                    "source": source,
                    "raw_excerpt": movement.get("headline"),
                    "village_id": resolved_village_id,
                }
                if i < m:
                    row = old_rows[i]
                    for k, v in payload.items():
                        setattr(row, k, v)
                    updated += 1
                    saved_ids.append(row.movement_id)
                else:
                    row = TroopMovement(account_id=account_id, **payload)
                    self.db.add(row)
                    self.db.flush()
                    created += 1
                    saved_ids.append(row.movement_id)

        self.db.commit()
        return {
            "success": True,
            "message": f"已存入來襲：新增 {created}、更新 {updated}",
            "created": created,
            "updated": updated,
            "total": created + updated,
            "movement_ids": saved_ids,
            "village_id": resolved_village_id,
        }

    def confirm_from_draft(
        self,
        user_id: str,
        *,
        draft_id: str,
        capture_at: datetime | None = None,
        page_type_override: str | None = None,
        parsed_override: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        draft = self.get_draft(user_id, draft_id)
        if draft is None:
            return {"success": False, "message": "草稿不存在或已過期"}
        page_type = page_type_override or draft.page_type
        data = parsed_override or draft.parsed_json or {}
        result = self.confirm_parsed(
            user_id,
            account_id=draft.account_id,
            page_type=page_type,
            data=data,
            capture_at=capture_at,
            source=draft.source,
            server_time=draft.server_time,
        )
        if result.get("success"):
            self.db.delete(draft)
            self.db.commit()
        return result

    def confirm_parsed(
        self,
        user_id: str,
        *,
        account_id: str,
        page_type: str,
        data: dict[str, Any],
        capture_at: datetime | None,
        source: str,
        server_time: str | None,
    ) -> dict[str, Any]:
        if page_type == "rally_point":
            return self.confirm_rally(
                user_id,
                account_id=account_id,
                data=data,
                capture_at=capture_at,
                source=source,
                server_time=server_time,
                village_id=data.get("village_id") if isinstance(data, dict) else None,
            )

        # village_overview / village_center / reports / troop_statistics
        if page_type == "village_overview":
            from app.domain.schemas.sync import (
                ProductionData,
                ResourceData,
                ResourceFieldData,
                TroopData,
                VillageOverviewSync,
            )
            from app.parsers.dorf1_text import village_overview_is_meaningful

            if not village_overview_is_meaningful(data):
                return {
                    "success": False,
                    "message": "村莊總覽沒有可存的資料（缺少村莊／資源／田地）。"
                    "不會建立空白村莊。",
                    "created": 0,
                    "updated": 0,
                    "total": 0,
                    "error_code": "empty_parse",
                }

            troop_rows = []
            for tr in data.get("troops") or []:
                if not isinstance(tr, dict) or not tr.get("troop_id"):
                    continue
                troop_rows.append(
                    TroopData(
                        troop_id=str(tr["troop_id"]),
                        count=int(tr.get("count") or 0),
                        location=str(tr.get("location") or "home"),
                        is_training=bool(tr.get("is_training") or False),
                    )
                )

            body = VillageOverviewSync(
                account_id=account_id,
                village_id=data.get("village_id"),
                village_name=data.get("village_name"),
                coordinate_x=data.get("coordinate_x"),
                coordinate_y=data.get("coordinate_y"),
                population=int(data.get("population") or 0),
                is_capital=bool(data.get("is_capital") or False),
                village_type=data.get("village_type"),
                capital_village_id=data.get("capital_village_id"),
                resources=ResourceData(**(data.get("resources") or {})),
                production=ProductionData(**(data.get("production") or {})),
                resource_fields=[
                    ResourceFieldData(**f) for f in (data.get("resource_fields") or [])
                ],
                troops=troop_rows,
            )
            ok, message, village_id = self.sync.sync_village_overview(user_id, body)
            return {
                "success": ok,
                "message": message,
                "village_id": village_id,
                "created": 0,
                "updated": 1 if ok else 0,
                "total": 1 if ok else 0,
                "error_code": None if ok else "forbidden",
            }

        if page_type == "village_center":
            from app.domain.schemas.sync import (
                BuildingData,
                TroopData,
                VillageCenterSync,
            )
            from app.parsers.dorf2_text import village_center_is_meaningful

            if not village_center_is_meaningful(data):
                return {
                    "success": False,
                    "message": "村莊中心沒有可存的建築資料。不會建立空白村莊。"
                    "請改貼 HTML 或用擴充上傳。",
                    "created": 0,
                    "updated": 0,
                    "total": 0,
                    "error_code": "empty_parse",
                }

            travian_id = data.get("travian_village_id")
            selected = data.get("village_id")
            # Extension/parser store Travian data-did in village_id; confirm UI may pass our UUID
            if (
                isinstance(selected, str)
                and len(selected) == 36
                and selected.count("-") == 4
            ):
                row = self.db.get(Village, selected)
                if row is None or row.account_id != account_id:
                    return {
                        "success": False,
                        "message": "找不到選定的村莊",
                        "error_code": "forbidden",
                    }
                travian_id = row.travian_village_id or travian_id
                village_name = data.get("village_name") or row.name
                coordinate_x = (
                    data.get("coordinate_x")
                    if data.get("coordinate_x") is not None
                    else row.coordinate_x
                )
                coordinate_y = (
                    data.get("coordinate_y")
                    if data.get("coordinate_y") is not None
                    else row.coordinate_y
                )
                population = int(data.get("population") or row.population or 0)
                is_capital = bool(data.get("is_capital") or row.is_capital)
            else:
                travian_id = travian_id or selected
                village_name = data.get("village_name")
                coordinate_x = data.get("coordinate_x")
                coordinate_y = data.get("coordinate_y")
                population = int(data.get("population") or 0)
                is_capital = bool(data.get("is_capital") or False)

            center_body = VillageCenterSync(
                account_id=account_id,
                village_id=str(travian_id) if travian_id else None,
                village_name=village_name,
                coordinate_x=coordinate_x,
                coordinate_y=coordinate_y,
                population=population,
                is_capital=is_capital,
                capital_village_id=data.get("capital_village_id"),
                buildings=[BuildingData(**b) for b in (data.get("buildings") or [])],
                troops=[TroopData(**tr) for tr in (data.get("troops") or [])],
            )
            ok, message, village_id = self.sync.sync_village_center(
                user_id, center_body
            )
            return {
                "success": ok,
                "message": message,
                "village_id": village_id,
                "created": 0,
                "updated": 1 if ok else 0,
                "total": 1 if ok else 0,
                "error_code": None if ok else "forbidden",
            }

        if page_type == "reports":
            from app.domain.schemas.sync import ReportData, ReportsSync

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
                "created": new_count,
                "updated": updated_count,
                "total": count,
                "error_code": None if ok else "forbidden",
            }

        if page_type == "troop_statistics":
            from app.domain.schemas.sync import (
                TroopData,
                TroopStatisticsSync,
                VillageTroopsData,
            )

            villages: list[VillageTroopsData] = []
            for v in data.get("villages_troops") or []:
                vid = str(v.get("village_id") or "")
                if not vid:
                    continue
                villages.append(
                    VillageTroopsData(
                        village_id=vid,
                        village_name=v.get("village_name"),
                        troops=[TroopData(**tr) for tr in (v.get("troops") or [])],
                    )
                )
            if not villages:
                return {
                    "success": False,
                    "message": "軍隊統計沒有可存的村莊部隊",
                    "created": 0,
                    "updated": 0,
                    "total": 0,
                    "error_code": "unsupported",
                }
            troop_body = TroopStatisticsSync(
                account_id=account_id, villages_troops=villages
            )
            ok, message, villages_synced, troops_synced = (
                self.sync.sync_troop_statistics(user_id, troop_body)
            )
            if not ok or troops_synced == 0:
                return {
                    "success": False,
                    "message": message if not ok else "軍隊統計沒有寫入任何部隊",
                    "created": 0,
                    "updated": 0,
                    "total": 0,
                    "error_code": "forbidden" if not ok else "unsupported",
                }
            return {
                "success": True,
                "message": message,
                "created": troops_synced,
                "updated": 0,
                "total": troops_synced,
                "villages_synced": villages_synced,
            }

        # statistics_* paste without a real writer must not fake success
        if page_type in (
            "statistics_overview",
            "statistics_resources",
            "statistics_culturepoints",
            "statistics_troops",
        ):
            return {
                "success": False,
                "message": f"還不能存這種頁面：{page_type}",
                "created": 0,
                "updated": 0,
                "total": 0,
                "error_code": "unsupported",
            }

        return {
            "success": False,
            "message": f"還不能存這種頁面：{page_type}",
            "created": 0,
            "updated": 0,
            "total": 0,
            "error_code": "unsupported",
        }

    def list_incoming(
        self, user_id: str, account_id: str
    ) -> tuple[bool, str, list[TroopMovement]]:
        account = self._get_account(user_id, account_id)
        if account is None:
            return False, "找不到遊戲帳號或無權限", []
        rows = (
            self.db.query(TroopMovement)
            .filter(
                TroopMovement.account_id == account_id,
                TroopMovement.kind.in_(
                    ["incoming_attack", "incoming_raid", "incoming_spy"]
                ),
            )
            .order_by(
                TroopMovement.arrival_at.is_(None), TroopMovement.arrival_at.asc()
            )
            .all()
        )
        return True, "ok", rows

    def update_movement_coords(
        self,
        user_id: str,
        movement_id: str,
        *,
        coordinate_x: int,
        coordinate_y: int,
    ) -> tuple[bool, str, TroopMovement | None]:
        row = self.db.get(TroopMovement, movement_id)
        if row is None:
            return False, "找不到這一筆", None
        account = self._get_account(user_id, row.account_id)
        if account is None:
            return False, "無權限", None
        row.coordinate_x = coordinate_x
        row.coordinate_y = coordinate_y
        row.needs_coords = False
        self.db.commit()
        self.db.refresh(row)
        return True, "ok", row
