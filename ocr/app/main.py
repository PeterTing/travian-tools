"""tt-ocr: OCR for user-uploaded game screenshots (P0-07).

* Stateless. Images are decoded in memory and never written to disk or logged.
* No outbound network: models are baked into the image at build time.
* No auth code here on purpose: on Cloud Run the service is deployed with
  ``--no-allow-unauthenticated`` and only the backend's service account has
  ``roles/run.invoker``; Cloud Run rejects every other caller before the
  request reaches this process.
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Query, Request
from starlette.concurrency import run_in_threadpool

from app.engine import ENGINE_NAME, Engine

MAX_BYTES = int(os.environ.get("OCR_MAX_BYTES", str(8 * 1024 * 1024)))
MAX_PIXELS = int(os.environ.get("OCR_MAX_PIXELS", str(20_000_000)))
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
        raise HTTPException(status_code=413, detail="image too large")
    img = cv2.imdecode(np.frombuffer(body, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="not a decodable image")
    h, w = img.shape[:2]
    if h * w > MAX_PIXELS:
        raise HTTPException(status_code=413, detail="image has too many pixels")

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
