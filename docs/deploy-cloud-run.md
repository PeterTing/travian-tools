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
| Secret Manager | `DATABASE_URL`、`JWT_SECRET_KEY`（隨機產生後直接寫入，沒有人看過值） |
| Artifact Registry | `asia-east1-docker.pkg.dev/artogo-travian-tools/travian-tools/{backend,frontend}:<commit>` |
| Service account | `travian-tools-run`（Cloud Run 執行：Cloud SQL client＋讀兩個 secret）、`travian-tools-build`（Cloud Build：寫 Artifact Registry）、`travian-tools-web`（前端，沒有任何權限） |
| Cloud Run Job | `travian-tools-migrate`：`alembic upgrade head && alembic check` |
| Cloud Run 服務 | `tt-api`（1 vCPU／512 MiB）、`tt-web`（nginx，1 vCPU／256 MiB）；兩個都 min-instances 0、max-instances 2、只在處理請求時計費 |

後端 CORS：網頁來源只有 `CORS_ORIGINS`（正式＝工具網站網址）；擴充只允許 `CORS_EXTENSION_IDS`
（預設是 manifest key 固定的 ID `nkgbmaokaapljaciiifbhgohlejmdcdn`），不再放行任意 `chrome-extension://`。

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

## 已知限制

- **每日 map.sql 抓取不會可靠執行**：排程（APScheduler）跑在後端 process 裡，min-instances 0 時
  沒有請求就沒有 instance 活著，04:15 UTC 的抓取不會觸發。要可靠執行需要另外加 Cloud Scheduler
  （或 min-instances 1，費用較高）；目前先不加。
- 共用核心的 `db-f1-micro` 不在 Cloud SQL SLA 保障內；流量變大再升級。

## 費用估算（每月，USD）

| 項目 | 估算 |
|---|---|
| Cloud SQL db-f1-micro（$0.0105/小時 × 730） | 約 $7.7 |
| Cloud SQL 10 GB SSD＋備份 | 約 $2–4 |
| Cloud Run 兩個服務（請求計費，在免費額度內） | 約 $0 |
| Artifact Registry（0.5 GB 免費）、Secret Manager、Cloud Build（每天 120 分鐘免費） | 約 $0–0.5 |
| **合計** | **約 $10–12** |

價格來源：https://cloud.google.com/sql/pricing 、https://cloud.google.com/run/pricing （2026-10 查詢）。
