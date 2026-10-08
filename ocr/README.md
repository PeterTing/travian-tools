# tt-ocr（P0-07 截圖辨識服務）

RapidOCR 3.9.2（PP-OCRv6 small，ONNX Runtime）包成一個很小的 FastAPI 服務，只做「圖 → 文字列＋位置」。
版面解析、低信心／待補判斷都在後端（`backend/app/parsers/rally_ocr.py`）。

- `GET /healthz` → `{status, engine}`
- `POST /v1/ocr?recheck=true`，body 是原始圖片（`image/png`／`image/jpeg`／`image/webp`，≤ 8 MB、≤ 20M 像素）
  → `{engine, width, height, elapsed_ms, timing_ms, lines: [{text, score, box: [x0,y0,x1,y1], recheck}]}`
  - `box` 是原圖像素；含數字且分數 < 0.95 的列會把原圖該處放大 2 倍重讀一次（`recheck`），
    後端用來判斷 `CROP_RECHECK_MISMATCH`
- 太大回 413 `{"detail": "image_too_large"}`：位元組超過上限，或圖檔表頭宣稱的像素超過上限。像素是**解碼前**用 Pillow
  只讀表頭判斷（防解壓縮炸彈：幾 KB 的 PNG 宣稱 30000×30000 會讓 `cv2.imdecode` 先吃掉好幾 GB）；
  `OPENCV_IO_MAX_IMAGE_PIXELS`（Dockerfile 設 20M）是第二道防線，`cv2.error` 也回 413。讀不了的圖回 400
- 不存圖、不寫硬碟、不連外（合規測試會檢查 `ocr/app` 沒有網路 import）；認證交給 Cloud Run IAM
  （部署時 `--no-allow-unauthenticated`，只有 tt-api 能呼叫）

為了快：偵測前把圖縮到約 1.3M 像素、不跑方向分類、跳過單一字的小框。RapidOCR 3.x 的
`use_det/use_cls/use_rec` 參數會「黏住」，所以 `engine.py` 直接呼叫 `text_det`／`text_rec`，版本鎖死在 3.9.2。

## 本機

```bash
cd ocr
python3.11 -m venv .venv
.venv/bin/pip install --no-deps -r requirements.txt   # opencv-python-headless 取代 opencv-python
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q

docker build -t tt-ocr .
docker run --rm --cpus 1 --memory 1g -p 18080:8080 tt-ocr
```

設定（環境變數）：`OCR_THREADS`（預設 1）、`OCR_MAX_DET_PIXELS`（1.3e6）、`OCR_RECHECK_BELOW`（0.95）、
`OCR_MAX_BYTES`（8 MB）、`OCR_MAX_PIXELS`（20M）。部署見 `docs/deploy-cloud-run.md`。
