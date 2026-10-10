# 部署到 Cloud Run（P0-12）

正式環境在 GCP 專案 **`artogo-travian-tools`**，region **`asia-east1`（台灣）**。
所有 gcloud 指令一律明確帶 `--project artogo-travian-tools`（本機 gcloud 的預設專案是別的正式專案，不能碰）。

## 網址

| 服務 | Cloud Run 服務名 | 網址 |
|---|---|---|
| 後端 API | `tt-api` | https://tt-api-138672009807.asia-east1.run.app （健康檢查 `/health`，API 在 `/api/v1`） |
| 工具網站（前端） | `tt-web` | https://tt-web-138672009807.asia-east1.run.app （自訂網域 https://tr.tingcloud.tw ，見下面「自訂網域」；兩個網址都可用） |

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

後端 CORS：網頁來源只有 `CORS_ORIGINS`（正式＝工具網站的 run.app 網址＋`https://tr.tingcloud.tw`）；擴充只允許 `CORS_EXTENSION_IDS`
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

## 截圖辨識 `tt-ocr`（P0-07，2026-10-09 已部署：`tt-ocr-00001-sf9`）

| 項目 | 設定 |
|---|---|
| 服務 | `tt-ocr`（`ocr/`：RapidOCR 3.9.2 PP-OCRv6 small／ONNX，FastAPI；模型在 build 時放進 image） |
| 規格 | 1 vCPU、1 GiB、min-instances 0、max-instances 2、concurrency 1、timeout 60s、請求計費（`--cpu-throttling`） |
| 身分 | service account `travian-tools-ocr`（不給任何 role） |
| 存取 | `--no-allow-unauthenticated`；只有 `tt-api` 的 `travian-tools-run` 有 `roles/run.invoker`。tt-api 從 metadata server 拿 audience＝tt-ocr 網址的 ID token |
| 後端設定 | `tt-api` 加 `OCR_SERVICE_URL=https://tt-ocr-138672009807.asia-east1.run.app`（`OCR_AUTH` 預設 `id_token`）；沒設時截圖辨識回 503 `OCR_UNAVAILABLE` |
| 資料 | 圖片只在記憶體裡辨識，不寫硬碟、不存資料庫、不連外 |
| 限制 | 每張 ≤ 8 MB、≤ 2000 萬像素（解碼前先讀表頭判斷，超過回 413；OpenCV 另設 `OPENCV_IO_MAX_IMAGE_PIXELS`）；tt-api 每人每分鐘 12 張（記憶體內計數，**每個 tt-api instance 各自計算**）、一次 4 張、整批總時限 50 秒（`OCR_TOTAL_DEADLINE_SECONDS`，要小於 tt-api 的 60 秒 timeout） |
| cpu-boost | 保持開啟（新版 gcloud 建新服務的預設；tt-api、tt-web 線上也開著）：冷啟動可少約 6–7 秒，只在啟動那幾秒多一點費用 |

部署（從 repo 根目錄；2026-10-09 第一次部署就是照這幾步）：

```bash
export CLOUDSDK_ACTIVE_CONFIG_NAME=travian-tools
gcloud iam service-accounts create travian-tools-ocr --project artogo-travian-tools \
  --display-name "tt-ocr runtime (no roles)"
scripts/deploy_cloud_run.sh build-ocr    # Cloud Build → .../travian-tools/ocr:<sha>
scripts/deploy_cloud_run.sh deploy-ocr   # gcloud run deploy tt-ocr ＋ invoker 給 tt-api
scripts/deploy_cloud_run.sh build && scripts/deploy_cloud_run.sh deploy   # tt-api（含 OCR_SERVICE_URL）＋ tt-web 新版
```

部署後驗證：

```bash
# 匿名呼叫 tt-ocr 要被擋：打根目錄 /，應該是 403
curl -s -o /dev/null -w '%{http_code}\n' https://tt-ocr-138672009807.asia-east1.run.app/
# tt-api 的健康檢查是 /health（不是 /healthz），應該是 200
curl -s -o /dev/null -w '%{http_code}\n' https://tt-api-138672009807.asia-east1.run.app/health
# tt-ocr 的 service account 在專案層級不能有任何 role（輸出要是空的）
gcloud projects get-iam-policy artogo-travian-tools --project artogo-travian-tools \
  --flatten='bindings[].members' --filter='bindings.members:travian-tools-ocr@' --format='value(bindings.role)'
```

> **不要用 `/healthz` 驗證匿名存取**：`*.run.app` 上 `/healthz` 是 Google 前端保留的路徑，不管有沒有帶身分都回
> Google 自己的 404 頁，請求根本不會進到容器，所以看不出 IAM 有沒有擋。`ocr/` 裡的 `GET /healthz` 只在本機或容器內部用得到。

上線實測（2026-10-09，正式 tt-web 390 寬）：冷啟動從按上傳到出結果 13.3 秒（容器起來約 2.6 秒＋載模型 5.1 秒＋辨識 3.6 秒），
暖機 4.2 秒（辨識 2.9 秒）。前端冷啟動文案因此寫「15 秒左右」。

本機實測（`docker run --cpus 1 --memory 1g`，2026-10-06）：每張暖機 1.8–2.6 秒；冷啟動＝容器就緒約 4.1 秒＋第一張
2.0–2.9 秒（比平常多約 4 秒，另加 Cloud Run 拉 image 的時間）；記憶體高峰 421–458 MiB；image 515 MB（未壓縮）。

## 自訂網域 `tr.tingcloud.tw`（tt-web）

用 Cloud Run 內建的 domain mapping（免費；**不開負載平衡器**，LB 每月約 US$18 起）。
`asia-east1` 在官方支援 domain mapping 的 region 清單內（https://cloud.google.com/run/docs/mapping-custom-domains ，2026-10-09 查詢；
`gcloud beta run domain-mappings list --region asia-east1` 可正常列出）。這個功能目前是 Preview，官方註明延遲較高、不建議用在重要正式服務；
本工具流量小，先接受，之後要換成 LB 或 Firebase Hosting 再評估。

- 只對應 `tt-web`。前端打 API 用 build 時寫入的 `VITE_API_URL`（tt-api 的 run.app 網址），所以 tt-web 不用重新 build；
  只要 tt-api 的 `CORS_ORIGINS` 同時放 run.app 原網址和 `https://tr.tingcloud.tw`（`scripts/deploy_cloud_run.sh` 已改）。
- 舊的 run.app 網址繼續可用。登入狀態存在瀏覽器的 localStorage，換網址要重新登入一次。
- 擴充 0.5.1 起，`tr.tingcloud.tw` 也能把登入憑證交給擴充（`externally_connectable`／`TRUSTED_SITE_ORIGINS`）；
  擴充的「在工具網站登入」連結先維持 run.app 網址，等新網域上線穩定再換。
- 前置：gcloud 帳號（`dainy@artogo.co`）必須是 `tingcloud.tw` 在 Search Console 的擁有者（`gcloud domains list-user-verified` 要列出它）。
- DNS 在 Cloudflare：`tr` 一筆 CNAME → `ghs.googlehosted.com`，**只用 DNS（灰雲）**；開代理（橘雲）Google 發不出憑證。
  最終要加的記錄以 `domain-mappings describe` 的 `resourceRecords` 為準。

```bash
export CLOUDSDK_ACTIVE_CONFIG_NAME=travian-tools
# 1) 確認網域已驗證（要列出 tingcloud.tw）
gcloud domains list-user-verified --project artogo-travian-tools
# 2) tt-api 的 CORS 加新網域（只改這一個變數，沿用同一個 image，會產生新 revision）
gcloud run services update tt-api --project artogo-travian-tools --region asia-east1 \
  --update-env-vars '^@^CORS_ORIGINS=https://tt-web-138672009807.asia-east1.run.app,https://tr.tingcloud.tw'
# 3) 建立 domain mapping，再讀出要加的 DNS 記錄
gcloud beta run domain-mappings create --service tt-web --domain tr.tingcloud.tw \
  --region asia-east1 --project artogo-travian-tools
gcloud beta run domain-mappings describe --domain tr.tingcloud.tw \
  --region asia-east1 --project artogo-travian-tools
```

上線後驗證：

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://tr.tingcloud.tw/            # 200
curl -sI https://tr.tingcloud.tw/ | head -1                                    # 憑證有效（curl 不報 SSL 錯）
curl -s -o /dev/null -D - -X OPTIONS https://tt-api-138672009807.asia-east1.run.app/api/v1/auth/login \
  -H 'Origin: https://tr.tingcloud.tw' -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Authorization,Content-Type' | grep -i access-control-allow-origin   # 回 https://tr.tingcloud.tw
curl -s -o /dev/null -w '%{http_code}\n' https://tt-web-138672009807.asia-east1.run.app/   # 舊網址仍 200
```

## map.sql 定時抓取（Cloud Run Job＋Cloud Scheduler，每 4 小時）

正式環境不靠 tt-api 裡的 APScheduler（min-instances 0 時沒有 instance 活著）。改成：

- **Cloud Run Job `tt-mapsql-fetch`**：跑 `python -m app.jobs.fetch_map_sql`，只抓
  `backend/app/services/map_sql_worlds.py` 列出的世界（目前 `asia-x1` = `https://rog.x1.asia.travian.com`、
  `eu12` = `https://ts12.x1.europe.travian.com`）。每個世界每次只發一個 `GET /map.sql`，不登入、不帶 cookie、
  不跟 redirect、不重試，逾時 60 秒。內容的 SHA-256 跟該世界最新一筆快照相同就不寫資料庫。
  有任何世界失敗時 exit 1（其他世界照抓）。job 不簽發登入憑證，所以不給 `JWT_SECRET_KEY`。
- **Cloud Scheduler `tt-mapsql-fetch-4h`**：`17 */4 * * *`（Asia/Taipei），用 OAuth 呼叫 Cloud Run Admin API
  的 `jobs/tt-mapsql-fetch:run`。
- 兩個專用 service account：
  - `travian-tools-mapsql`（job 執行身分）：只有 `travian-tools-db` 的 `roles/cloudsql.client`（IAM 條件限定這個 instance）
    和 `DATABASE_URL` 這一個 secret 的 `secretAccessor`。
  - `travian-tools-scheduler`（Scheduler 呼叫身分）：只有 `tt-mapsql-fetch` 這個 job 的 `roles/run.invoker`。

前置：這個功能依賴 P0-25（#39，migration `0009_multi_tribe`），要等 #39 先合併。合併進 main 之後，先 `scripts/deploy_cloud_run.sh build`（產生新的 backend image）和
`scripts/deploy_cloud_run.sh migrate`（`0010_mapsql_content_sha256`：`map_snapshots.content_sha256` 欄位＋索引；
舊版 tt-api 不讀這個欄位，不受影響）。下面的 `TAG` 是那次 build 的 short SHA。

```bash
export CLOUDSDK_ACTIVE_CONFIG_NAME=travian-tools
PROJECT=artogo-travian-tools
REGION=asia-east1
TAG=<合併後 build 的 short SHA>
IMAGE=${REGION}-docker.pkg.dev/${PROJECT}/travian-tools/backend:${TAG}
JOB_SA=travian-tools-mapsql@${PROJECT}.iam.gserviceaccount.com
SCHED_SA=travian-tools-scheduler@${PROJECT}.iam.gserviceaccount.com

# 0) Cloud Scheduler API（2026-10-11 查過：尚未啟用）
gcloud services enable cloudscheduler.googleapis.com --project ${PROJECT}

# 1) service accounts
gcloud iam service-accounts create travian-tools-mapsql --project ${PROJECT} \
  --display-name "tt-mapsql-fetch job (map.sql every 4h)"
gcloud iam service-accounts create travian-tools-scheduler --project ${PROJECT} \
  --display-name "Cloud Scheduler -> tt-mapsql-fetch"

# 2) job SA：Cloud SQL client（只限 travian-tools-db）＋只讀 DATABASE_URL
gcloud projects add-iam-policy-binding ${PROJECT} \
  --member "serviceAccount:${JOB_SA}" --role roles/cloudsql.client \
  --condition 'title=only-travian-tools-db,expression=resource.name == "projects/artogo-travian-tools/instances/travian-tools-db" && resource.service == "sqladmin.googleapis.com"'
gcloud secrets add-iam-policy-binding DATABASE_URL --project ${PROJECT} \
  --member "serviceAccount:${JOB_SA}" --role roles/secretmanager.secretAccessor

# 3) Cloud Run Job（不會自己跑；沒有 min-instances 的概念，閒置不計費）
gcloud run jobs deploy tt-mapsql-fetch --project ${PROJECT} --region ${REGION} \
  --image ${IMAGE} \
  --service-account ${JOB_SA} \
  --set-cloudsql-instances ${PROJECT}:${REGION}:travian-tools-db \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --set-env-vars "^@^DEBUG=false@MAP_SQL_WORLDS=asia-x1,eu12" \
  --command python --args=-m,app.jobs.fetch_map_sql \
  --tasks 1 --parallelism 1 --max-retries 0 --task-timeout 900s \
  --cpu 1 --memory 1Gi

# 4) 先手動跑一次確認（第一次會寫入兩個世界各一份快照）
gcloud run jobs execute tt-mapsql-fetch --project ${PROJECT} --region ${REGION} --wait

# 5) Scheduler SA 只能啟動這個 job
gcloud run jobs add-iam-policy-binding tt-mapsql-fetch --project ${PROJECT} --region ${REGION} \
  --member "serviceAccount:${SCHED_SA}" --role roles/run.invoker

# 6) 每 4 小時（台北時間 00:17、04:17、08:17、12:17、16:17、20:17）
gcloud scheduler jobs create http tt-mapsql-fetch-4h --project ${PROJECT} --location ${REGION} \
  --schedule "17 */4 * * *" --time-zone "Asia/Taipei" \
  --http-method POST \
  --uri "https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/jobs/tt-mapsql-fetch:run" \
  --oauth-service-account-email ${SCHED_SA} \
  --oauth-token-scope https://www.googleapis.com/auth/cloud-platform \
  --max-retry-attempts 0 --attempt-deadline 180s
```

確認：

```bash
gcloud scheduler jobs describe tt-mapsql-fetch-4h --project ${PROJECT} --location ${REGION} --format='value(state,schedule,timeZone)'
gcloud run jobs executions list --job tt-mapsql-fetch --project ${PROJECT} --region ${REGION} --limit 5
gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="tt-mapsql-fetch" AND textPayload:"map_sql_fetch_done"' \
  --project ${PROJECT} --limit 5 --format='value(timestamp,textPayload)'
```

停用／回復（由輕到重）：

```bash
# 暫停（保留設定，隨時 resume）
gcloud scheduler jobs pause tt-mapsql-fetch-4h --project ${PROJECT} --location ${REGION}
gcloud scheduler jobs resume tt-mapsql-fetch-4h --project ${PROJECT} --location ${REGION}

# 整個拿掉
gcloud scheduler jobs delete tt-mapsql-fetch-4h --project ${PROJECT} --location ${REGION} --quiet
gcloud run jobs remove-iam-policy-binding tt-mapsql-fetch --project ${PROJECT} --region ${REGION} \
  --member "serviceAccount:${SCHED_SA}" --role roles/run.invoker
gcloud run jobs delete tt-mapsql-fetch --project ${PROJECT} --region ${REGION} --quiet
gcloud secrets remove-iam-policy-binding DATABASE_URL --project ${PROJECT} \
  --member "serviceAccount:${JOB_SA}" --role roles/secretmanager.secretAccessor
gcloud projects remove-iam-policy-binding ${PROJECT} \
  --member "serviceAccount:${JOB_SA}" --role roles/cloudsql.client --all
gcloud iam service-accounts delete ${JOB_SA} --project ${PROJECT} --quiet
gcloud iam service-accounts delete ${SCHED_SA} --project ${PROJECT} --quiet
# （選擇性）沒有其他 Scheduler job 時再停 API
gcloud services disable cloudscheduler.googleapis.com --project ${PROJECT}
```

**快照全部保留，不自動刪除（Peter 決定，2026-10-11）。** 估算每月約 0.4 GB（兩個世界每天各換一次內容），
最壞每月約 2.4 GB（每 4 小時都換）；Cloud SQL 只有 10 GB 且沒開 storage auto-increase。
待幕僚長決定：開 auto-increase（可設上限），或在硬碟用量 70% 時發警報。

資料：job 寫進的是現有的 `map_snapshots`／`map_villages`／`map_players`／`map_alliances`（＋差異表）。
要清掉這兩個世界的快照要另外核准，刪 `map_snapshots` 會連帶刪掉子表（FK `ON DELETE CASCADE`）。
欄位本身可用 `alembic downgrade 0009_multi_tribe` 拿掉（要先部署不含這個欄位的 tt-api）。

## 已知限制

- **每日 map.sql 抓取在正式環境關閉**（`MAP_SQL_DAILY_FETCH_ENABLED=false`）：排程（APScheduler）跑在
  後端 process 裡，min-instances 0 時沒有請求就沒有 instance 活著，04:15 UTC 的抓取只會偶爾碰巧觸發，
  所以乾脆明確關掉。正式環境改用上面的「map.sql 定時抓取」（Cloud Run Job＋Cloud Scheduler）。
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
