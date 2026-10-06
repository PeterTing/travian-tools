# tt-ocr (P0-07): RapidOCR (ONNX, CPU) behind a tiny FastAPI app.
# Cloud Run: 1 vCPU / 1 GiB, concurrency 1, min-instances 0, max-instances 2,
# deployed with --no-allow-unauthenticated (only tt-api may invoke it).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    OCR_THREADS=1

WORKDIR /srv

# libgomp: onnxruntime / OpenCV runtime dependency (headless build: no libGL).
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# pip check must be clean except for the deliberate opencv-python ->
# opencv-python-headless swap (same cv2 module, no libGL).
RUN pip install --no-deps -r requirements.txt \
    && pip check 2>&1 | grep -v "requires opencv-python, which is not installed" \
       | grep -v "^No broken requirements" | (! grep .)

COPY app ./app
# Download + verify the ONNX models now, so the running service never needs
# network access (and the first request does not pay for a download).
RUN OCR_SKIP_WARMUP=1 python -c "from app.engine import Engine; Engine().warm_up()" \
    && useradd --system --uid 10001 ocr
USER ocr

EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --no-access-log"]
