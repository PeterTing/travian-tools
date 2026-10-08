"""tt-ocr: OCR for user-uploaded game screenshots (P0-07).

* Stateless. Images are decoded in memory and never written to disk or logged.
* No outbound network: models are baked into the image at build time.
* No auth code here on purpose: on Cloud Run the service is deployed with
  ``--no-allow-unauthenticated`` and only the backend's service account has
  ``roles/run.invoker``; Cloud Run rejects every other caller before the
  request reaches this process.
* Decompression bombs: a tiny PNG can claim 30000x30000 pixels and make
  ``cv2.imdecode`` allocate gigabytes before we ever see ``img.shape``. The
  pixel count is therefore read from the image header with Pillow (no pixel
  decode) and rejected with 413 first; OpenCV's own cap
  (``OPENCV_IO_MAX_IMAGE_PIXELS``) is a second line of defence.
"""

from __future__ import annotations

import io
import logging
import os
import time
import warnings
from contextlib import asynccontextmanager
from typing import Any

MAX_BYTES = int(os.environ.get("OCR_MAX_BYTES", str(8 * 1024 * 1024)))
MAX_PIXELS = int(os.environ.get("OCR_MAX_PIXELS", str(20_000_000)))
# OpenCV reads this cap from the environment; the Dockerfile sets it too.
os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(MAX_PIXELS))

import cv2  # noqa: E402
import numpy as np  # noqa: E402
from fastapi import FastAPI, HTTPException, Query, Request  # noqa: E402
from PIL import Image, UnidentifiedImageError  # noqa: E402
from starlette.concurrency import run_in_threadpool  # noqa: E402

from app.engine import ENGINE_NAME, Engine  # noqa: E402

# Only the formats we accept; Pillow never tries its other (larger) parsers.
HEADER_FORMATS = ("PNG", "JPEG", "WEBP")
IMAGE_TOO_LARGE = "image_too_large"
NOT_DECODABLE = "not a decodable image"
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}

log = logging.getLogger("tt-ocr")
_state: dict[str, Any] = {}


def get_engine() -> Engine:
    engine = _state.get("engine")
    if engine is None:
        engine = Engine()
        engine.warm_up()
        _state["engine"] = engine
    return engine


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Load models + one tiny inference before Cloud Run sends traffic, so the
    # cold-start cost is paid during startup, not inside the first request.
    if os.environ.get("OCR_SKIP_WARMUP") != "1":
        started = time.perf_counter()
        get_engine()
        log.warning("engine ready in %.2fs", time.perf_counter() - started)
    yield


app = FastAPI(
    title="tt-ocr", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan
)


def header_pixels(body: bytes) -> int:
    """Pixel count from the image header only (no pixel data is decoded).

    Unreadable headers keep the old contract (400 "not a decodable image");
    Pillow's own bomb guard (> ~179M pixels) also means "too large".
    """
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(body), formats=HEADER_FORMATS) as im:
                w, h = im.size
    except Image.DecompressionBombError:
        raise HTTPException(status_code=413, detail=IMAGE_TOO_LARGE) from None
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        raise HTTPException(status_code=400, detail=NOT_DECODABLE) from None
    return int(w) * int(h)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "engine": ENGINE_NAME}


@app.post("/v1/ocr")
async def ocr(request: Request, recheck: bool = Query(True)) -> dict[str, Any]:
    ctype = (request.headers.get("content-type") or "").split(";")[0].strip().lower()
    if ctype not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415, detail="only image/png, image/jpeg, image/webp"
        )
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    if len(body) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=IMAGE_TOO_LARGE)
    if header_pixels(body) > MAX_PIXELS:
        raise HTTPException(status_code=413, detail=IMAGE_TOO_LARGE)
    try:
        img = cv2.imdecode(np.frombuffer(body, dtype=np.uint8), cv2.IMREAD_COLOR)
    except cv2.error:
        # OPENCV_IO_MAX_IMAGE_PIXELS tripped (header lied to Pillow, or a
        # format quirk): still "too large", never a 5xx.
        raise HTTPException(status_code=413, detail=IMAGE_TOO_LARGE) from None
    if img is None:
        raise HTTPException(status_code=400, detail=NOT_DECODABLE)
    h, w = img.shape[:2]
    if h * w > MAX_PIXELS:
        raise HTTPException(status_code=413, detail=IMAGE_TOO_LARGE)

    started = time.perf_counter()
    result = await run_in_threadpool(get_engine().run, img, recheck)
    elapsed = int((time.perf_counter() - started) * 1000)
    return {
        "engine": ENGINE_NAME,
        "width": result.width,
        "height": result.height,
        "elapsed_ms": elapsed,
        "timing_ms": {
            "det": result.det_ms,
            "rec": result.rec_ms,
            "recheck": result.recheck_ms,
        },
        "lines": [ln.as_dict() for ln in result.lines],
    }
