# 部署到 Cloud Run（P0-12）

正式環境在 GCP 專案 **`artogo-travian-tools`**，region **`asia-east1`（台灣）**。
所有 gcloud 指令一律明確帶 `--project artogo-travian-tools`（本機 gcloud 的預設專案是別的正式專案，不能碰）。

## 網址

| 服務 | Cloud Run 服務名 | 網址 |
|---|---|---|
| 後端 API | `tt-api` | https://tt-api-138672009807.asia-east1.run.app （健康檢查 `/health`，API 在 `/api/v1`） |
| 工具網站（前端） | `tt-web` | https://tt-web-138672009807.asia-east1.run.app |

> 服務名刻意不含 `travian`：合規測試把網址裡有 `travian` 的 host 視為遊戲網域，擴充不能對它要權限。

擴充（`browser-extension/manifest.json`、`lib/config.js`）只指向上面兩個網址：
`host_permissions` 只有後端，`externally_connectable` / `TRUSTED_SITE_ORIGINS` 只有前端。
本機開發要讓擴充連本機（`localhost:8000`／`localhost:5174`）時，暫時改這兩個檔案即可，**不要 commit**。

## 資源

| 資源 | 名稱／規格 |
|---|---|
| Cloud SQL | `travian-tools-db`：MySQL 8.4、Enterprise、`db-f1-micro`、單區（asia-east1）、10 GB SSD（不自動長大）、每日自動備份留 7 份 |
| 資料庫／使用者 | `travian_tools` / `travian`（密碼只在 Secret Manager 的 `DATABASE_URL` 裡） |
| Secret Manager | `DATABASE_URL`、`JWT_SECRET_KEY`（建立時隨機產生，經 pipe 直接寫入 Secret Manager，沒有印出或存檔） |
| Artifact Registry | `asia-east1-docker.pkg.dev/artogo-travian-tools/travian-tools/{backend,frontend}:<commit>` |
| Service account | `travian-tools-run`（Cloud Run 執行：Cloud SQL client＋讀兩個 secret）、`travian-tools-build`（Cloud Build：寫 Artifact Registry）、`travian-tools-web`（前端，沒有任何權限） |
| Cloud Run Job | `travian-tools-migrate`：`alembic upgrade head && alembic check` |
| Cloud Run 服務 | `tt-api`（1 vCPU／512 MiB）、`tt-web`（nginx，1 vCPU／256 MiB）；兩個都 min-instances 0、max-instances 2、只在處理請求時計費 |

後端 CORS：網頁來源只有 `CORS_ORIGINS`（正式＝工具網站網址）；擴充只允許 `CORS_EXTENSION_IDS`
（預設是 manifest key 固定的 ID `nkgbmaokaapljaciiifbhgohlejmdcdn`），不再放行任意 `chrome-extension://`。
`allow_credentials=False`：前端和擴充都只用 `Authorization: Bearer`，不用 cookie。

正式環境（`DEBUG=false`）的後端設定守則：
- `JWT_SECRET_KEY` 必須設定、至少 32 字元；沒設或用程式內建的預設值，後端**拒絕啟動**（錯誤訊息不含 secret）。
  2026-10-06 檢查：從 Secret Manager 以 pipe 讀出 `JWT_SECRET_KEY`，只計算長度（64 字元）並比對不是預設值；值沒有印出、沒有存檔。
- `/docs`、`/redoc`、`/api/v1/openapi.json` 只在 `DEBUG=true` 時提供，正式環境回 404。
- `MAP_SQL_DAILY_FETCH_ENABLED=false`：見下面「已知限制」。

## gcloud configuration

部署腳本用專用的 gcloud configuration `travian-tools`（透過 `CLOUDSDK_ACTIVE_CONFIG_NAME`），
同時每個指令仍明確帶 `--project artogo-travian-tools`。**不要切換全域的 active configuration**
（其他 ARTOGO 工作依賴它）。第一次在新機器上建立：

```bash
gcloud config configurations create travian-tools --no-activate
gcloud config set --configuration=travian-tools account dainy@artogo.co
gcloud config set --configuration=travian-tools project artogo-travian-tools
gcloud config set --configuration=travian-tools run/region asia-east1
gcloud config set --configuration=travian-tools artifacts/location asia-east1
```

手動下指令時也用 `CLOUDSDK_ACTIVE_CONFIG_NAME=travian-tools gcloud ... --project artogo-travian-tools`。

## 部署步驟

```bash
scripts/deploy_cloud_run.sh build     # Cloud Build 建兩個 image（tag = HEAD 的短 SHA）
scripts/deploy_cloud_run.sh migrate   # 用 Cloud Run Job 跑 migration（先看下面的備份規則）
scripts/deploy_cloud_run.sh deploy    # 部署 tt-api 與 tt-web
```

- 前端的 API 網址在 build 時寫進 bundle（`frontend/Dockerfile` 的 `VITE_API_URL`）；nginx 不再轉送 `/api`。
- 後端容器在 Cloud Run 上設 `RUN_MIGRATIONS=false`，migration 只由 Job 跑，避免多個 instance 同時升級。
  本機 docker-compose 不設，仍然啟動時自動升級；`--reload` 只有 docker-compose 開發環境（`UVICORN_RELOAD=true`）才加。

## Migration 與備份

- **2026-10-06 第一次升級：全新空庫，無需備份。**（`travian_tools` 是新建的空資料庫，沒有任何資料。）
- 之後每次升級前：照 `backend/alembic/README_MIGRATIONS.md` 先備份。Cloud SQL 可以先手動做一次備份：
  `gcloud sql backups create --instance travian-tools-db --project artogo-travian-tools`
  需要 dump 到本機的話用 Cloud SQL Auth Proxy 連線後 `mysqldump`，**備份只留本機、不進 repo**。

## 截圖辨識 `tt-ocr`（P0-07，**尚未部署**，等審核核准）

| 項目 | 設定 |
|---|---|
| 服務 | `tt-ocr`（`ocr/`：RapidOCR 3.9.2 PP-OCRv6 small／ONNX，FastAPI；模型在 build 時放進 image） |
| 規格 | 1 vCPU、1 GiB、min-instances 0、max-instances 2、concurrency 1、timeout 60s、請求計費（`--cpu-throttling`） |
| 身分 | service account `travian-tools-ocr`（不給任何 role） |
| 存取 | `--no-allow-unauthenticated`；只有 `tt-api` 的 `travian-tools-run` 有 `roles/run.invoker`。tt-api 從 metadata server 拿 audience＝tt-ocr 網址的 ID token |
| 後端設定 | `tt-api` 加 `OCR_SERVICE_URL=https://tt-ocr-138672009807.asia-east1.run.app`（`OCR_AUTH` 預設 `id_token`）；沒設時截圖辨識回 503 `OCR_UNAVAILABLE` |
| 資料 | 圖片只在記憶體裡辨識，不寫硬碟、不存資料庫、不連外 |

部署（核准後，從 repo 根目錄）：

```bash
export CLOUDSDK_ACTIVE_CONFIG_NAME=travian-tools
gcloud iam service-accounts create travian-tools-ocr --project artogo-travian-tools \
  --display-name "tt-ocr runtime (no roles)"
scripts/deploy_cloud_run.sh build-ocr    # Cloud Build → .../travian-tools/ocr:<sha>
scripts/deploy_cloud_run.sh deploy-ocr   # gcloud run deploy tt-ocr ＋ invoker 給 tt-api
scripts/deploy_cloud_run.sh build && scripts/deploy_cloud_run.sh deploy   # tt-api（含 OCR_SERVICE_URL）＋ tt-web 新版
```

本機實測（`docker run --cpus 1 --memory 1g`，2026-10-06）：每張暖機 1.8–2.6 秒；冷啟動＝容器就緒約 4.1 秒＋第一張
2.0–2.9 秒（比平常多約 4 秒，另加 Cloud Run 拉 image 的時間）；記憶體高峰 421–458 MiB；image 515 MB（未壓縮）。

## 已知限制

- **每日 map.sql 抓取在正式環境關閉**（`MAP_SQL_DAILY_FETCH_ENABLED=false`）：排程（APScheduler）跑在
  後端 process 裡，min-instances 0 時沒有請求就沒有 instance 活著，04:15 UTC 的抓取只會偶爾碰巧觸發，
  所以乾脆明確關掉。要每天抓需要另外加 Cloud Scheduler（或 min-instances 1，費用較高）；目前先不加。
- **Cloud SQL 只有 10 GB、沒有開 storage auto-increase**：硬碟滿了資料庫會變成唯讀／寫入失敗。
  map.sql 快照（`map_snapshots`＋`map_villages`／`map_players`／`map_alliances`，每個世界每次匯入一份）是最會長大的資料，要定期看用量
  （Console 的 Cloud SQL 監控「Storage usage」，或
  `gcloud sql instances describe travian-tools-db --project artogo-travian-tools --format='value(settings.dataDiskSizeGb)'`
  搭配 Cloud Monitoring 的 `database/disk/bytes_used`）；接近 80% 時先清舊快照或手動加大硬碟（加大不能再縮回）。
- 共用核心的 `db-f1-micro` 不在 Cloud SQL SLA 保障內；流量變大再升級。

## 審核後套用的線上變更（P0-12 review，2026-10-06 幕僚長核准後套用）

1. `tt-api` 加上 `MAP_SQL_DAILY_FETCH_ENABLED=false`：只改環境變數，沿用同一個 image（revision `tt-api-00002-9w2`）
2. Cloud SQL `travian-tools-db`：開 deletion protection、`sslMode=ENCRYPTED_ONLY`（沒有用舊的 `--require-ssl`）。
   UPDATE 作業約 21 秒，log 裡沒看到引擎重啟；Cloud Run 透過 Cloud SQL connector／unix socket 連線，本來就是加密的，不受影響。
   **要刪 instance 前必須先 `--no-deletion-protection`。**
3. Artifact Registry `travian-tools`：cleanup policy 每個 package（backend、frontend）只留最新 **10** 版
   （`deploy/artifact-registry-cleanup-policy.json`，直接 `--no-dry-run` 啟用）；cleanup 約每天背景跑一次

## 費用估算（每月，USD）

| 項目 | 估算 |
|---|---|
| Cloud SQL db-f1-micro（$0.0105/小時 × 730） | 約 $7.7 |
| Cloud SQL 10 GB SSD＋備份 | 約 $2–4 |
| Cloud Run 兩個服務（請求計費，在免費額度內） | 約 $0 |
| Cloud Run `tt-ocr`（P0-07，未部署；每張約 2.5 vCPU 秒＋2.5 GiB 秒，每月 1,000 張仍在免費額度內） | 約 $0–1 |
| Artifact Registry（0.5 GB 免費）、Secret Manager、Cloud Build（每天 120 分鐘免費） | 約 $0–0.5 |
| **合計** | **約 $10–12** |

價格來源：https://cloud.google.com/sql/pricing 、https://cloud.google.com/run/pricing （2026-10 查詢）。
