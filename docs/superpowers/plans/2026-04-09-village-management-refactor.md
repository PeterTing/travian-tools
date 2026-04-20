# Village Management Refactor Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Dashboard + VillagesPage into a unified village management page, replace per-village scraping with Travian Statistics page scraping (4 pages = all village data).

**Architecture:** New statistics page parser extracts all village data from 4 Travian pages in one sync. Frontend merges into a single "/villages" page with overview table + drill-down detail.

**Tech Stack:** Python FastAPI, SQLAlchemy, Nodriver (browser automation), React, shadcn/ui

---

## Current Problems

1. **效率低** — 目前逐村抓取，每村 4 頁 = N*4 次 page load。10 個村莊 = 40 次。
2. **架構混亂** — Dashboard（即時監控）、VillagesPage（CRUD）、VillageDetail（統計）三個地方功能重疊。
3. **Statistics 頁面未利用** — Travian 的 4 個 statistics 頁面可以一次拿到所有村莊的資料。

## New Architecture

### Data Source: 4 Travian Statistics Pages

| Page | URL | Data |
|------|-----|------|
| Overview | `/village/statistics/overview` | 所有村莊：名稱、座標、人口、倉庫容量、糧倉容量 |
| Resources | `/village/statistics/resources` | 所有村莊：四種資源的產量（每小時） |
| Culture Points | `/village/statistics/culturepoints` | 所有村莊：文化點產量、總文化點 |
| Troops | `/village/statistics/troops` | 所有村莊：各兵種數量 |

**一次同步 = 4 次 page load（不論村莊數量）**

### Frontend: Unified Village Management

```
/villages                → 所有村莊總覽（表格：名稱、座標、人口、資源產量、部隊數、文化點）
/villages/:id            → 單一村莊詳情（資源、建築、部隊、歷史）
```

**移除：**
- `/dashboard` → 合併進 `/villages`（同步控制、攻擊警報、資源狀態都放這）

---

## Phase 1: Statistics Page Parser

### Task 1: Parse Travian Statistics Pages

**Files:**
- Create: `backend/app/services/statistics_page_parser.py`
- Test: `backend/tests/unit/services/test_statistics_page_parser.py`

需要先實際看這 4 個頁面的 HTML 結構才能寫 parser。用 scraper 登入後抓取原始 HTML。

- [ ] **Step 1: 用 scraper 登入並抓取 4 個 Statistics 頁面的 HTML**

```python
# 手動測試腳本 — 抓取 HTML 存到檔案
# backend/scripts/fetch_statistics_html.py
import asyncio
from app.services.village_scraper_service import VillageScraperService

async def main():
    service = VillageScraperService(
        login_email="YOUR_EMAIL",
        login_password="YOUR_PASSWORD"
    )
    await service._start_browser()
    
    pages = [
        ("overview", "https://nys.x1.asia.travian.com/village/statistics/overview"),
        ("resources", "https://nys.x1.asia.travian.com/village/statistics/resources"),
        ("culturepoints", "https://nys.x1.asia.travian.com/village/statistics/culturepoints"),
        ("troops", "https://nys.x1.asia.travian.com/village/statistics/troops"),
    ]
    
    for name, url in pages:
        await service._navigate(url)
        html = await service.page.get_content()
        with open(f"/tmp/travian-stats-{name}.html", "w") as f:
            f.write(html)
        print(f"Saved {name}: {len(html)} bytes")
    
    await service._stop_browser()

asyncio.run(main())
```

- [ ] **Step 2: 分析 HTML 結構，寫 parser tests**

根據實際 HTML 寫 test cases：
```python
# backend/tests/unit/services/test_statistics_page_parser.py
def test_parse_overview():
    html = open("/tmp/travian-stats-overview.html").read()
    result = StatisticsPageParser.parse_overview(html)
    assert len(result) > 0  # Should find all villages
    assert result[0]["name"] is not None
    assert result[0]["population"] > 0

def test_parse_resources():
    html = open("/tmp/travian-stats-resources.html").read()
    result = StatisticsPageParser.parse_resources(html)
    assert len(result) > 0
    assert "wood_production" in result[0]

def test_parse_culture_points():
    html = open("/tmp/travian-stats-culturepoints.html").read()
    result = StatisticsPageParser.parse_culture_points(html)
    assert len(result) > 0
    assert "cp_production" in result[0]

def test_parse_troops():
    html = open("/tmp/travian-stats-troops.html").read()
    result = StatisticsPageParser.parse_troops(html)
    assert len(result) > 0
```

- [ ] **Step 3: Implement StatisticsPageParser**

```python
# backend/app/services/statistics_page_parser.py
from bs4 import BeautifulSoup

class StatisticsPageParser:
    """Parse Travian /village/statistics/* pages."""
    
    @staticmethod
    def parse_overview(html: str) -> list[dict]:
        """Parse /village/statistics/overview — village names, coords, population, storage."""
        # Implementation based on actual HTML structure
        pass
    
    @staticmethod
    def parse_resources(html: str) -> list[dict]:
        """Parse /village/statistics/resources — resource production per village."""
        pass
    
    @staticmethod
    def parse_culture_points(html: str) -> list[dict]:
        """Parse /village/statistics/culturepoints — CP per village."""
        pass
    
    @staticmethod
    def parse_troops(html: str) -> list[dict]:
        """Parse /village/statistics/troops — troops per village."""
        pass
```

- [ ] **Step 4: Run tests, commit**

---

### Task 2: New Statistics-Based Sync Service

**Files:**
- Create: `backend/app/services/village_stats_sync_service.py`
- Modify: `backend/app/api/v1/endpoints/scraper.py` — add new sync endpoint
- Test: `backend/tests/unit/services/test_village_stats_sync_service.py`

- [ ] **Step 1: Implement VillageStatsSyncService**

```python
class VillageStatsSyncService:
    """Sync all villages via 4 statistics pages (instead of per-village scraping)."""
    
    async def sync_all(self, server_url: str, login_email: str, login_password: str) -> dict:
        """One sync = 4 page loads, gets ALL village data."""
        scraper = VillageScraperService(login_email, login_password)
        await scraper._start_browser()
        
        try:
            # Page 1: Overview (names, coords, population, storage)
            await scraper._navigate(f"{server_url}/village/statistics/overview")
            overview_html = await scraper.page.get_content()
            overview = StatisticsPageParser.parse_overview(overview_html)
            
            # Page 2: Resources (production rates)
            await scraper._navigate(f"{server_url}/village/statistics/resources")
            resources_html = await scraper.page.get_content()
            resources = StatisticsPageParser.parse_resources(resources_html)
            
            # Page 3: Culture Points
            await scraper._navigate(f"{server_url}/village/statistics/culturepoints")
            cp_html = await scraper.page.get_content()
            culture_points = StatisticsPageParser.parse_culture_points(cp_html)
            
            # Page 4: Troops
            await scraper._navigate(f"{server_url}/village/statistics/troops")
            troops_html = await scraper.page.get_content()
            troops = StatisticsPageParser.parse_troops(troops_html)
            
            # Merge all data by village_id
            merged = self._merge_village_data(overview, resources, culture_points, troops)
            
            # Save to database
            self._save_to_db(merged)
            
            return {"total_villages": len(merged), "success": True}
        finally:
            await scraper._stop_browser()
```

- [ ] **Step 2: Add API endpoint**

```python
@router.post("/sync-stats")
async def sync_via_statistics(request: SyncAllRequest, db: DBSession, current_user: CurrentUser):
    """New sync method: 4 statistics pages instead of per-village scraping."""
```

- [ ] **Step 3: Tests, commit**

---

## Phase 2: Frontend Refactor

### Task 3: Unified Village Management Page

**Files:**
- Rewrite: `frontend/src/pages/villages/VillagesPage.tsx` — new overview table
- Modify: `frontend/src/pages/villages/VillageDetailPage.tsx` — use new data
- Remove: `frontend/src/pages/DashboardPage.tsx` — merged into VillagesPage
- Modify: `frontend/src/App.tsx` — update routes

**New VillagesPage layout:**

```
┌─────────────────────────────────────────────────────────┐
│ 村莊管理                              [同步] [上次: 5m前] │
├─────────────────────────────────────────────────────────┤
│ ⚠️ 2 個村莊正在被攻擊！                                   │
├─────┬──────┬─────┬───────────────┬──────┬──────┬───────┤
│ 名稱 │ 座標  │ 人口 │ 資源產量(木/磚/鐵/糧) │ 部隊數 │ 文化點 │ 狀態   │
├─────┼──────┼─────┼───────────────┼──────┼──────┼───────┤
│ 主村 │(0|0) │ 856 │ 800/750/700/500   │ 1,200│ 45/h │ 建造中 │
│ 分村 │(5|3) │ 432 │ 600/600/600/400   │ 500  │ 20/h │ ⚔️攻擊 │
│ ...  │      │     │                   │      │      │       │
└─────┴──────┴─────┴───────────────┴──────┴──────┴───────┘
```

- [ ] **Step 1: Create new VillagesPage with overview table**
- [ ] **Step 2: Move sync controls from Dashboard to VillagesPage**
- [ ] **Step 3: Move attack alerts from Dashboard to VillagesPage**
- [ ] **Step 4: Update VillageDetailPage to show full detail (resources, troops, buildings)**
- [ ] **Step 5: Remove DashboardPage, update routes**
- [ ] **Step 6: Update App.tsx navigation**

---

## Phase 3: Cleanup

### Task 4: Remove Old Per-Village Sync

- [ ] Remove old per-village scraping code from sync_worker (keep as fallback option)
- [ ] Update ARQ worker to use new stats-based sync
- [ ] Clean up unused components

---

## Execution Dependencies

```
Task 1 (Parser) → Task 2 (Sync Service) → Task 3 (Frontend) → Task 4 (Cleanup)
```

**BLOCKER:** Task 1 需要先實際抓取 Travian Statistics 頁面的 HTML 來分析結構。需要你幫忙用你的帳號登入後提供 HTML，或者讓我用 scraper 自動抓取。
