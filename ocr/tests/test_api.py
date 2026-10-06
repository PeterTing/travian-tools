"""tt-ocr HTTP contract (fake engine; the real engine is covered in test_engine.py)."""

from __future__ import annotations

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


def test_no_api_docs_exposed(client: TestClient) -> None:
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404
