> **已封存（2026-10-05）**：本文件是 v1 的歷史版本，內容含已移除的自動化、自動登入、AI 顧問與半自動執行功能，部分公式也已證實有誤。現行規格請看 [`docs/PRD.md`](../PRD.md) 與 [`docs/TICKETS.md`](../TICKETS.md)。

# Tickets 追蹤

> Travian: Legends 助手系統 - 開發任務追蹤
>
> **⚠️ 2026-10 P0 範圍調整（PR #1）：** 瀏覽器自動化／自動登入、執行佇列、自動升級、
> keep-alive、資源運輸、背景自動同步、儲存 Travian 帳密與 AI 顧問已全部移除，本文件中相關段落已過時，
> 待 PM 改寫。目前唯一連線 Travian 的功能是每日固定時間抓取公開 `map.sql`（預設開啟、不帶憑證）；
> 擴充功能只在使用者點擊時讀取目前分頁。

## 文件資訊

| 項目 | 內容 |
| ---- | ---- |
| 建立日期 | 2026-01-22 |
| 相關 PRD | [PRD.md](./PRD.md) |
| 技術規格 | [PROJECT-REQUIREMENTS.md](./PROJECT-REQUIREMENTS.md) |

---

## 實作參考說明

> ⚠️ **開發者注意**: 每個 Ticket 的實作細節請參考以下文件：
>
> - **PRD.md** - 功能需求與驗收標準（章節 7.1 包含核心計算公式）
> - **PROJECT-REQUIREMENTS.md** - 完整技術規格，包含：
>   - 數據結構定義（第二章）
>   - 計算公式詳細說明（第六章）
>   - API 端點設計（11.4 節）
>   - 資料庫 Schema 設計（11.3 節）

---

## 進度總覽

| Phase | 名稱 | 狀態 | 完成 |
| ----- | ---- | ---- | ---- |
| Phase 0 | 專案準備 | ✅ 完成 | 3/3 |
| Phase 1 | 核心數據 + 基礎計算器 | ✅ 完成 | 12/12 |
| Phase 2 | 數據抓取 + 用戶系統 | ✅ 完成 | 8/8 |
| Phase 3 | AI 策略引擎 | ✅ 完成 | 6/6 |
| Phase 4 | 半自動執行 | ✅ 完成 | 5/5 |
| Phase 5 | 進階功能 | ⚪ 未開始 | 0/6 |

**總計**: 34/40 Tickets 完成

---

## Phase 0: 專案準備

### TICKET-001: 專案架構設計 ✅

**類型**: Backend + Frontend

**狀態**: ✅ 完成

**描述**: 建立專案基礎架構，包含前後端專案結構、開發環境設定

**驗收條件**:

- [x] 建立 Python FastAPI 後端專案結構
- [x] 建立 React + shadcn/ui 前端專案結構
- [x] 配置 pnpm workspace（如需 monorepo）
- [x] 建立 Docker Compose 開發環境
- [x] 建立基本的 CI/CD 配置

**相關 PRD**: 4.1 技術棧

**技術規格參考**: PROJECT-REQUIREMENTS.md 第七章（系統架構）

**完成日期**: 2026-01-23

**實作摘要**:

- 後端: Clean Architecture (domain/infrastructure/api/services)
- 前端: React 18 + Vite + shadcn/ui + Tailwind CSS
- CI/CD: GitHub Actions (lint, test, build, deploy)
- Docker: MySQL 8.0 + FastAPI + React (dev/prod configs)

---

### TICKET-002: 資料庫 Schema 設計 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 設計並實作 MySQL 資料庫 Schema

**驗收條件**:

- [x] 設計用戶資料表 (users)
- [x] 設計遊戲帳號資料表 (game_accounts)
- [x] 設計村莊資料表 (villages)
- [x] 設計建築實例資料表 (building_instances)
- [x] 設計部隊實例資料表 (troop_instances)
- [x] 設計戰鬥報告資料表 (battle_reports)
- [x] 建立 SQLAlchemy ORM Models
- [x] 建立資料庫遷移腳本

**相關 PRD**: 4.1 技術棧

**技術規格參考**: PROJECT-REQUIREMENTS.md 11.3 節（資料庫設計）

**完成日期**: 2026-01-23

**實作摘要**:

- ORM Models: User, GameAccount, Village, BuildingInstance, TroopInstance, BattleReport
- Enums: TribeType (7 種族), VillageRole, VillageType, TroopLocation, ReportType, BattleResult
- Alembic migration: 001_create_initial_tables.py
- 單元測試: 19 tests, 82% coverage
- 檔案位置: `backend/app/infrastructure/database/models/`

---

### TICKET-003: 靜態數據 JSON Schema 設計 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 設計遊戲靜態數據的 JSON Schema 結構

**驗收條件**:

- [x] 設計建築數據 Schema (buildings.json)
- [x] 設計兵種數據 Schema (troops.json)
- [x] 設計資源田數據 Schema (resources.json)
- [x] 設計綠洲數據 Schema (oases.json)
- [x] 設計神器數據 Schema (artefacts.json)
- [x] 建立 JSON Schema 驗證工具

**相關 PRD**: F1. 遊戲數據庫系統

**技術規格參考**: PROJECT-REQUIREMENTS.md 第二章（核心數據結構）

**完成日期**: 2026-01-23

**實作摘要**:

- Pydantic Schemas: Building, Troop, ResourceField, Oasis, Artefact
- 驗證工具: GameDataService (惰性載入、驗證、重載)
- 範例數據: buildings.json, troops.json, resources.json, oases.json, artefacts.json
- 單元測試: 31 tests, 88% coverage
- 檔案位置: `backend/app/domain/schemas/game_data/`

---

## Phase 1: 核心數據 + 基礎計算器

### TICKET-101: 建築數據收集與整理 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 收集並整理所有建築 1-20 級的完整數據

**驗收條件**:

- [x] 收集 40+ 種建築的基礎資訊（名稱、類別、前置需求）
- [x] 收集每種建築 1-20 級的成本數據（木/磚/鐵/糧）
- [x] 收集每種建築 1-20 級的建造時間
- [x] 收集每種建築 1-20 級的效果數值
- [x] 收集文化點數據
- [x] 整理成 buildings.json 格式
- [x] 與 Travian Fandom Wiki 交叉驗證 10+ 種建築

**相關 PRD**: F1.1 建築數據查詢

**技術規格參考**: PROJECT-REQUIREMENTS.md 2.1 節（建築數據）

**完成日期**: 2026-01-23

**實作摘要**:

- 收集 40 種建築完整數據（含種族特定城牆、大兵營/馬廄等）
- 每種建築包含 1-20 級完整數據
- 數據包含：成本、建造時間、人口、文化點、效果數值
- 已與 Travian Fandom Wiki 交叉驗證（Main Building, Barracks, Warehouse, Granary, Stable, Marketplace, Academy, Cranny, City Wall, Woodcutter 等 10+ 種）
- 檔案位置：`backend/data/static/buildings.json`

---

### TICKET-102: 兵種數據收集與整理 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 收集並整理 7 個種族所有兵種的完整數據

**驗收條件**:

- [x] 收集羅馬（Romans）全部兵種數據
- [x] 收集高盧（Gauls）全部兵種數據
- [x] 收集條頓（Teutons）全部兵種數據
- [x] 收集匈奴（Huns）全部兵種數據
- [x] 收集埃及（Egyptians）全部兵種數據
- [x] 收集維京（Vikings）全部兵種數據
- [x] 收集斯巴達（Spartans）全部兵種數據
- [x] 數據包含：攻防值、速度、成本、糧耗、訓練時間
- [x] 整理成 troops.json 格式
- [x] 與官方資料交叉驗證

**相關 PRD**: F1.2 兵種數據查詢

**技術規格參考**: PROJECT-REQUIREMENTS.md 2.2 節（兵種數據）

**完成日期**: 2026-01-23

**實作摘要**:

- 收集 7 種族共 70 種兵種完整數據
- 每種族 10 種兵種（步兵、騎兵、偵查、攻城、特殊、移民）
- 數據包含：攻擊力、步兵/騎兵防禦、速度、運載量、成本（木/磚/鐵/糧）、糧耗、訓練時間、訓練建築、研究院等級需求
- 已與 Travian Fandom Wiki、官方支援站交叉驗證
- 檔案位置：`backend/data/static/troops.json`

---

### TICKET-103: 資源田數據收集與整理 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 收集並整理資源田 0-20+ 級的完整數據

**驗收條件**:

- [x] 收集 4 種資源田（木/磚/鐵/糧）0-20 級數據
- [x] 收集首都資源田 10-20 級數據
- [x] 數據包含：產量、升級成本、人口、文化點
- [x] 計算 ROI（回本時間）
- [x] 整理成 resources.json 格式
- [x] 與遊戲實際數據驗證

**相關 PRD**: F1.3 資源田數據查詢

**技術規格參考**: PROJECT-REQUIREMENTS.md 2.3 節（資源田數據）

**完成日期**: 2026-01-23

**實作摘要**:

- 收集 4 種資源田（伐木場、黏土坑、鐵礦場、農田）完整數據
- 每種資源田包含 Level 0-20 共 21 級數據
- 數據包含：產量、四種資源升級成本、建造時間、人口、文化點
- ROI 計算已整合到 ResourceField.calculate_roi() 方法
- 已與 Travian Fandom Wiki 交叉驗證
- 檔案位置：`backend/data/static/resources.json`

---

### TICKET-104: 建築數據查詢 API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作建築數據查詢 REST API

**驗收條件**:

- [x] `GET /api/v1/buildings` - 取得所有建築列表
- [x] `GET /api/v1/buildings/{building_id}` - 取得單一建築資料
- [x] `GET /api/v1/buildings/{building_id}/levels/{level}` - 取得特定等級資料
- [x] 支援中英文名稱查詢
- [x] 回應時間 < 200ms
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F1.1 建築數據查詢

**技術規格參考**: PROJECT-REQUIREMENTS.md 11.4 節（API 端點設計）

**依賴**: TICKET-101

**完成日期**: 2026-01-23

**實作摘要**:

- 實作 4 個 API 端點：建築列表、建築詳情、等級資料、升級成本計算
- 支援依類別篩選（category query parameter）
- 支援中英文名稱搜尋（search query parameter）
- 回應時間 < 200ms（測試驗證通過）
- 15 個單元測試，覆蓋率 97%
- 檔案位置：`backend/app/api/v1/endpoints/buildings.py`

---

### TICKET-105: 兵種數據查詢 API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作兵種數據查詢 REST API

**驗收條件**:

- [x] `GET /api/v1/troops` - 取得所有兵種列表
- [x] `GET /api/v1/troops/{tribe}` - 取得特定種族兵種
- [x] `GET /api/v1/troops/{tribe}/{troop_id}` - 取得單一兵種資料
- [x] `GET /api/v1/troops/compare` - 兵種比較功能
- [x] 支援性價比計算欄位
- [x] 回應時間 < 200ms
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F1.2 兵種數據查詢

**技術規格參考**: PROJECT-REQUIREMENTS.md 11.4 節（API 端點設計）

**依賴**: TICKET-102

**完成日期**: 2026-01-23

**實作摘要**:

- 實作 4 個 API 端點：兵種列表、種族兵種、兵種詳情、兵種比較
- 支援依種族/類型篩選（tribe, category query parameters）
- 支援中英文名稱搜尋（search query parameter）
- 兵種比較功能（2-10 個兵種比較，含最佳攻擊/防禦/速度/效率摘要）
- 性價比計算欄位：attack_per_crop, defense_per_crop, attack_per_cost
- 回應時間 < 200ms（測試驗證通過）
- 18 個單元測試，覆蓋率 98%
- 檔案位置：`backend/app/api/v1/endpoints/troops.py`

---

### TICKET-106: 資源田數據查詢 API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作資源田數據查詢 REST API

**驗收條件**:

- [x] `GET /api/v1/resources` - 取得所有資源田數據
- [x] `GET /api/v1/resources/{type}` - 取得特定資源類型
- [x] `GET /api/v1/resources/{type}/levels/{level}` - 取得特定等級
- [x] 包含 ROI 計算欄位
- [x] 回應時間 < 200ms
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F1.3 資源田數據查詢

**技術規格參考**: PROJECT-REQUIREMENTS.md 11.4 節（API 端點設計）

**依賴**: TICKET-103

**完成日期**: 2026-01-23

**實作摘要**:

- 實作 4 個 API 端點：資源田列表、資源田詳情、等級資料、ROI 分析
- 包含 ROI 計算功能（回本時間分析）
- 回應時間 < 200ms
- 單元測試覆蓋率 > 80%
- 檔案位置：`backend/app/api/v1/endpoints/resources.py`

---

### TICKET-107: 建築升級計算器 API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作建築升級成本計算 API

**驗收條件**:

- [x] `POST /api/v1/calculator/building/upgrade` 端點
- [x] 輸入：建築名稱、起始等級、目標等級、本部等級
- [x] 輸出：總成本、總時間、文化點、人口增加
- [x] 計算結果與遊戲實際誤差 < 1%
- [x] 支援建造時間加成計算（本部等級）
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F2.1 建築升級計算器

**技術規格參考**: PROJECT-REQUIREMENTS.md 6.1 節（建築計算器）

**依賴**: TICKET-101, TICKET-104

**完成日期**: 2026-01-23

**實作摘要**:

- 實作建築升級計算端點
- 支援本部等級建造時間加成、伺服器倍率
- 輸出詳細成本、時間、文化點、人口數據
- 檔案位置：`backend/app/api/v1/endpoints/calculator.py`

---

### TICKET-108: 資源田 ROI 計算器 API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作資源田 ROI 計算 API

**驗收條件**:

- [x] `POST /api/v1/calculator/resource/roi` 端點
- [x] 輸入：資源類型、當前等級、綠洲加成、建築加成
- [x] 輸出：升級成本、產量增加、回本時間、ROI 排序建議
- [x] 支援批量計算（所有資源田）
- [x] 提供最佳升級順序建議
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F2.2 資源田 ROI 計算器

**技術規格參考**: PROJECT-REQUIREMENTS.md 6.2 節（資源計算器）

**依賴**: TICKET-103, TICKET-106

**完成日期**: 2026-01-23

**實作摘要**:

- 實作 ROI 計算端點
- 支援綠洲加成計算
- 提供最佳升級順序排名
- 檔案位置：`backend/app/api/v1/endpoints/calculator.py`

---

### TICKET-109: 戰鬥模擬器 API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作戰鬥模擬計算 API

**驗收條件**:

- [x] `POST /api/v1/calculator/battle/simulate` 端點
- [x] 輸入：攻守雙方部隊組成、城牆等級
- [x] 輸出：勝負結果、雙方損失、資源掠奪量
- [x] 支援野獸戰鬥模擬
- [x] 城牆防禦加成計算正確
- [x] 模擬結果與實際戰鬥誤差 < 5%
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F2.3 戰鬥模擬器

**技術規格參考**: PROJECT-REQUIREMENTS.md 6.3.4 節（戰鬥模擬器）

**依賴**: TICKET-102, TICKET-105

**完成日期**: 2026-01-23

**實作摘要**:

- 實作戰鬥模擬端點
- 支援城牆防禦加成、士氣計算
- 輸出勝負結果、雙方損失、戰鬥點數
- 檔案位置：`backend/app/api/v1/endpoints/calculator.py`

---

### TICKET-110: 糧食平衡計算器 API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作糧食平衡計算 API

**驗收條件**:

- [x] `POST /api/v1/calculator/crop/balance` 端點
- [x] 輸入：村莊建築配置、部隊組成
- [x] 輸出：人口糧耗、部隊糧耗、結餘/赤字、危機預警
- [x] 提供平衡建議
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F2.4 人口與糧食平衡計算器

**技術規格參考**: PROJECT-REQUIREMENTS.md 6.5.2 節（人口與糧食平衡計算器）

**依賴**: TICKET-101, TICKET-102

**完成日期**: 2026-01-23

**實作摘要**:

- 實作糧食平衡計算端點
- 支援綠洲加成、建築人口、部隊糧耗計算
- 提供狀態判斷（盈餘/平衡/赤字/危急）和建議
- 檔案位置：`backend/app/api/v1/endpoints/calculator.py`

---

### TICKET-111: 數據查詢前端頁面 ✅

**類型**: Frontend

**狀態**: ✅ 完成

**設計稿**:

- [database-buildings.md](../designs/pages/database-buildings.md)
- [database-troops.md](../designs/pages/database-troops.md)
- [database-resources.md](../designs/pages/database-resources.md)

**描述**: 實作遊戲數據查詢的前端介面

**驗收條件**:

- [x] 建築數據查詢頁面
- [x] 兵種數據查詢頁面
- [x] 資源田數據查詢頁面
- [x] 支援搜尋與篩選
- [x] 響應式設計（桌面/平板/手機）
- [x] 載入狀態與錯誤處理

**相關 PRD**: F1. 遊戲數據庫系統

**技術規格參考**: PROJECT-REQUIREMENTS.md 第十章（用戶介面需求）

**依賴**: TICKET-104, TICKET-105, TICKET-106

**完成日期**: 2026-01-23

**實作摘要**:

- 建築數據頁面：列表、詳情、等級表格、前置需求、效果欄位
- 兵種數據頁面：種族/類型篩選、詳情、性價比分析
- 資源田數據頁面：等級表格、ROI 分析
- 支援中英文 i18n、響應式設計
- 檔案位置：`frontend/src/pages/database/`

---

### TICKET-112: 計算器前端頁面 ✅

**類型**: Frontend

**狀態**: ✅ 完成

**設計稿**:

- [calculator-building.md](../designs/pages/calculator-building.md)
- [calculator-roi.md](../designs/pages/calculator-roi.md)
- [calculator-battle.md](../designs/pages/calculator-battle.md)
- [calculator-crop.md](../designs/pages/calculator-crop.md)

**描述**: 實作計算器的前端介面

**驗收條件**:

- [x] 建築升級計算器頁面
- [x] 資源田 ROI 計算器頁面
- [x] 戰鬥模擬器頁面
- [x] 糧食平衡計算器頁面
- [x] 輸入表單驗證
- [x] 計算結果視覺化呈現
- [x] 支援複製/儲存結果

**相關 PRD**: F2. 計算器系統

**技術規格參考**: PROJECT-REQUIREMENTS.md 10.2.2 節（計算工具介面）

**依賴**: TICKET-107, TICKET-108, TICKET-109, TICKET-110

**完成日期**: 2026-01-23

**實作摘要**:

- 建築升級計算器：選擇建築、等級範圍、本部等級、伺服器倍率
- ROI 計算器：資源田設定、綠洲加成、最佳升級順序
- 戰鬥模擬器：攻守雙方部隊配置、城牆等級、勝負結果
- 糧食平衡計算器：農田產量、建築配置、部隊組成、平衡分析
- 支援中英文 i18n、響應式設計
- 檔案位置：`frontend/src/pages/calculator/`

---

## Phase 2: 數據抓取 + 用戶系統

### TICKET-201: 用戶註冊/登入系統 ✅

**類型**: Full-Stack

**狀態**: ✅ 完成

**設計稿**:

- [auth-login.md](../designs/pages/auth-login.md)
- [auth-register.md](../designs/pages/auth-register.md)

**描述**: 實作用戶認證系統

**驗收條件**:

- [x] `POST /api/v1/auth/register` 註冊端點
- [x] `POST /api/v1/auth/login` 登入端點
- [x] JWT Token 認證機制
- [x] 密碼加密儲存 (bcrypt)
- [x] 註冊/登入前端頁面
- [x] 表單驗證
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F4. 數據抓取系統

**技術規格參考**: PROJECT-REQUIREMENTS.md 11.3 節（資料庫設計 - users 表）

**完成日期**: 2026-01-24

**實作摘要**:

- 後端 Auth API: register, login, refresh, me, logout 五個端點
- JWT Token 認證: pyjwt + bcrypt 密碼雜湊
- 前端頁面: LoginPage, RegisterPage（含表單驗證）
- AuthContext: React Context 管理認證狀態
- Axios Interceptor: 自動 Token 刷新
- 依賴注入: CurrentUser, OptionalUser 類型別名
- Docker: 自動執行 alembic migration
- 單元測試: 178 tests, 92% coverage

---

### TICKET-202: 遊戲帳號管理 ✅

**類型**: Full-Stack

**狀態**: ✅ 完成

**設計稿**:

- [game-accounts.md](../designs/pages/game-accounts.md)

**描述**: 實作 Travian 遊戲帳號管理功能

**驗收條件**:

- [x] `POST /api/v1/game-accounts` 新增遊戲帳號
- [x] `GET /api/v1/game-accounts` 取得用戶的遊戲帳號列表
- [x] `PUT /api/v1/game-accounts/{id}` 更新遊戲帳號
- [x] `DELETE /api/v1/game-accounts/{id}` 刪除遊戲帳號
- [x] 遊戲帳號管理前端頁面
- [x] 支援多伺服器帳號

**相關 PRD**: F4. 數據抓取系統

**技術規格參考**: PROJECT-REQUIREMENTS.md 11.3 節（資料庫設計 - game_accounts 表）

**依賴**: TICKET-201

**完成日期**: 2026-01-24

**實作摘要**:

- 後端 API: CRUD 四個端點，支援多伺服器帳號
- Pydantic Schemas: GameAccountCreate, GameAccountUpdate, GameAccountResponse
- 前端頁面: GameAccountsPage（列表、新增、編輯、刪除）
- 單元測試: 12 tests

---

### TICKET-203: 村莊數據 CRUD API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作村莊數據管理 API

**驗收條件**:

- [x] `POST /api/v1/villages` 新增村莊
- [x] `GET /api/v1/villages` 取得村莊列表
- [x] `GET /api/v1/villages/{id}` 取得村莊詳情
- [x] `PUT /api/v1/villages/{id}` 更新村莊
- [x] 包含建築、部隊、資源等子資源
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F4.1 村莊數據自動抓取

**技術規格參考**: PROJECT-REQUIREMENTS.md 11.3 節（資料庫設計）

**依賴**: TICKET-202

**完成日期**: 2026-01-24

**實作摘要**:

- 後端 API: 6 個端點（CRUD + 建築/部隊子資源）
- Pydantic Schemas: Village, VillageDetail, BuildingInstance, TroopInstance
- VillageService: 完整 CRUD 操作
- 單元測試: 16 tests, 92% coverage

---

### TICKET-204: Browser MCP 整合研究 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 研究並設計 Browser MCP 整合方案

**驗收條件**:

- [x] 研究 Travian 頁面結構
- [x] 設計抓取流程
- [x] 建立 POC (Proof of Concept)
- [x] 撰寫技術文件
- [x] 評估風險與限制

**相關 PRD**: F4.1 村莊數據自動抓取

**技術規格參考**: PROJECT-REQUIREMENTS.md 第五章（數據抓取功能）

**完成日期**: 2026-01-24

**實作摘要**:

- 技術文件: `docs/research/browser-mcp-integration.md`
- 研究 Travian 頁面結構和 JavaScript API
- 設計抓取流程和資料轉換規則
- 評估風險：反爬蟲、登入狀態、頁面變化

---

### TICKET-205: 村莊數據抓取實作 ✅

**類型**: Backend + Browser Extension

**狀態**: ✅ 完成

**描述**: 實作村莊數據自動抓取功能

**驗收條件**:

- [x] 抓取村莊列表（名稱、座標、人口）
- [x] 抓取資源現況與產量
- [x] 抓取建築清單與等級
- [x] 抓取部隊數量
- [x] 數據準確率 > 95%
- [x] 錯誤處理與重試機制

**相關 PRD**: F4.1 村莊數據自動抓取

**技術規格參考**: PROJECT-REQUIREMENTS.md 5.1 節（Browser MCP 抓取）

**依賴**: TICKET-204

**完成日期**: 2026-01-25

**實作摘要**:

- 後端 API: `POST /api/v1/sync/village-overview`, `POST /api/v1/sync/village-center` 同步端點
- SyncService: 村莊、建築、部隊同步邏輯
- Pydantic Schemas: VillageOverviewSync, VillageCenterSync, TroopSync
- 瀏覽器擴展: Chrome/Firefox 兼容，支援 dorf1.php 和 dorf2.php 頁面抓取
- 檔案位置: `browser-extension/` 目錄
- 錯誤處理: 驗證失敗、資料庫錯誤
- 單元測試: 7 tests

---

### TICKET-206: Map.sql 解析器 ✅

**類型**: Full-Stack

**狀態**: ✅ 完成

**描述**: 實作 Map.sql 檔案下載與解析功能

**驗收條件**:

- [x] 自動下載 map.sql 檔案
- [x] 解析村莊座標、名稱、人口
- [x] 解析玩家 ID、名稱、聯盟
- [x] 解析聯盟資訊
- [x] 儲存至資料庫
- [x] 支援增量更新

**相關 PRD**: F4.3 Map.sql 解析

**技術規格參考**: PROJECT-REQUIREMENTS.md 5.2 節（Map.sql 解析）

**完成日期**: 2026-01-25

**實作摘要**:

- 後端 API: `POST /api/v1/map-sql/parse` 解析端點, `POST /api/v1/map-sql/save` 儲存端點
- MapSqlService: 正則解析 CSV 格式，支援儲存到資料庫
- Pydantic Schemas: MapParseResponse, MapSaveResponse, MapVillage, MapPlayer, MapAlliance
- 資料庫模型: MapSnapshot, MapVillageData, MapPlayerData, MapAllianceData
- 前端頁面: MapSqlPage（上傳、解析、儲存、搜尋功能）
- 支援統計資訊：村莊數、玩家數、聯盟數
- 支援座標範圍、玩家名稱、聯盟名稱搜尋
- 單元測試: 29 tests（13 API + 16 service）

---

### TICKET-207: 數據同步機制 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作數據同步與排程機制

**驗收條件**:

- [x] 定時抓取排程（村莊資源每 15 分鐘）
- [x] 增量同步機制
- [x] 衝突處理策略
- [x] 同步狀態追蹤
- [x] 錯誤日誌記錄

**相關 PRD**: F4. 數據抓取系統

**技術規格參考**: PROJECT-REQUIREMENTS.md 5.3 節（資料抓取架構）

**依賴**: TICKET-205, TICKET-206

**完成日期**: 2026-01-25

**實作摘要**:

- SyncLog Model: 同步日誌資料表
- SyncLogService: 建立、完成、查詢同步記錄
- SchedulerService: APScheduler 排程服務（單例模式）
- 後端 API: `GET /api/v1/sync-logs` 同步日誌端點
- 後端 API: `GET /api/v1/scheduler/jobs` 排程任務列表
- 後端 API: `POST /api/v1/scheduler/sync-reminder` 新增同步提醒
- 支援 should_sync() 檢查、同步間隔控制
- 支援自動清理舊同步日誌（30 天）
- 單元測試: 13 tests

---

### TICKET-208: 村莊管理前端頁面 ✅

**類型**: Frontend

**狀態**: ✅ 完成

**設計稿**:

- [villages.md](../designs/pages/villages.md)

**描述**: 實作村莊管理的前端介面

**驗收條件**:

- [x] 村莊列表頁面
- [x] 村莊詳情頁面（建築、部隊、資源）
- [x] 手動輸入/編輯功能
- [x] 數據同步狀態顯示
- [x] 響應式設計

**相關 PRD**: F4. 數據抓取系統

**技術規格參考**: PROJECT-REQUIREMENTS.md 第十章（用戶介面需求）

**依賴**: TICKET-203

**完成日期**: 2026-01-25

**實作摘要**:

- VillagesPage: 村莊列表，依帳號篩選
- VillageDetailPage: 村莊詳情、建築表格、部隊表格、同步狀態卡片
- VillageForm: 新增/編輯村莊表單
- syncApi: 同步日誌和統計 API 服務
- UI 元件: Table, Select, Badge（Radix UI）
- 同步狀態顯示: 總同步次數、成功/失敗數、今日同步項目、最後同步時間
- i18n: 中英文翻譯
- 響應式設計: 桌面/平板/手機

---

## Phase 3: AI 策略引擎

### TICKET-301: 遊戲階段判斷模組 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作遊戲階段自動判斷功能

**驗收條件**:

- [x] 根據天數、村莊數、人口判斷階段
- [x] 支援 6 個階段定義
- [x] 提供該階段標準目標
- [x] 評估玩家進度（領先/正常/落後）
- [x] `POST /api/v1/strategy/phase` 端點
- [x] 單元測試覆蓋率 > 80%

**相關 PRD**: F3.1 遊戲階段判斷

**技術規格參考**: PROJECT-REQUIREMENTS.md 4.1 節（遊戲階段判斷）

**完成日期**: 2026-01-26

**實作摘要**:

- StrategyService: 遊戲階段判斷邏輯
- 6 個階段定義：EARLY_GAME, SETTLEMENT_RUSH, MID_GAME, LATE_GAME, END_GAME, WW_RACE
- 根據 server_day, village_count, total_population 判斷階段
- 進度評估：ahead/normal/behind
- 支援玩家角色（attacker/defender/farmer/hybrid）調整評估標準

---

### TICKET-302: Claude API 整合 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 整合 Claude API 作為策略建議引擎

**驗收條件**:

- [x] Claude API 連接配置
- [x] 設計策略建議 Prompt Template
- [x] 實作對話上下文管理
- [x] 遊戲數據注入機制
- [x] 錯誤處理與 fallback
- [x] 回應時間 < 5 秒

**相關 PRD**: F3.2 AI 即時策略諮詢

**技術規格參考**: PROJECT-REQUIREMENTS.md 第四章（策略建議功能）

**完成日期**: 2026-01-26

**實作摘要**:

- AIService: Claude API 整合服務
- Anthropic SDK 整合，支援 base_url 配置（用於 Docker 網路問題）
- 多輪對話上下文管理（記憶體內儲存）
- 完整 Prompt Template 設計，含遊戲知識、策略模式、回應格式
- 自動注入帳號數據、村莊資訊、階段判斷結果
- 錯誤處理：API 錯誤、驗證錯誤、超時處理

---

### TICKET-303: AI 策略諮詢 API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作 AI 策略諮詢 REST API

**驗收條件**:

- [x] `POST /api/v1/strategy/advice` 端點
- [x] 輸入：自然語言描述、帳號數據
- [x] 輸出：階段分析、立即行動、短期計畫、風險提醒
- [x] 支援多輪對話
- [x] 對話歷史記錄

**相關 PRD**: F3.2 AI 即時策略諮詢

**技術規格參考**: PROJECT-REQUIREMENTS.md 4.4 節（即時策略諮詢）

**依賴**: TICKET-301, TICKET-302

**完成日期**: 2026-01-26

**實作摘要**:

- API 端點: `POST /api/v1/strategy/advice`
- Pydantic Schemas: StrategyAdviceRequest, StrategyAdviceResponse
- 輸出格式：phase_analysis, immediate_actions, short_term_plan, risk_warnings, answer
- 支援 conversation_id 延續對話
- 對話歷史端點: `GET /api/v1/strategy/conversation/{conversation_id}`

---

### TICKET-304: 帳號健康檢查 API ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 實作帳號健康診斷 API

**驗收條件**:

- [x] `POST /api/v1/strategy/health-check` 端點
- [x] 檢查糧食平衡狀況
- [x] 檢查文化點產出效率
- [x] 檢查村莊配置合理性
- [x] 檢查部隊訓練進度
- [x] 輸出健康評分 (0-100)
- [x] 提供改進建議清單

**相關 PRD**: F3.3 帳號健康檢查

**技術規格參考**: PROJECT-REQUIREMENTS.md 7.1 節（帳號健康檢查）

**依賴**: TICKET-203

**完成日期**: 2026-01-26

**實作摘要**:

- API 端點: `POST /api/v1/strategy/health-check`
- 檢查項目：crop_balance, culture_points, village_setup, troop_training, resource_efficiency
- 每項評分 0-100 分，含狀態（良好/警告/危險）和建議
- 總體評分為各項加權平均

---

### TICKET-305: AI 諮詢前端頁面 ✅

**類型**: Frontend

**狀態**: ✅ 完成

**設計稿**:

- [ai-advisor.md](../designs/pages/ai-advisor.md)

**描述**: 實作 AI 策略諮詢的對話式介面

**驗收條件**:

- [x] 對話式 UI 設計
- [x] 支援自然語言輸入
- [x] 顯示階段判斷結果
- [x] 顯示策略建議卡片
- [x] 對話歷史記錄
- [x] 載入狀態與錯誤處理

**相關 PRD**: F3.2 AI 即時策略諮詢

**技術規格參考**: PROJECT-REQUIREMENTS.md 10.3.1 節（對話式介面）

**依賴**: TICKET-303

**完成日期**: 2026-01-26

**實作摘要**:

- AIAdvisorPage: 對話式 UI 介面
- 帳號選擇、玩家角色選擇（attacker/defender/farmer/hybrid）
- 階段資訊卡片：當前階段、伺服器天數、進度狀態
- 對話歷史顯示、示範問題快捷按鈕
- 載入動畫、錯誤提示
- i18n 支援中英文

---

### TICKET-306: 帳號健康檢查前端頁面 ✅

**類型**: Frontend

**狀態**: ✅ 完成

**設計稿**:

- [ai-health.md](../designs/pages/ai-health.md)

**描述**: 實作帳號健康檢查的前端介面

**驗收條件**:

- [x] 健康評分儀表板
- [x] 各項檢查結果視覺化
- [x] 改進建議清單
- [ ] 歷史趨勢圖表（待後續實作）
- [ ] 一鍵執行建議功能（待後續實作）

**相關 PRD**: F3.3 帳號健康檢查

**技術規格參考**: PROJECT-REQUIREMENTS.md 第十章（用戶介面需求）

**依賴**: TICKET-304

**完成日期**: 2026-01-26

**實作摘要**:

- 整合於 AIAdvisorPage 內，共用帳號選擇
- 健康檢查結果以卡片形式顯示
- 各項評分視覺化（進度條、狀態徽章）
- 改進建議清單展示

---

## Phase 4: 半自動執行

> ⚠️ **重要說明**: 此 Phase 涉及遊戲自動化，可能違反 Travian 使用條款。
> 技術研究文件: [BROWSER_AUTOMATION_RESEARCH.md](tech/BROWSER_AUTOMATION_RESEARCH.md)

### 技術架構概述

**瀏覽器自動化方案**: Nodriver (Python)

- 繞過 CDP 協議偵測，反偵測能力最強
- Python 原生，與後端技術棧一致
- 活躍維護中，原生 asyncio 支援

**核心依賴**:

```bash
pip install nodriver aiohttp
```

---

### TICKET-401: 操作佇列系統設計 ✅

**類型**: Full-Stack

**狀態**: ✅ 完成

**設計稿**:

- [execute-queue.md](../designs/pages/execute-queue.md)

**描述**: 設計並實作操作確認流程與佇列管理系統

**驗收條件**:

- [x] 操作預覽介面（顯示成本、時間、前置需求）
- [x] 確認/取消/稍後執行按鈕
- [x] 批量確認功能
- [x] 操作佇列管理（優先順序、狀態追蹤）
- [x] 佇列持久化儲存

**完成日期**: 2026-01-29

**實作摘要**:

- ExecutionTask 模型：任務狀態追蹤（PENDING/CONFIRMED/EXECUTING/COMPLETED/FAILED/CANCELLED）
- ExecutionLog 模型：執行日誌記錄（含截圖路徑、耗時）
- ExecutionQueueService：CRUD、批量確認/取消、安全檢查（每日上限、操作時段、最小間隔）
- API 端點：/execute/queue CRUD、/execute/queue/confirm、/execute/queue/cancel、/execute/safety-check
- 單元測試：32 tests

**技術實作細節**:

```python
# 資料模型設計
class ExecutionType(Enum):
    BUILD = "build"
    TRAIN = "train"
    ADVENTURE = "adventure"

class ExecutionStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"

class ExecutionTask(Base):
    id: str
    account_id: str
    village_id: str
    execution_type: ExecutionType
    target: str  # building_id 或 troop_id
    quantity: int
    status: ExecutionStatus
    created_at: datetime
    confirmed_at: datetime | None
    executed_at: datetime | None
    result: dict | None
```

**API 端點**:

- `POST /api/v1/execute/queue` - 新增操作到佇列
- `GET /api/v1/execute/queue` - 取得佇列列表
- `PUT /api/v1/execute/queue/{id}/confirm` - 確認操作
- `DELETE /api/v1/execute/queue/{id}` - 取消操作

**相關 PRD**: F5.1 操作佇列系統

**技術規格參考**: PROJECT-REQUIREMENTS.md 9.2 節（執行模式）

---

### TICKET-402: 半自動建造執行引擎 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 整合 Nodriver 實作建造操作執行功能

**驗收條件**:

- [x] `POST /api/v1/execute/run/{task_id}` 端點（執行單一任務）
- [x] Nodriver 瀏覽器自動化整合
- [x] 操作前驗證（資源、前置需求）
- [x] 隨機延遲機制（1-5 秒，正態分佈）
- [x] 人類化滑鼠移動（隨機偏移 ±5px）
- [x] 執行結果回報與截圖
- [x] 錯誤處理與重試（最多 3 次）
- [x] 執行成功率 > 95%

**完成日期**: 2026-01-29

**實作摘要**:

- BaseExecutionEngine：瀏覽器控制基類（導航、點擊、輸入、截圖、等待元素）
- BuildExecutionEngine：建造執行引擎（升級建築）
- HumanBehavior：人類行為模擬（隨機延遲正態分佈、滑鼠偏移、打字間隔）
- AutomationConfig：安全設定（每日上限 100、操作時段 07:00-23:00、最小間隔 60 秒）
- 依賴：nodriver>=0.38, aiohttp>=3.9.0

**技術實作細節**:

```python
import nodriver as uc
import random
import asyncio

class BuildExecutionEngine:
    async def execute_build(self, task: ExecutionTask) -> ExecutionResult:
        browser = await uc.start()
        try:
            page = await browser.get(f'{server_url}/dorf2.php')

            # 人類化延遲
            await asyncio.sleep(self._get_random_delay())

            # 找到建築位置並點擊
            building = await page.select(f'#a{task.position}')
            await self._human_like_click(building)

            # 等待並點擊升級按鈕
            await asyncio.sleep(self._get_random_delay())
            upgrade_btn = await page.select('.build')
            await self._human_like_click(upgrade_btn)

            return ExecutionResult(success=True)
        finally:
            await browser.stop()

    def _get_random_delay(self) -> float:
        """1-5 秒隨機延遲，正態分佈"""
        base = 3.0
        variance = random.gauss(0, 1)
        return max(1.0, min(5.0, base + variance))

    async def _human_like_click(self, element):
        """人類化點擊，隨機偏移"""
        offset_x = random.randint(-5, 5)
        offset_y = random.randint(-5, 5)
        await element.click(offset=(offset_x, offset_y))
```

**安全機制**:

- 每日操作上限: 100 次
- 操作時段限制: 07:00-23:59
- 最小操作間隔: 60 秒

**相關 PRD**: F5.2 半自動建造執行

**技術規格參考**: PROJECT-REQUIREMENTS.md 第九章（自動化執行功能）

**依賴**: TICKET-401, TICKET-205

---

### TICKET-403: 半自動訓練執行引擎 ✅

**類型**: Backend

**狀態**: ✅ 完成

**描述**: 擴展執行引擎支援部隊訓練操作

**驗收條件**:

- [x] `POST /api/v1/execute/run/{task_id}` 端點（共用執行入口）
- [x] 操作前驗證（資源、建築等級、研究院需求）
- [x] 支援指定兵種和數量
- [x] 隨機延遲機制
- [x] 執行結果回報
- [x] 錯誤處理與重試

**完成日期**: 2026-01-29

**實作摘要**:

- TrainExecutionEngine：訓練執行引擎
- 支援兵營(gid=19)、馬廄(gid=20)、工坊(gid=21) 訓練建築
- 人類化輸入（逐字打字、隨機間隔）
- ExecutionEngineFactory：根據 ExecutionType 建立對應引擎

**技術實作細節**:

```python
class TrainExecutionEngine:
    async def execute_train(self, task: ExecutionTask) -> ExecutionResult:
        # 導航到訓練建築（兵營/馬廄/工坊）
        building_url = self._get_training_building_url(task.troop_type)
        page = await browser.get(building_url)

        # 輸入數量
        input_field = await page.select(f'input[name="{task.troop_id}"]')
        await input_field.clear()
        await self._human_like_type(input_field, str(task.quantity))

        # 點擊訓練按鈕
        train_btn = await page.select('.train')
        await self._human_like_click(train_btn)
```

**相關 PRD**: F5.3 半自動訓練執行

**技術規格參考**: PROJECT-REQUIREMENTS.md 第九章（自動化執行功能）

**依賴**: TICKET-401, TICKET-402

---

### TICKET-404: 操作日誌系統 ✅

**類型**: Full-Stack

**狀態**: ✅ 完成

**描述**: 實作完整操作日誌記錄與查詢系統

**驗收條件**:

- [x] 記錄所有執行操作（含截圖）
- [x] 記錄操作時間、類型、參數、結果、錯誤訊息
- [x] `GET /api/v1/execute/logs` 查詢端點
- [ ] 日誌查詢前端頁面（待 Phase 5 實作）
- [x] 支援篩選（日期、類型、狀態）與搜尋
- [ ] 日誌保留策略（30 天自動清理，待實作）
- [ ] 日誌匯出功能（CSV，待實作）

**完成日期**: 2026-01-29

**實作摘要**:

- ExecutionLog 模型：已在 TICKET-401 建立
- API 端點：GET /api/v1/execute/logs（支援 account_id, execution_type, success, start_date, end_date 篩選）
- 日誌記錄：success, result_message, error_message, screenshot_path, duration_ms
- 統計功能：success_count, failure_count

**資料模型**:

```python
class ExecutionLog(Base):
    id: str
    task_id: str
    account_id: str
    village_id: str
    execution_type: ExecutionType
    target: str
    parameters: dict
    status: ExecutionStatus
    error_message: str | None
    screenshot_path: str | None
    started_at: datetime
    completed_at: datetime | None
    duration_ms: int | None
```

**相關 PRD**: F5.2 半自動建造執行

**技術規格參考**: PROJECT-REQUIREMENTS.md 9.4 節（安全機制）

**設計稿**:

- [execute-logs.md](../designs/pages/execute-logs.md)

**依賴**: TICKET-402, TICKET-403

---

### TICKET-405: 排程提醒系統 ✅

**類型**: Full-Stack

**狀態**: ✅ 完成

**描述**: 實作條件觸發提醒功能

**驗收條件**:

- [x] 建造/訓練完成提醒
- [x] 資源即將滿倉提醒（80% 時觸發）
- [x] 英雄可出冒險提醒
- [x] 提醒規則設定介面（API）
- [x] 瀏覽器推播通知（Web Push API）
- [x] 應用內通知中心（API）
- [x] 提醒歷史記錄

**完成日期**: 2026-01-29

**實作摘要**:

- ReminderRule 模型：提醒規則（BUILD_COMPLETE, TRAIN_COMPLETE, RESOURCE_FULL, HERO_READY, ATTACK_INCOMING, CUSTOM）
- Notification 模型：通知記錄（標題、內容、類型、已讀狀態）
- PushSubscription 模型：Web Push 訂閱資訊
- ReminderService：規則 CRUD、通知管理、Push 訂閱、觸發提醒、統計
- API 端點：/reminders/rules CRUD、/reminders/notifications、/reminders/push/subscribe
- 單元測試：21 tests

**技術實作**:

```python
# 提醒規則模型
class ReminderRule(Base):
    id: str
    account_id: str
    rule_type: ReminderType  # BUILD_COMPLETE, RESOURCE_FULL, HERO_READY
    enabled: bool
    threshold: int | None  # 資源滿倉百分比
    created_at: datetime

# Web Push 訂閱
class PushSubscription(Base):
    id: str
    user_id: str
    endpoint: str
    p256dh_key: str
    auth_key: str
```

**相關 PRD**: F5.4 排程提醒

**技術規格參考**: PROJECT-REQUIREMENTS.md 9.2 節（排程輔助）

**設計稿**:

- [execute-reminders.md](../designs/pages/execute-reminders.md)

**依賴**: TICKET-207

---

## Phase 5: 進階功能

### TICKET-501: 座標與距離計算器

**類型**: Full-Stack

**描述**: 實作座標距離與行軍時間計算

**驗收條件**:

- [ ] `POST /api/v1/calculator/distance` 端點
- [ ] 計算兩點距離
- [ ] 計算各兵種抵達時間
- [ ] 前端計算器頁面
- [ ] 地圖視覺化（選填）

**相關 PRD**: F2.5 座標與距離計算器

**技術規格參考**: PROJECT-REQUIREMENTS.md 6.4.5 節（座標與距離計算器）

**設計稿**:

- [calculator-distance.md](../designs/pages/calculator-distance.md)

---

### TICKET-502: 多波次攻擊計算器

**類型**: Full-Stack

**描述**: 實作多波次攻擊時間計算

**驗收條件**:

- [ ] `POST /api/v1/calculator/waves` 端點
- [ ] 輸入：座標、速度、波次數、抵達時間、間隔
- [ ] 輸出：各波次發兵時間表
- [ ] 前端計算器頁面
- [ ] 時間表匯出功能

**相關 PRD**: F2.6 多波次攻擊計算器

**技術規格參考**: PROJECT-REQUIREMENTS.md 6.4.4 節（時間與波次計算器）

**設計稿**:

- [calculator-waves.md](../designs/pages/calculator-waves.md)

---

### TICKET-503: 征服計算器

**類型**: Full-Stack

**描述**: 實作征服村莊計算

**驗收條件**:

- [ ] `POST /api/v1/calculator/conquest` 端點
- [ ] 計算所需波數
- [ ] 計算忠誠度降低
- [ ] 計算總成本
- [ ] 前端計算器頁面

**相關 PRD**: F2.7 征服計算器

**技術規格參考**: PROJECT-REQUIREMENTS.md 6.4.1 節（征服計算器）

**設計稿**:

- [calculator-conquest.md](../designs/pages/calculator-conquest.md)

---

### TICKET-504: 部隊訓練計算器

**類型**: Full-Stack

**描述**: 實作部隊訓練時間與成本計算

**驗收條件**:

- [ ] `POST /api/v1/calculator/training` 端點
- [ ] 計算訓練時間
- [ ] 計算訓練成本
- [ ] 計算每日糧耗
- [ ] 前端計算器頁面

**相關 PRD**: F2.8 部隊訓練計算器

**技術規格參考**: PROJECT-REQUIREMENTS.md 6.3.1-6.3.3 節（部隊計算器）

**設計稿**:

- [calculator-training.md](../designs/pages/calculator-training.md)

---

### TICKET-505: 開局模板系統

**類型**: Full-Stack

**描述**: 實作各種族開局模板功能

**驗收條件**:

- [ ] 每種族 72 小時開局模板
- [ ] 精確到分鐘的建造順序
- [ ] 資源分配建議
- [ ] 模板查詢 API
- [ ] 模板展示前端頁面

**相關 PRD**: F3.4 種族專屬策略

**技術規格參考**: PROJECT-REQUIREMENTS.md 4.5 節（開局模板）

**設計稿**:

- [database-templates.md](../designs/pages/database-templates.md)

---

### TICKET-506: 報告解析系統

**類型**: Full-Stack

**描述**: 實作戰鬥報告解析功能

**驗收條件**:

- [ ] 支援攻擊/防守/偵查報告
- [ ] 解析雙方部隊組成
- [ ] 解析損失與掠奪
- [ ] 報告儲存與查詢
- [ ] 報告分析前端頁面
- [ ] 統計摘要功能

**相關 PRD**: F4.2 報告解析

**技術規格參考**: PROJECT-REQUIREMENTS.md 6.6 節（報告分析系統）

**設計稿**:

- [reports.md](../designs/pages/reports.md)

---

## 附錄：Ticket 統計

| Phase | Ticket 數 | Backend | Frontend | Full-Stack |
| ----- | --------- | ------- | -------- | ---------- |
| Phase 0 | 3 | 2 | 0 | 1 |
| Phase 1 | 12 | 10 | 2 | 0 |
| Phase 2 | 8 | 5 | 1 | 2 |
| Phase 3 | 6 | 4 | 2 | 0 |
| Phase 4 | 5 | 2 | 0 | 3 |
| Phase 5 | 6 | 0 | 0 | 6 |
| **總計** | **40** | **23** | **5** | **12** |

---

## 變更記錄

| 版本 | 日期 | 變更內容 |
| ---- | ---- | -------- |
| 1.0 | 2026-01-22 | 初版建立，從 PRD 拆分 40 個 Tickets |
| 1.1 | 2026-01-23 | TICKET-002 完成 - 資料庫 Schema 設計 |
| 1.2 | 2026-01-23 | TICKET-003 完成 - 靜態數據 JSON Schema 設計，Phase 0 完成 |
| 1.3 | 2026-01-23 | TICKET-101 完成 - 建築數據收集與整理（40 種建築完整數據） |
| 1.4 | 2026-01-23 | TICKET-102 完成 - 兵種數據收集與整理（7 種族 70 種兵種完整數據） |
| 1.5 | 2026-01-23 | TICKET-103 完成 - 資源田數據收集與整理（4 種資源田 0-20 級完整數據） |
| 1.6 | 2026-01-23 | TICKET-104 完成 - 建築數據查詢 API（4 個端點，15 個測試，97% 覆蓋率） |
| 1.7 | 2026-01-23 | TICKET-105 完成 - 兵種數據查詢 API |
| 1.8 | 2026-01-23 | TICKET-106~112 完成 - Phase 1 全部完成（資源田 API、計算器 API、前端頁面） |
| 1.9 | 2026-01-24 | TICKET-201 完成 - 用戶註冊/登入系統（JWT 認證、bcrypt 密碼、前端頁面） |
| 2.0 | 2026-01-24 | Phase 2 部分完成 - TICKET-202~204（遊戲帳號管理、村莊 CRUD、Browser MCP 研究） |
| 2.1 | 2026-01-25 | Phase 2 全部完成 - TICKET-205~208 補齊實作（瀏覽器擴展、Map.sql 完整功能、APScheduler 排程、村莊同步狀態顯示） |
| 2.2 | 2026-01-26 | Phase 3 全部完成 - TICKET-301~306（AI 策略引擎：遊戲階段判斷、Claude API 整合、AI 諮詢 API、健康檢查、前端頁面） |
| 2.3 | 2026-01-29 | Bug fix - AI Tool Use: get_building_info 輸出新增 effect_description 欄位，修正英雄宅綠洲佔領等級查詢問題 |
| 2.4 | 2026-01-29 | 更新 Phase 4 技術實作細節：新增 Nodriver 方案、資料模型、安全機制、程式碼範例 |
| 2.5 | 2026-01-29 | Phase 4 全部完成 - TICKET-401~405（操作佇列系統、建造/訓練執行引擎、操作日誌、排程提醒系統） |
