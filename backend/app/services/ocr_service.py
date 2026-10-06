"""截圖辨識（P0-07）：集結點截圖 → 來襲草稿（只預覽，不存）。

流程：驗證圖片 → 每張送 tt-ocr → ``parse_rally_ocr`` 依版面切出每筆來襲、
標記低信心／待補 → 用自己村莊名稱與最新地圖快照交叉比對座標。
存入仍走既有的 ``POST /paste/confirm``（source=ocr），那裡會再擋「還有低信心欄位沒確認」。

只在使用者按下上傳時執行；圖片只放記憶體，不寫硬碟、不存資料庫。
"""

from __future__ import annotations

import threading
import time
from collections import deque
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.game_world import GameWorld
from app.infrastructure.database.models.map_data import MapSnapshot, MapVillageData
from app.infrastructure.database.models.village import Village
from app.parsers.rally_ocr import (
    OcrPage,
    find_coordinate_candidates,
    parse_rally_ocr,
)
from app.services.ocr_client import OcrClient, OcrServiceError

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}
_MAGIC = {
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/webp": (b"RIFF",),
}


class OcrFailure(Exception):
    """辨識失敗（明確告訴使用者，不回空白成功）。"""

    def __init__(self, code: str, message: str, status_code: int = 422) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class _RateLimiter:
    """每位使用者每分鐘最多 N 張（單一 instance 記憶體內；tt-api 本身也有 max-instances）。"""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def take(self, key: str, count: int, limit: int, window: float = 60.0) -> bool:
        now = time.monotonic()
        with self._lock:
            q = self._hits.setdefault(key, deque())
            while q and now - q[0] > window:
                q.popleft()
            if len(q) + count > limit:
                return False
            q.extend([now] * count)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


rate_limiter = _RateLimiter()

_client_singleton: OcrClient | None = None
_client_lock = threading.Lock()


def get_ocr_client() -> OcrClient:
    """依設定建 client（同一個 process 共用，讓 ID token 快取生效）。"""
    global _client_singleton
    with _client_lock:
        key = (
            settings.OCR_SERVICE_URL,
            settings.OCR_AUTH,
            settings.OCR_TIMEOUT_SECONDS,
        )
        if _client_singleton is None or getattr(_client_singleton, "_key", None) != key:
            client = OcrClient(
                settings.OCR_SERVICE_URL,
                auth=settings.OCR_AUTH,
                timeout_seconds=settings.OCR_TIMEOUT_SECONDS,
            )
            client._key = key  # type: ignore[attr-defined]
            _client_singleton = client
        return _client_singleton


def sniff_content_type(data: bytes, declared: str | None) -> str | None:
    """以檔頭判斷格式（不信任瀏覽器給的 content-type）。"""
    for ctype, magics in _MAGIC.items():
        if any(data.startswith(m) for m in magics):
            if ctype == "image/webp" and data[8:12] != b"WEBP":
                continue
            return ctype
    return None


def suggest_capture_at(
    clock_seconds: int, utc_offset_minutes: int, now_utc: datetime | None = None
) -> datetime:
    """截圖上的伺服器時鐘 → 最近一次（不晚於現在）出現這個時刻的 UTC 時間（naive）。"""
    now = (now_utc or datetime.now(UTC)).replace(tzinfo=None)
    server_now = now + timedelta(minutes=utc_offset_minutes)
    candidate = server_now.replace(
        hour=0, minute=0, second=0, microsecond=0
    ) + timedelta(seconds=clock_seconds)
    if candidate > server_now + timedelta(minutes=1):
        candidate -= timedelta(days=1)
    return candidate - timedelta(minutes=utc_offset_minutes)


class OcrService:
    def __init__(self, db: Session, client: OcrClient | None = None) -> None:
        self.db = db
        self._client = client

    @property
    def client(self) -> OcrClient:
        if self._client is None:
            try:
                self._client = get_ocr_client()
            except OcrServiceError as exc:
                raise OcrFailure(exc.code, exc.message, 503) from exc
        return self._client

    # ── helpers ──────────────────────────────────────────────────────────
    def _account(self, user_id: str, account_id: str) -> GameAccount:
        account = self.db.get(GameAccount, account_id)
        if account is None or account.user_id != user_id or not account.is_active:
            raise OcrFailure("forbidden", "找不到遊戲帳號或無權限", 403)
        return account

    def _check_images(
        self, images: list[tuple[bytes, str | None]]
    ) -> list[tuple[bytes, str]]:
        if not images:
            raise OcrFailure("OCR_BAD_IMAGE", "請選一張集結點截圖", 400)
        if len(images) > settings.OCR_MAX_IMAGES:
            raise OcrFailure(
                "OCR_TOO_MANY_IMAGES", f"一次最多 {settings.OCR_MAX_IMAGES} 張截圖", 400
            )
        checked: list[tuple[bytes, str]] = []
        for data, declared in images:
            if not data:
                raise OcrFailure("OCR_BAD_IMAGE", "有一張圖是空的", 400)
            if len(data) > settings.OCR_MAX_IMAGE_BYTES:
                mb = settings.OCR_MAX_IMAGE_BYTES // (1024 * 1024)
                raise OcrFailure(
                    "OCR_IMAGE_TOO_LARGE", f"圖片太大（每張上限 {mb} MB）", 413
                )
            ctype = sniff_content_type(data, declared)
            if ctype is None:
                raise OcrFailure("OCR_BAD_IMAGE", "只支援 PNG、JPEG、WebP 截圖", 415)
            checked.append((data, ctype))
        return checked

    def _rate_limit(self, user_id: str, count: int) -> None:
        if not rate_limiter.take(user_id, count, settings.OCR_RATE_LIMIT_PER_MINUTE):
            raise OcrFailure("OCR_RATE_LIMITED", "辨識太頻繁了，請等一分鐘再試", 429)

    def _recognize(
        self, images: list[tuple[bytes, str]]
    ) -> tuple[list[OcrPage], list[dict]]:
        pages: list[OcrPage] = []
        timings: list[dict[str, Any]] = []
        for i, (data, ctype) in enumerate(images):
            try:
                payload = self.client.recognize(data, ctype)
            except OcrServiceError as exc:
                status = 400 if exc.code == "OCR_BAD_IMAGE" else 503
                raise OcrFailure(exc.code, exc.message, status) from exc
            pages.append(OcrPage.from_service(i, payload))
            timings.append(
                {
                    "image_index": i,
                    "engine": payload.get("engine"),
                    "width": payload.get("width"),
                    "height": payload.get("height"),
                    "bytes": len(data),
                    "ocr_ms": payload.get("elapsed_ms"),
                    "round_trip_ms": payload.get("round_trip_ms"),
                }
            )
        return pages, timings

    def _own_village_names(self, account_id: str) -> list[str]:
        rows = (
            self.db.query(Village.name).filter(Village.account_id == account_id).all()
        )
        return [r[0] for r in rows if r[0]]

    def _latest_snapshot(self, account: GameAccount) -> MapSnapshot | None:
        q = self.db.query(MapSnapshot).filter(
            MapSnapshot.server_url == account.server_url
        )
        own = (
            q.filter(MapSnapshot.account_id == account.account_id)
            .order_by(MapSnapshot.created_at.desc())
            .first()
        )
        if own is not None:
            return own
        return (
            q.filter(MapSnapshot.account_id.is_(None))
            .order_by(MapSnapshot.created_at.desc())
            .first()
        )

    def _map_hooks(self, account: GameAccount) -> tuple[Any, Any]:
        snap = self._latest_snapshot(account)
        if snap is None:
            return None, None
        sid = snap.snapshot_id

        def lookup(x: int, y: int) -> dict[str, Any]:
            row = (
                self.db.query(MapVillageData)
                .filter(
                    MapVillageData.snapshot_id == sid,
                    MapVillageData.x == x,
                    MapVillageData.y == y,
                )
                .first()
            )
            if row is None:
                return {"found": False}
            return {
                "found": True,
                "village_name": row.village_name,
                "player_name": row.player_name,
            }

        def search(village: str | None, player: str | None) -> list[dict[str, Any]]:
            out: list[MapVillageData] = []
            base = self.db.query(MapVillageData).filter(
                MapVillageData.snapshot_id == sid
            )
            if village:
                out += (
                    base.filter(MapVillageData.village_name == village.strip())
                    .limit(3)
                    .all()
                )
            if not out and player:
                out += (
                    base.filter(MapVillageData.player_name == player.strip())
                    .limit(3)
                    .all()
                )
            return [
                {
                    "x": r.x,
                    "y": r.y,
                    "village_name": r.village_name,
                    "player_name": r.player_name,
                }
                for r in out
            ]

        return lookup, search

    def _utc_offset(self, account: GameAccount, clock_offset: int | None) -> int | None:
        if clock_offset is not None:
            return clock_offset
        if account.world_id:
            world = self.db.get(GameWorld, account.world_id)
            if world is not None and world.utc_offset is not None:
                return int(world.utc_offset)
        return None

    # ── public ──────────────────────────────────────────────────────────
    def recognize_rally(
        self,
        user_id: str,
        account_id: str,
        images: list[tuple[bytes, str | None]],
    ) -> dict[str, Any]:
        account = self._account(user_id, account_id)
        checked = self._check_images(images)
        self._rate_limit(user_id, len(checked))
        started = time.perf_counter()
        pages, timings = self._recognize(checked)
        lookup, search = self._map_hooks(account)
        result = parse_rally_ocr(
            pages,
            own_village_names=self._own_village_names(account_id),
            map_lookup=lookup,
            map_search=search,
        )
        if not result.ok:
            raise OcrFailure(result.error_code or "OCR_FAILED", result.message, 422)

        capture_at: str | None = None
        time_source = "client"
        clock = result.server_clock
        if clock is not None:
            offset = self._utc_offset(account, clock.utc_offset_minutes)
            if offset is not None:
                capture_at = suggest_capture_at(clock.seconds, offset).isoformat() + "Z"
                time_source = "server_clock"
        return {
            "ok": True,
            "page_type": "rally_point",
            "data": result.data,
            "warnings": [],
            "server_time": result.data.get("server_time"),
            "ocr": {
                "engine": timings[0].get("engine") if timings else None,
                "images": timings,
                "elapsed_ms": int((time.perf_counter() - started) * 1000),
                "low_count": result.low_count,
                "missing_count": result.missing_count,
                "dropped_unreadable": result.dropped_unreadable,
                "overlap_removed": result.overlap_removed,
                "map_checked": lookup is not None,
                "capture_at_suggested": capture_at,
                "time_source": time_source,
                "server_clock_box": list(clock.box) if clock else None,
                "server_clock_image_index": clock.image_index if clock else None,
            },
        }

    def recognize_coords(
        self, user_id: str, image: tuple[bytes, str | None]
    ) -> dict[str, Any]:
        checked = self._check_images([image])
        self._rate_limit(user_id, 1)
        pages, timings = self._recognize(checked)
        candidates = find_coordinate_candidates(pages[0])
        if not candidates:
            raise OcrFailure(
                "OCR_NO_COORDS", "這張截圖裡找不到座標（像 (−45|12) 這樣的字）", 422
            )
        return {
            "ok": True,
            "candidates": candidates,
            "image": timings[0],
        }
