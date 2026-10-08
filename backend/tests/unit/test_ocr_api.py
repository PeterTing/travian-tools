"""P0-07 截圖辨識 API：/ocr/rally、/ocr/coords、存入守門（source=ocr）。

tt-ocr 用假的 client 代替（回傳 tests/fixtures/ocr 的真實 OCR 輸出）。
"""

from __future__ import annotations

import copy
import json
from collections.abc import Iterator
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.infrastructure.database.models  # noqa: F401
from app.core.config import settings
from app.core.dependencies import get_current_user, get_db, get_upload_user
from app.infrastructure.database.base import Base
from app.infrastructure.database.models.map_data import MapSnapshot, MapVillageData
from app.infrastructure.database.models.troop_movement import TroopMovement
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.village import Village
from app.main import app
from app.services import ocr_service
from app.services.ocr_client import OcrServiceError
from app.services.ocr_service import suggest_capture_at

FIX = Path(__file__).resolve().parents[1] / "fixtures" / "ocr"
PNG = b"\x89PNG\r\n\x1a\n" + b"\0" * 64
JPEG = b"\xff\xd8\xff\xe0" + b"\0" * 64
SERVER = "https://ts11.x1.international.travian.com"


def fixture(name: str) -> dict[str, Any]:
    data = json.loads((FIX / f"{name}.json").read_text(encoding="utf-8"))
    data.setdefault("engine", "rapidocr-test")
    data.setdefault("elapsed_ms", 2000)
    return data


class FakeClient:
    def __init__(self, *payloads: dict[str, Any] | Exception) -> None:
        self.payloads = list(payloads)
        self.calls: list[tuple[int, str]] = []
        self.timeouts: list[float | None] = []

    def recognize(
        self,
        image: bytes,
        content_type: str,
        *,
        timeout_seconds: float | None = None,
    ) -> dict[str, Any]:
        self.calls.append((len(image), content_type))
        self.timeouts.append(timeout_seconds)
        item = self.payloads.pop(0) if len(self.payloads) > 1 else self.payloads[0]
        if isinstance(item, Exception):
            raise item
        return copy.deepcopy(item)


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    db.add(
        User(
            user_id="u-peter",
            username="peter",
            email="p@example.com",
            password_hash="x",
        )
    )
    db.add(
        User(
            user_id="u-other",
            username="other",
            email="o@example.com",
            password_hash="x",
        )
    )
    db.commit()
    yield db
    db.close()


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    user = session.get(User, "u-peter")
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_upload_user] = lambda: user
    ocr_service.rate_limiter.reset()
    yield TestClient(app)
    app.dependency_overrides.clear()
    ocr_service.rate_limiter.reset()


@pytest.fixture
def fake(monkeypatch: pytest.MonkeyPatch):
    holder: dict[str, FakeClient] = {}

    def install(*payloads: dict[str, Any] | Exception) -> FakeClient:
        holder["c"] = FakeClient(*payloads)
        monkeypatch.setattr(ocr_service, "get_ocr_client", lambda: holder["c"])
        return holder["c"]

    return install


def _account(client: TestClient, player: str = "HandsomeTing") -> str:
    resp = client.post(
        "/api/v1/game-accounts",
        json={"server_url": SERVER, "player_name": player, "tribe": "gauls"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["account_id"]


def _post(
    client: TestClient, account_id: str, *images: bytes, ctype: str = "image/png"
):
    files = [
        ("images", (f"shot{i}.png", img, ctype))
        for i, img in enumerate(images or (PNG,))
    ]
    return client.post(
        "/api/v1/ocr/rally", data={"account_id": account_id}, files=files
    )


# ───────────────────────── /ocr/rally


def test_requires_login() -> None:
    resp = TestClient(app).post(
        "/api/v1/ocr/rally",
        data={"account_id": "x"},
        files=[("images", ("a.png", PNG, "image/png"))],
    )
    assert resp.status_code in (401, 403)


def test_not_configured_is_explicit_503(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "OCR_SERVICE_URL", "")
    monkeypatch.setattr(ocr_service, "_client_singleton", None)
    resp = _post(client, _account(client))
    assert resp.status_code == 503
    assert resp.json()["detail"]["code"] == "OCR_UNAVAILABLE"


def test_rally_success_desktop(client: TestClient, fake) -> None:
    c = fake(fixture("synthetic-attack3-1440"))
    resp = _post(client, _account(client))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is True and body["page_type"] == "rally_point"
    incoming = body["data"]["incoming"]
    assert [(m["coordinate_x"], m["coordinate_y"]) for m in incoming] == [
        (-45, 12),
        (-45, 12),
        (-48, 12),
    ]
    assert body["server_time"] == "10:29:18"
    meta = body["ocr"]
    assert meta["time_source"] == "server_clock"
    assert meta["capture_at_suggested"].endswith("Z")
    assert meta["low_count"] == 0 and meta["missing_count"] == 0
    assert meta["map_checked"] is False
    assert meta["images"][0]["width"] == 1440 or meta["images"][0]["width"] > 0
    assert c.calls == [(len(PNG), "image/png")]


def test_rally_phone_without_clock_uses_client_time(client: TestClient, fake) -> None:
    fake(fixture("synthetic-attack3-390"))
    body = _post(client, _account(client)).json()
    assert body["ocr"]["time_source"] == "client"
    assert body["ocr"]["capture_at_suggested"] is None


def test_real_overview_without_incoming_is_explicit_failure(
    client: TestClient, fake
) -> None:
    fake(fixture("ts11-rally-overview-390"))
    resp = _post(client, _account(client))
    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "OCR_NO_INCOMING"
    assert "沒有辨識到來襲" in resp.json()["detail"]["message"]


def test_content_type_is_sniffed_not_trusted(client: TestClient, fake) -> None:
    c = fake(fixture("synthetic-attack3-390"))
    account_id = _account(client)
    assert (
        _post(client, account_id, b"GIF89a....", ctype="image/png").status_code == 415
    )
    assert (
        _post(client, account_id, JPEG, ctype="application/octet-stream").status_code
        == 200
    )
    assert c.calls[-1][1] == "image/jpeg"


def test_image_limits(
    client: TestClient, fake, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake(fixture("synthetic-attack3-390"))
    account_id = _account(client)
    monkeypatch.setattr(settings, "OCR_MAX_IMAGES", 2)
    resp = _post(client, account_id, PNG, PNG, PNG)
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "OCR_TOO_MANY_IMAGES"
    monkeypatch.setattr(settings, "OCR_MAX_IMAGE_BYTES", 32)
    resp = _post(client, account_id, PNG)
    assert resp.status_code == 413
    assert resp.json()["detail"]["code"] == "OCR_IMAGE_TOO_LARGE"


def test_other_users_account_is_forbidden(
    client: TestClient, fake, session: Session
) -> None:
    fake(fixture("synthetic-attack3-390"))
    account_id = _account(client)
    app.dependency_overrides[get_current_user] = lambda: session.get(User, "u-other")
    resp = _post(client, account_id)
    assert resp.status_code == 403


def test_rate_limited(
    client: TestClient, fake, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake(fixture("synthetic-attack3-390"))
    monkeypatch.setattr(settings, "OCR_RATE_LIMIT_PER_MINUTE", 2)
    account_id = _account(client)
    assert _post(client, account_id).status_code == 200
    assert _post(client, account_id).status_code == 200
    resp = _post(client, account_id)
    assert resp.status_code == 429
    assert resp.json()["detail"]["code"] == "OCR_RATE_LIMITED"


@pytest.mark.parametrize(
    ("error", "status"),
    [
        (OcrServiceError("OCR_TIMEOUT", "辨識太久"), 504),
        (OcrServiceError("OCR_IMAGE_TOO_LARGE", "圖片太大"), 413),
        (OcrServiceError("OCR_UNAVAILABLE", "連不上"), 503),
        (OcrServiceError("OCR_BAD_IMAGE", "讀不了"), 400),
    ],
)
def test_ocr_service_errors_are_explicit(
    client: TestClient, fake, error: Exception, status: int
) -> None:
    fake(error)
    resp = _post(client, _account(client))
    assert resp.status_code == status
    assert resp.json()["detail"]["code"] == error.code  # type: ignore[attr-defined]


def test_batch_shares_one_total_deadline(
    client: TestClient, fake, monkeypatch: pytest.MonkeyPatch
) -> None:
    # 4 張依序送：每張只拿「剩下的總時間」與單張上限取小，整批不超過 50 秒
    clock = {"t": 1000.0}
    fake_time = SimpleNamespace(
        monotonic=lambda: clock["t"], perf_counter=lambda: clock["t"]
    )
    monkeypatch.setattr(ocr_service, "time", fake_time)  # 只換這個模組看到的時鐘
    monkeypatch.setattr(settings, "OCR_TOTAL_DEADLINE_SECONDS", 50.0)
    monkeypatch.setattr(settings, "OCR_TIMEOUT_SECONDS", 30.0)
    page = fixture("synthetic-attack3-390")
    c = fake(page)
    real = c.recognize

    def slow(*args: Any, **kwargs: Any) -> dict[str, Any]:
        out = real(*args, **kwargs)
        clock["t"] += 20.0  # 每張花 20 秒
        return out

    c.recognize = slow  # type: ignore[method-assign]
    resp = _post(client, _account(client), PNG, PNG, PNG, PNG)
    assert resp.status_code == 504
    assert resp.json()["detail"]["code"] == "OCR_TIMEOUT"
    assert "少傳幾張" in resp.json()["detail"]["message"]
    # 第 1 張 30（單張上限）、第 2 張 30、第 3 張只剩 10；第 4 張不送
    assert c.timeouts == [30.0, 30.0, 10.0]


def test_batch_deadline_passes_remaining_time_to_client(
    client: TestClient, fake, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "OCR_TOTAL_DEADLINE_SECONDS", 50.0)
    monkeypatch.setattr(settings, "OCR_TIMEOUT_SECONDS", 30.0)
    c = fake(fixture("synthetic-attack3-390"), fixture("synthetic-attack3-390-part2"))
    resp = _post(client, _account(client), PNG, PNG)
    assert resp.status_code == 200
    assert len(c.timeouts) == 2
    assert all(t is not None and 0 < t <= 30.0 for t in c.timeouts)


def test_default_total_deadline_fits_cloud_run_timeout() -> None:
    # tt-api 的 Cloud Run request timeout 是 60 秒
    assert settings.OCR_TOTAL_DEADLINE_SECONDS < 60
    assert settings.OCR_TIMEOUT_SECONDS <= settings.OCR_TOTAL_DEADLINE_SECONDS


def test_map_cross_check_uses_latest_snapshot(
    client: TestClient, fake, session: Session
) -> None:
    fake(fixture("synthetic-attack3-390"))
    account_id = _account(client)
    old = MapSnapshot(
        account_id=account_id, server_url=SERVER, created_at=datetime(2026, 10, 1)
    )
    new = MapSnapshot(
        account_id=account_id, server_url=SERVER, created_at=datetime(2026, 10, 5)
    )
    session.add_all([old, new])
    session.flush()
    session.add_all(
        [
            MapVillageData(
                snapshot_id=old.snapshot_id,
                travian_village_id=9,
                x=-48,
                y=12,
                village_name="敵方二村",
                player_name="Raider",
            ),
            MapVillageData(
                snapshot_id=new.snapshot_id,
                travian_village_id=1,
                x=-45,
                y=12,
                village_name="敵方村",
                player_name="Raider",
            ),
            MapVillageData(
                snapshot_id=new.snapshot_id,
                travian_village_id=2,
                x=-46,
                y=12,
                village_name="敵方二村",
                player_name="Raider",
            ),
        ]
    )
    session.commit()
    body = _post(client, account_id).json()
    assert body["ocr"]["map_checked"] is True
    fields = [m["ocr"]["fields"]["coords"] for m in body["data"]["incoming"]]
    assert [f["status"] for f in fields] == ["ok", "ok", "low"]
    assert fields[2]["reasons"] == ["COORD_MAP_MISMATCH"]
    assert {"x": -46, "y": 12} in [o["value"] for o in fields[2]["options"]]


def test_own_village_names_come_from_db(
    client: TestClient, fake, session: Session
) -> None:
    fake(fixture("synthetic-attack3-390-part2"))
    account_id = _account(client)
    assert _post(client, account_id).status_code == 422  # 沒有標題、也不知道自己的村莊
    session.add(
        Village(
            village_id="v-1",
            account_id=account_id,
            name="HandsomeTing的村莊",
            coordinate_x=33,
            coordinate_y=-4,
            travian_village_id="1",
        )
    )
    session.commit()
    resp = _post(client, account_id)
    assert resp.status_code == 200
    assert len(resp.json()["data"]["incoming"]) == 2


def test_two_screenshots_are_merged(client: TestClient, fake) -> None:
    c = fake(fixture("synthetic-attack3-390"), fixture("synthetic-attack3-390-part2"))
    body = _post(client, _account(client), PNG, PNG).json()
    # 第二張沒有標題：需要自己的村莊名，這裡沒有，所以只算第一張的 3 筆
    assert len(body["data"]["incoming"]) == 3
    assert len(c.calls) == 2
    assert [img["image_index"] for img in body["ocr"]["images"]] == [0, 1]


# ───────────────────────── confirm (source=ocr)


def _confirm(client: TestClient, account_id: str, data: dict[str, Any]):
    return client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "rally_point",
            "data": data,
            "source": "ocr",
            "capture_at": "2026-10-06T09:29:18",
        },
    )


def test_confirm_blocks_unconfirmed_low_fields(
    client: TestClient, fake, session: Session
) -> None:
    fake(fixture("synthetic-attack3-390-lowres-q35"))
    account_id = _account(client)
    data = _post(client, account_id).json()["data"]
    resp = _confirm(client, account_id, data)
    assert resp.status_code == 400
    assert "還有 1 個" in resp.json()["detail"]
    assert session.query(TroopMovement).count() == 0

    for m in data["movements"]:
        for f in m["ocr"]["fields"].values():
            if f["status"] == "low":
                f["confirmed"] = True
    resp = _confirm(client, account_id, data)
    assert resp.status_code == 200, resp.text
    assert resp.json()["created"] == 3
    rows = session.query(TroopMovement).order_by(TroopMovement.arrival_at).all()
    assert [(r.coordinate_x, r.coordinate_y) for r in rows] == [
        (-45, 12),
        (-45, 12),
        (-48, 12),
    ]


def test_confirm_saves_missing_fields_and_drops_unreadable(
    client: TestClient, fake, session: Session
) -> None:
    fake(fixture("synthetic-attack3-390-cut"))
    account_id = _account(client)
    data = _post(client, account_id).json()["data"]
    # 第 3 筆：倒數／抵達待補（座標有）→ 可以先存；再加一筆什麼都讀不到的
    blank = copy.deepcopy(data["movements"][0])
    blank.update(
        coordinate_x=None, coordinate_y=None, timer_seconds=None, arrival_time=None
    )
    data["movements"].append(blank)
    data["incoming"] = data["movements"]
    resp = _confirm(client, account_id, data)
    assert resp.status_code == 200, resp.text
    assert resp.json()["created"] == 3


def test_confirm_all_unreadable_is_empty_parse(client: TestClient, fake) -> None:
    fake(fixture("synthetic-attack3-390"))
    account_id = _account(client)
    data = _post(client, account_id).json()["data"]
    for m in data["movements"]:
        m.update(
            coordinate_x=None, coordinate_y=None, timer_seconds=None, arrival_time=None
        )
    resp = _confirm(client, account_id, data)
    assert resp.status_code == 400


# ───────────────────────── /ocr/coords


def test_coords_camera_button(client: TestClient, fake) -> None:
    fake(fixture("ts11-rally-overview-390"))
    resp = client.post(
        "/api/v1/ocr/coords", files={"image": ("a.png", PNG, "image/png")}
    )
    assert resp.status_code == 200, resp.text
    assert [(c["x"], c["y"]) for c in resp.json()["candidates"]] == [(33, -4)]


def test_coords_none_found(client: TestClient, fake) -> None:
    fake(
        {
            "width": 10,
            "height": 10,
            "lines": [{"text": "木材", "score": 1, "box": [0, 0, 5, 5]}],
        }
    )
    resp = client.post(
        "/api/v1/ocr/coords", files={"image": ("a.png", PNG, "image/png")}
    )
    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "OCR_NO_COORDS"


# ───────────────────────── capture time from the server clock


def test_suggest_capture_at_same_day() -> None:
    got = suggest_capture_at(
        10 * 3600 + 29 * 60 + 18, 60, datetime(2026, 10, 6, 9, 30, 0)
    )
    assert got == datetime(2026, 10, 6, 9, 29, 18)


def test_suggest_capture_at_crosses_midnight() -> None:
    # 伺服器現在 00:01（UTC+1），截圖上是 23:59:00 → 前一天
    got = suggest_capture_at(23 * 3600 + 59 * 60, 60, datetime(2026, 10, 5, 23, 1, 0))
    assert got == datetime(2026, 10, 5, 22, 59, 0)
