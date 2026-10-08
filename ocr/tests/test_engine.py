"""Real RapidOCR engine on a synthetic image (no network: models are local)."""

from __future__ import annotations

import cv2
import numpy as np
import pytest

pytest.importorskip("rapidocr")

from app.engine import Engine  # noqa: E402


@pytest.fixture(scope="module")
def engine() -> Engine:
    return Engine()


def _canvas(lines: list[str], scale: float = 1.0) -> np.ndarray:
    h = int((40 + 60 * len(lines)) * scale)
    img = np.full((h, int(700 * scale), 3), 255, dtype=np.uint8)
    for i, text in enumerate(lines):
        cv2.putText(
            img,
            text,
            (int(20 * scale), int((60 + 60 * i) * scale)),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.1 * scale,
            (0, 0, 0),
            max(1, int(2 * scale)),
        )
    return img


def test_reads_time_and_coordinates(engine: Engine) -> None:
    res = engine.run(_canvas(["arrival 13:10:28", "(-45|12)"]))
    texts = " ".join(ln.text for ln in res.lines)
    assert "13:10:28" in texts
    assert "45" in texts and "12" in texts
    for ln in res.lines:
        x0, y0, x1, y1 = ln.box
        assert 0 <= x0 < x1 <= res.width and 0 <= y0 < y1 <= res.height


def test_boxes_are_in_original_pixels_after_downscale(engine: Engine) -> None:
    img = _canvas(["13:10:28"], scale=3.0)  # big image -> detection runs downscaled
    res = engine.run(img, recheck=False)
    assert res.width == img.shape[1] and res.height == img.shape[0]
    line = next(ln for ln in res.lines if "13:10:28" in ln.text)
    x0, y0, x1, y1 = line.box
    assert y1 - y0 > 40  # box height is reported at 3x scale, not the detection size


def test_single_glyph_boxes_are_skipped(engine: Engine) -> None:
    img = np.full((120, 400, 3), 255, dtype=np.uint8)
    cv2.putText(img, "?", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 3)
    cv2.putText(img, "12:00:00", (150, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
    res = engine.run(img, recheck=False)
    assert all(ln.text.strip() != "?" for ln in res.lines)
