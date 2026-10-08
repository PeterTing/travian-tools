"""RapidOCR (ONNX) pipeline tuned for game screenshots.

Differences from calling ``RapidOCR()(img)`` directly:

* Big phone screenshots (DPR 3) are scaled down to about ``MAX_DET_PIXELS``
  before detection: the text is still large enough and detection time drops.
* No angle classifier: screenshots are never rotated.
* Boxes that are a single glyph (width < 1.6 x height, e.g. troop counts
  ``?`` / ``0`` and unit icons) are not sent to the recogniser. P0 only needs
  headings, coordinates and times, and recognition is the slow step.
* Lines that contain a digit and score below ``RECHECK_BELOW`` are read a
  second time from an upscaled crop of the *original* image; the backend
  compares both readings (``CROP_RECHECK_MISMATCH``).

RapidOCR is pinned (``requirements.txt``) because this module uses its
detector / recogniser objects directly. Per-call flags on ``RapidOCR.__call__``
are sticky in 3.x, so this module never uses them.
"""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np

MAX_DET_PIXELS = float(os.environ.get("OCR_MAX_DET_PIXELS", "1300000"))
RECHECK_BELOW = float(os.environ.get("OCR_RECHECK_BELOW", "0.95"))
RECHECK_SCALE = 2.0
SINGLE_GLYPH_RATIO = 1.6
THREADS = int(os.environ.get("OCR_THREADS", "1"))
ENGINE_NAME = "rapidocr-3.9.2/PP-OCRv6-small"


@dataclass
class Line:
    text: str
    score: float
    box: tuple[int, int, int, int]  # x0, y0, x1, y1 in original-image pixels
    recheck: dict[str, Any] | None = None

    def as_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "text": self.text,
            "score": round(float(self.score), 4),
            "box": list(self.box),
        }
        if self.recheck is not None:
            out["recheck"] = self.recheck
        return out


@dataclass
class OcrResult:
    width: int
    height: int
    lines: list[Line] = field(default_factory=list)
    det_ms: int = 0
    rec_ms: int = 0
    recheck_ms: int = 0


class Engine:
    """Thread-safe wrapper (Cloud Run concurrency is 1, but be safe)."""

    def __init__(self) -> None:
        from rapidocr import RapidOCR

        self._ocr = RapidOCR(
            params={
                "Global.log_level": "error",
                "EngineConfig.onnxruntime.intra_op_num_threads": THREADS,
                "EngineConfig.onnxruntime.inter_op_num_threads": 1,
            }
        )
        self._lock = threading.Lock()

    def _recognise(self, crops: list[np.ndarray]) -> list[tuple[str, float]]:
        from rapidocr.ch_ppocr_rec import TextRecInput

        if not crops:
            return []
        res = self._ocr.text_rec(TextRecInput(img=crops))
        return list(zip(res.txts or (), res.scores or (), strict=False))

    def warm_up(self) -> None:
        img = np.full((64, 256, 3), 255, dtype=np.uint8)
        cv2.putText(
            img, "12:34:56", (8, 44), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2
        )
        self.run(img)

    def run(self, img: np.ndarray, recheck: bool = True) -> OcrResult:
        from rapidocr.utils.process_img import get_rotate_crop_image

        with self._lock:
            h, w = img.shape[:2]
            scale = min(1.0, (MAX_DET_PIXELS / float(h * w)) ** 0.5)
            small = (
                cv2.resize(
                    img,
                    (round(w * scale), round(h * scale)),
                    interpolation=cv2.INTER_AREA,
                )
                if scale < 1.0
                else img
            )
            t0 = time.perf_counter()
            det = self._ocr.text_det(small)
            t1 = time.perf_counter()
            boxes = (
                []
                if det.boxes is None
                else [np.asarray(b, dtype=np.float32) for b in det.boxes]
            )
            keep = []
            for b in boxes:
                bw = float(b[:, 0].max() - b[:, 0].min())
                bh = float(b[:, 1].max() - b[:, 1].min())
                if bh <= 0 or bw < SINGLE_GLYPH_RATIO * bh:
                    continue
                keep.append(b)
            crops = [get_rotate_crop_image(small, b.copy()) for b in keep]
            texts = self._recognise(crops)
            t2 = time.perf_counter()

            lines: list[Line] = []
            for b, (text, score) in zip(keep, texts, strict=False):
                x0 = int(max(0, np.floor(b[:, 0].min() / scale)))
                y0 = int(max(0, np.floor(b[:, 1].min() / scale)))
                x1 = int(min(w, np.ceil(b[:, 0].max() / scale)))
                y1 = int(min(h, np.ceil(b[:, 1].max() / scale)))
                lines.append(
                    Line(text=str(text), score=float(score), box=(x0, y0, x1, y1))
                )
            lines.sort(key=lambda ln: (ln.box[1], ln.box[0]))

            t3 = t2
            if recheck:
                todo = [
                    ln
                    for ln in lines
                    if ln.score < RECHECK_BELOW and any(c.isdigit() for c in ln.text)
                ]
                crops2 = []
                for ln in todo:
                    x0, y0, x1, y1 = ln.box
                    pad = max(2, (y1 - y0) // 4)
                    crop = img[
                        max(0, y0 - pad) : min(h, y1 + pad),
                        max(0, x0 - pad) : min(w, x1 + pad),
                    ]
                    crops2.append(
                        cv2.resize(
                            crop,
                            None,
                            fx=RECHECK_SCALE,
                            fy=RECHECK_SCALE,
                            interpolation=cv2.INTER_CUBIC,
                        )
                    )
                for ln, (text, score) in zip(
                    todo, self._recognise(crops2), strict=False
                ):
                    ln.recheck = {"text": str(text), "score": round(float(score), 4)}
                t3 = time.perf_counter()

            return OcrResult(
                width=w,
                height=h,
                lines=lines,
                det_ms=int((t1 - t0) * 1000),
                rec_ms=int((t2 - t1) * 1000),
                recheck_ms=int((t3 - t2) * 1000),
            )
