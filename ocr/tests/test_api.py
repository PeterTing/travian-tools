"""tt-ocr HTTP contract (fake engine; the real engine is covered in test_engine.py)."""

from __future__ import annotations

import struct
import zlib

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import main
from app.engine import Line, OcrResult


class FakeEngine:
    def __init__(self) -> None:
        self.calls: list[tuple[tuple[int, ...], bool]] = []

    def run(self, img: np.ndarray, recheck: bool = True) -> OcrResult:
        self.calls.append((img.shape, recheck))
        h, w = img.shape[:2]
        return OcrResult(
            width=w,
            height=h,
            lines=[
                Line(
                    "(−45|12)",
                    0.91,
                    (1, 2, 30, 12),
                    {"text": "(-45|12)", "score": 0.97},
                )
            ],
            det_ms=1,
            rec_ms=2,
        )


@pytest.fixture()
def client():
    fake = FakeEngine()
    main._state["engine"] = fake
    with TestClient(main.app) as c:
        c.fake = fake  # type: ignore[attr-defined]
        yield c
    main._state.clear()


def _png(w: int = 40, h: int = 20) -> bytes:
    ok, buf = cv2.imencode(".png", np.full((h, w, 3), 255, dtype=np.uint8))
    assert ok
    return buf.tobytes()


def _header_only_png(w: int, h: int) -> bytes:
    """Signature + IHDR + IEND, no pixel data: ~45 bytes that *claim* w x h."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(kind + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # 8-bit RGB
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IEND", b"")


def test_healthz(client: TestClient) -> None:
    assert client.get("/healthz").json()["status"] == "ok"


def test_ocr_returns_lines_with_boxes_and_recheck(client: TestClient) -> None:
    res = client.post("/v1/ocr", content=_png(), headers={"content-type": "image/png"})
    assert res.status_code == 200
    body = res.json()
    assert body["width"] == 40 and body["height"] == 20
    assert body["lines"] == [
        {
            "text": "(−45|12)",
            "score": 0.91,
            "box": [1, 2, 30, 12],
            "recheck": {"text": "(-45|12)", "score": 0.97},
        }
    ]
    assert set(body["timing_ms"]) == {"det", "rec", "recheck"}


def test_recheck_can_be_disabled(client: TestClient) -> None:
    client.post(
        "/v1/ocr?recheck=false", content=_png(), headers={"content-type": "image/png"}
    )
    assert client.fake.calls[-1][1] is False  # type: ignore[attr-defined]


@pytest.mark.parametrize(
    ("body", "ctype", "status"),
    [
        (b"", "image/png", 400),
        (b"not an image", "image/png", 400),
        (b"x", "text/plain", 415),
        (b"x", "application/octet-stream", 415),
    ],
)
def test_rejects_bad_input(
    client: TestClient, body: bytes, ctype: str, status: int
) -> None:
    res = client.post("/v1/ocr", content=body, headers={"content-type": ctype})
    assert res.status_code == status


def test_rejects_oversized_body(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(main, "MAX_BYTES", 10)
    res = client.post("/v1/ocr", content=_png(), headers={"content-type": "image/png"})
    assert res.status_code == 413


def test_rejects_too_many_pixels(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(main, "MAX_PIXELS", 100)
    res = client.post("/v1/ocr", content=_png(), headers={"content-type": "image/png"})
    assert res.status_code == 413


def test_header_bomb_is_rejected_before_decode(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # B1: a few bytes claiming 30000x30000 (900M px) must never reach
    # cv2.imdecode, which would allocate ~2.7 GB before img.shape exists.
    def must_not_decode(*_a: object, **_k: object) -> None:
        raise AssertionError("cv2.imdecode called for an oversized header")

    monkeypatch.setattr(main.cv2, "imdecode", must_not_decode)
    body = _header_only_png(30000, 30000)
    assert len(body) < 100
    res = client.post("/v1/ocr", content=body, headers={"content-type": "image/png"})
    assert res.status_code == 413
    assert res.json()["detail"] == "image_too_large"
    assert client.fake.calls == []  # type: ignore[attr-defined]


def test_header_just_over_limit_is_rejected(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Below Pillow's own bomb guard: our MAX_PIXELS check is what stops it.
    monkeypatch.setattr(main.cv2, "imdecode", lambda *_a, **_k: None)
    body = _header_only_png(5000, 4001)  # 20,005,000 px > 20M
    res = client.post("/v1/ocr", content=body, headers={"content-type": "image/png"})
    assert res.status_code == 413
    assert res.json()["detail"] == "image_too_large"


def test_opencv_pixel_cap_error_is_413_not_500(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Second line of defence: OPENCV_IO_MAX_IMAGE_PIXELS makes imdecode raise
    # cv2.error; that must surface as 413, never as a 5xx.
    def capped(*_a: object, **_k: object) -> None:
        raise cv2.error("pixels <= CV_IO_MAX_IMAGE_PIXELS")

    monkeypatch.setattr(main.cv2, "imdecode", capped)
    res = client.post("/v1/ocr", content=_png(), headers={"content-type": "image/png"})
    assert res.status_code == 413
    assert res.json()["detail"] == "image_too_large"


def test_opencv_pixel_cap_is_configured() -> None:
    import os

    assert int(os.environ["OPENCV_IO_MAX_IMAGE_PIXELS"]) <= 20_000_000


def test_header_with_wrong_format_is_400(client: TestClient) -> None:
    # Pillow only parses PNG/JPEG/WEBP headers; anything else keeps the old
    # "not a decodable image" 400.
    ok, bmp = cv2.imencode(".bmp", np.zeros((4, 4, 3), dtype=np.uint8))
    assert ok
    res = client.post(
        "/v1/ocr", content=bmp.tobytes(), headers={"content-type": "image/png"}
    )
    assert res.status_code == 400


def test_no_api_docs_exposed(client: TestClient) -> None:
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404
