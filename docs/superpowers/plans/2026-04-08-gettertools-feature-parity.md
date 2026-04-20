# GetterTools Feature Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve feature parity with GetterTools.com by building server statistics, advanced calculators, search tools, map visualization, battle reports, and alliance collaboration features on top of our existing map.sql infrastructure.

**Architecture:** Extend existing map.sql snapshot system with automated daily downloads, snapshot diffing, and derived statistics. All new features are pure computation on top of map.sql data (same approach as GetterTools). Calculators are stateless formula-based endpoints. Frontend uses existing React + shadcn/ui patterns.

**Tech Stack:** Python FastAPI, SQLAlchemy, MySQL, React, shadcn/ui, Tailwind, Leaflet.js (map), APScheduler

---

## Implementation Approach Analysis

### How GetterTools Works

GetterTools' core data source is Travian's publicly available `map.sql` file. Every Travian server exposes this at `https://{server}/map.sql.gz`. The file contains one row per village with: coordinates, village_id, village_name, player_id, player_name, alliance_id, alliance_name, population, is_capital.

**GetterTools' data pipeline:**
1. Downloads map.sql daily for every registered server
2. Stores each download as a "snapshot" in its database
3. Computes diffs between today's snapshot and 7-days-ago snapshot
4. Derives ALL statistics from these diffs:
   - Rankings = sort current snapshot by population/conquests
   - +/- changes = diff(today, 7_days_ago)
   - Conquest detection = village.player_id changed between snapshots
   - Name changes = player_id same but player_name different
   - Inactive detection = population change ≈ 0 over multiple days
   - Server news = count(new players, deletions, new villages, destroyed villages)

**We already have:**
- `MapSqlService.download_map_sql()` - downloads from any Travian server
- `MapSqlService.parse_sql()` - parses both CSV and SQL INSERT formats
- `MapSqlService.save_to_database()` - stores snapshots with villages/players/alliances
- `MapSnapshot`, `MapVillageData`, `MapPlayerData`, `MapAllianceData` models
- `SchedulerService` with APScheduler for cron jobs

**What we need to build:**
- Automated daily download scheduler
- Snapshot diff computation service
- Statistics query APIs
- Search APIs (inactive/active)
- Calculator endpoints (7 new calculators)
- Frontend pages for all of the above

### Calculators are formula-based

All GetterTools calculators are purely client-side or server-side formula computation. They don't require external data. We can implement them as stateless API endpoints.

---

## Phase Overview

| Phase | 名稱 | 功能數 | 依賴 | 預估時間 |
|-------|------|--------|------|----------|
| **Phase 6** | 伺服器統計基礎 | 12 | 現有 map.sql | 3-4 天 |
| **Phase 7** | 搜尋與探索工具 | 4 | Phase 6 | 1-2 天 |
| **Phase 8** | 進階計算器 | 7 | 無依賴 | 2-3 天 |
| **Phase 9** | 地圖與戰報 | 4 | Phase 6 | 2-3 天 |
| **Phase 10** | 聯盟協作工具 | 6 | Phase 6 | 3-4 天 |

---

## Phase 6: 伺服器統計基礎

### Overview

Build the automated map.sql snapshot pipeline and statistics query system. This is the foundation for all GetterTools-like features.

### File Structure

```
backend/
  app/
    api/v1/endpoints/
      statistics.py              # NEW - 統計 API 端點
    services/
      snapshot_scheduler.py      # NEW - 自動快照排程
      snapshot_diff_service.py   # NEW - 快照差異計算
      statistics_service.py      # NEW - 統計查詢服務
    domain/schemas/
      statistics.py              # NEW - 統計相關 schema
    infrastructure/database/
      models/map_data.py         # MODIFY - 增加征服紀錄、改名紀錄表
  alembic/versions/
    012_add_statistics_tables.py  # NEW - migration

frontend/
  src/pages/
    statistics/
      ServerOverviewPage.tsx     # NEW - 伺服器總覽
      PlayerRankingPage.tsx      # NEW - 玩家排名
      AllianceRankingPage.tsx    # NEW - 聯盟排名
      ConquestActivityPage.tsx   # NEW - 征服活動
      NameChangesPage.tsx        # NEW - 改名紀錄
  src/services/
    statistics-api.ts            # NEW - 統計 API client
```

---

### Task 1: Database Schema — 快照差異追蹤表

**Files:**
- Modify: `backend/app/infrastructure/database/models/map_data.py`
- Create: `backend/alembic/versions/012_add_statistics_tables.py`
- Test: `backend/tests/unit/models/test_statistics_models.py`

- [ ] **Step 1: Write failing test for new models**

```python
# backend/tests/unit/models/test_statistics_models.py
import pytest
from app.infrastructure.database.models.map_data import (
    MapSnapshot,
    MapConquest,
    MapNameChange,
    MapServerStats,
)


def test_map_conquest_model_exists():
    conquest = MapConquest(
        server_url="https://nys.x1.asia.travian.com",
        detected_at_snapshot_id="snap-1",
        village_id=123,
        village_name="Test Village",
        village_x=10,
        village_y=20,
        old_player_id=1,
        old_player_name="OldOwner",
        old_alliance_name="OldAlliance",
        new_player_id=2,
        new_player_name="NewOwner",
        new_alliance_name="NewAlliance",
    )
    assert conquest.village_id == 123
    assert conquest.old_player_name == "OldOwner"
    assert conquest.new_player_name == "NewOwner"


def test_map_name_change_model_exists():
    change = MapNameChange(
        server_url="https://nys.x1.asia.travian.com",
        detected_at_snapshot_id="snap-1",
        player_id=1,
        old_name="OldName",
        new_name="NewName",
    )
    assert change.old_name == "OldName"
    assert change.new_name == "NewName"


def test_map_server_stats_model_exists():
    stats = MapServerStats(
        snapshot_id="snap-1",
        server_url="https://nys.x1.asia.travian.com",
        total_players=1000,
        active_players=500,
        total_villages=5000,
        total_alliances=50,
        total_population=2000000,
        new_players=10,
        deleted_players=5,
        villages_settled=20,
        villages_destroyed=10,
        conquests_today=15,
    )
    assert stats.total_players == 1000
    assert stats.active_players == 500
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/models/test_statistics_models.py -v`
Expected: FAIL — `MapConquest`, `MapNameChange`, `MapServerStats` not defined

- [ ] **Step 3: Add models to map_data.py**

Add to `backend/app/infrastructure/database/models/map_data.py`:

```python
class MapConquest(Base):
    """征服紀錄 — 透過快照差異偵測到的村莊擁有者變更."""

    __tablename__ = "map_conquests"

    conquest_id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    server_url = Column(String(255), nullable=False, index=True)
    detected_at_snapshot_id = Column(String(36), ForeignKey("map_snapshots.snapshot_id"), nullable=False)
    detected_at = Column(DateTime, default=func.now())
    village_id = Column(Integer, nullable=False)
    village_name = Column(String(255))
    village_x = Column(Integer, nullable=False)
    village_y = Column(Integer, nullable=False)
    old_player_id = Column(Integer)
    old_player_name = Column(String(255))
    old_alliance_name = Column(String(255))
    new_player_id = Column(Integer)
    new_player_name = Column(String(255))
    new_alliance_name = Column(String(255))


class MapNameChange(Base):
    """玩家改名紀錄."""

    __tablename__ = "map_name_changes"

    change_id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    server_url = Column(String(255), nullable=False, index=True)
    detected_at_snapshot_id = Column(String(36), ForeignKey("map_snapshots.snapshot_id"), nullable=False)
    detected_at = Column(DateTime, default=func.now())
    player_id = Column(Integer, nullable=False)
    old_name = Column(String(255), nullable=False)
    new_name = Column(String(255), nullable=False)
    game_day = Column(Integer)


class MapServerStats(Base):
    """伺服器每日統計快照."""

    __tablename__ = "map_server_stats"

    stats_id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    snapshot_id = Column(String(36), ForeignKey("map_snapshots.snapshot_id"), nullable=False)
    server_url = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    total_players = Column(Integer, default=0)
    active_players = Column(Integer, default=0)
    total_villages = Column(Integer, default=0)
    total_alliances = Column(Integer, default=0)
    total_population = Column(BigInteger, default=0)
    new_players = Column(Integer, default=0)
    deleted_players = Column(Integer, default=0)
    villages_settled = Column(Integer, default=0)
    villages_destroyed = Column(Integer, default=0)
    conquests_today = Column(Integer, default=0)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/models/test_statistics_models.py -v`
Expected: PASS

- [ ] **Step 5: Create Alembic migration**

```bash
cd backend && alembic revision --autogenerate -m "add statistics tables (conquests, name_changes, server_stats)"
```

- [ ] **Step 6: Apply migration**

```bash
cd backend && alembic upgrade head
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/infrastructure/database/models/map_data.py backend/alembic/versions/012_* backend/tests/unit/models/test_statistics_models.py
git commit -m "feat(statistics): add conquest, name_change, server_stats models"
```

---

### Task 2: Snapshot Diff Service — 快照差異計算

**Files:**
- Create: `backend/app/services/snapshot_diff_service.py`
- Test: `backend/tests/unit/services/test_snapshot_diff_service.py`

The core logic: compare two snapshots and detect conquests, name changes, population changes, new/deleted players, new/destroyed villages.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/unit/services/test_snapshot_diff_service.py
import pytest
from app.services.snapshot_diff_service import SnapshotDiffService


def test_detect_conquests():
    """村莊擁有者變更 = 征服."""
    old_villages = [
        {"village_id": 1, "player_id": 10, "player_name": "Alice", "alliance_name": "A1",
         "village_name": "V1", "x": 0, "y": 0, "population": 500},
    ]
    new_villages = [
        {"village_id": 1, "player_id": 20, "player_name": "Bob", "alliance_name": "A2",
         "village_name": "V1", "x": 0, "y": 0, "population": 500},
    ]
    service = SnapshotDiffService()
    conquests = service.detect_conquests(old_villages, new_villages)
    assert len(conquests) == 1
    assert conquests[0]["old_player_id"] == 10
    assert conquests[0]["new_player_id"] == 20


def test_detect_name_changes():
    """同一 player_id 不同名字 = 改名."""
    old_players = [{"player_id": 1, "player_name": "OldName"}]
    new_players = [{"player_id": 1, "player_name": "NewName"}]
    service = SnapshotDiffService()
    changes = service.detect_name_changes(old_players, new_players)
    assert len(changes) == 1
    assert changes[0]["old_name"] == "OldName"
    assert changes[0]["new_name"] == "NewName"


def test_compute_server_stats():
    """計算伺服器統計."""
    old_snapshot = {
        "players": [{"player_id": i, "player_name": f"P{i}", "total_population": 100} for i in range(10)],
        "villages": [{"village_id": i, "player_id": i % 10, "population": 100} for i in range(20)],
        "alliances": [{"alliance_id": 1, "alliance_name": "A1"}],
        "total_population": 2000,
    }
    new_snapshot = {
        "players": [{"player_id": i, "player_name": f"P{i}", "total_population": 110} for i in range(12)],
        "villages": [{"village_id": i, "player_id": i % 12, "population": 110} for i in range(22)],
        "alliances": [{"alliance_id": 1, "alliance_name": "A1"}, {"alliance_id": 2, "alliance_name": "A2"}],
        "total_population": 2420,
    }
    service = SnapshotDiffService()
    stats = service.compute_server_stats(old_snapshot, new_snapshot)
    assert stats["new_players"] == 2
    assert stats["deleted_players"] == 0
    assert stats["villages_settled"] == 2
    assert stats["total_players"] == 12


def test_compute_player_ranking_with_diff():
    """計算玩家排名含 7 日差異."""
    old_players = [
        {"player_id": 1, "player_name": "Alice", "total_population": 1000, "village_count": 3,
         "alliance_name": "A1"},
    ]
    new_players = [
        {"player_id": 1, "player_name": "Alice", "total_population": 1500, "village_count": 4,
         "alliance_name": "A1"},
    ]
    service = SnapshotDiffService()
    ranking = service.compute_player_ranking(new_players, old_players)
    assert ranking[0]["population"] == 1500
    assert ranking[0]["population_diff"] == 500
    assert ranking[0]["villages_diff"] == 1


def test_detect_inactive_players():
    """人口 7 天變化 = 0 的玩家為不活躍."""
    old_players = [
        {"player_id": 1, "player_name": "Active", "total_population": 1000, "village_count": 3},
        {"player_id": 2, "player_name": "Inactive", "total_population": 500, "village_count": 2},
    ]
    new_players = [
        {"player_id": 1, "player_name": "Active", "total_population": 1200, "village_count": 3},
        {"player_id": 2, "player_name": "Inactive", "total_population": 500, "village_count": 2},
    ]
    service = SnapshotDiffService()
    inactive = service.detect_inactive_players(old_players, new_players)
    assert len(inactive) == 1
    assert inactive[0]["player_id"] == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/services/test_snapshot_diff_service.py -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SnapshotDiffService**

```python
# backend/app/services/snapshot_diff_service.py
"""快照差異計算服務.

比較兩個 map.sql 快照，偵測征服、改名、不活躍玩家等變化。
GetterTools 用同樣的方式：每天下載 map.sql，比較今天和 7 天前的快照。
"""


class SnapshotDiffService:
    """快照差異計算."""

    def detect_conquests(
        self, old_villages: list[dict], new_villages: list[dict]
    ) -> list[dict]:
        """偵測征服：同一 village_id 的 player_id 改變."""
        old_map = {v["village_id"]: v for v in old_villages}
        conquests = []
        for v in new_villages:
            vid = v["village_id"]
            if vid in old_map and old_map[vid]["player_id"] != v["player_id"]:
                # 排除 player_id 為 0 或 None 的情況（空村）
                if old_map[vid]["player_id"] and v["player_id"]:
                    conquests.append({
                        "village_id": vid,
                        "village_name": v.get("village_name", ""),
                        "x": v.get("x", 0),
                        "y": v.get("y", 0),
                        "old_player_id": old_map[vid]["player_id"],
                        "old_player_name": old_map[vid].get("player_name", ""),
                        "old_alliance_name": old_map[vid].get("alliance_name", ""),
                        "new_player_id": v["player_id"],
                        "new_player_name": v.get("player_name", ""),
                        "new_alliance_name": v.get("alliance_name", ""),
                    })
        return conquests

    def detect_name_changes(
        self, old_players: list[dict], new_players: list[dict]
    ) -> list[dict]:
        """偵測改名：同一 player_id 的 player_name 不同."""
        old_map = {p["player_id"]: p for p in old_players}
        changes = []
        for p in new_players:
            pid = p["player_id"]
            if pid in old_map and old_map[pid]["player_name"] != p["player_name"]:
                changes.append({
                    "player_id": pid,
                    "old_name": old_map[pid]["player_name"],
                    "new_name": p["player_name"],
                })
        return changes

    def compute_server_stats(
        self, old_snapshot: dict, new_snapshot: dict
    ) -> dict:
        """計算伺服器統計差異."""
        old_player_ids = {p["player_id"] for p in old_snapshot["players"]}
        new_player_ids = {p["player_id"] for p in new_snapshot["players"]}
        old_village_ids = {v["village_id"] for v in old_snapshot["villages"]}
        new_village_ids = {v["village_id"] for v in new_snapshot["villages"]}

        # 活躍玩家 = 人口 > 0 的玩家
        active_players = sum(
            1 for p in new_snapshot["players"] if p.get("total_population", 0) > 0
        )

        return {
            "total_players": len(new_player_ids),
            "active_players": active_players,
            "total_villages": len(new_village_ids),
            "total_alliances": len(new_snapshot["alliances"]),
            "total_population": sum(
                p.get("total_population", 0) for p in new_snapshot["players"]
            ),
            "new_players": len(new_player_ids - old_player_ids),
            "deleted_players": len(old_player_ids - new_player_ids),
            "villages_settled": len(new_village_ids - old_village_ids),
            "villages_destroyed": len(old_village_ids - new_village_ids),
        }

    def compute_player_ranking(
        self,
        new_players: list[dict],
        old_players: list[dict] | None = None,
    ) -> list[dict]:
        """計算玩家排名，包含 7 天差異."""
        old_map = {}
        if old_players:
            old_map = {p["player_id"]: p for p in old_players}

        ranking = []
        for p in new_players:
            pid = p["player_id"]
            old = old_map.get(pid, {})
            ranking.append({
                "player_id": pid,
                "player_name": p.get("player_name", ""),
                "alliance_name": p.get("alliance_name", ""),
                "population": p.get("total_population", 0),
                "population_diff": p.get("total_population", 0) - old.get("total_population", 0),
                "villages": p.get("village_count", 0),
                "villages_diff": p.get("village_count", 0) - old.get("village_count", 0),
            })

        ranking.sort(key=lambda x: x["population"], reverse=True)
        return ranking

    def compute_alliance_ranking(
        self,
        new_alliances: list[dict],
        old_alliances: list[dict] | None = None,
    ) -> list[dict]:
        """計算聯盟排名，包含 7 天差異."""
        old_map = {}
        if old_alliances:
            old_map = {a["alliance_id"]: a for a in old_alliances}

        ranking = []
        for a in new_alliances:
            aid = a["alliance_id"]
            old = old_map.get(aid, {})
            ranking.append({
                "alliance_id": aid,
                "alliance_name": a.get("alliance_name", ""),
                "member_count": a.get("member_count", 0),
                "member_diff": a.get("member_count", 0) - old.get("member_count", 0),
                "population": a.get("total_population", 0),
                "population_diff": a.get("total_population", 0) - old.get("total_population", 0),
                "population_per_member": (
                    a.get("total_population", 0) // a.get("member_count", 1)
                    if a.get("member_count", 0) > 0
                    else 0
                ),
            })

        ranking.sort(key=lambda x: x["population"], reverse=True)
        return ranking

    def detect_inactive_players(
        self, old_players: list[dict], new_players: list[dict]
    ) -> list[dict]:
        """偵測不活躍玩家：人口 7 天變化 = 0."""
        old_map = {p["player_id"]: p for p in old_players}
        inactive = []
        for p in new_players:
            pid = p["player_id"]
            if pid in old_map:
                pop_diff = p.get("total_population", 0) - old_map[pid].get("total_population", 0)
                if pop_diff <= 0:
                    inactive.append({
                        "player_id": pid,
                        "player_name": p.get("player_name", ""),
                        "population": p.get("total_population", 0),
                        "population_diff": pop_diff,
                        "village_count": p.get("village_count", 0),
                    })
        return inactive
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/services/test_snapshot_diff_service.py -v`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/snapshot_diff_service.py backend/tests/unit/services/test_snapshot_diff_service.py
git commit -m "feat(statistics): add snapshot diff service for conquest/name/inactive detection"
```

---

### Task 3: Snapshot Scheduler — 自動每日下載

**Files:**
- Create: `backend/app/services/snapshot_scheduler.py`
- Modify: `backend/app/services/scheduler_service.py` — register new job
- Test: `backend/tests/unit/services/test_snapshot_scheduler.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/unit/services/test_snapshot_scheduler.py
import pytest
from unittest.mock import MagicMock, patch
from app.services.snapshot_scheduler import SnapshotScheduler


def test_scheduler_can_register_server():
    scheduler = SnapshotScheduler(db=MagicMock())
    scheduler.register_server("https://nys.x1.asia.travian.com")
    assert "https://nys.x1.asia.travian.com" in scheduler.registered_servers


def test_scheduler_download_and_diff(monkeypatch):
    mock_db = MagicMock()
    scheduler = SnapshotScheduler(db=mock_db)

    # Mock the download
    fake_sql = "1,2,3,100,Village,10,Player,1,Alliance,500,0"
    monkeypatch.setattr(
        "app.services.snapshot_scheduler.MapSqlService.download_map_sql",
        lambda url: fake_sql,
    )

    result = scheduler.download_snapshot("https://nys.x1.asia.travian.com")
    assert result is not None
    assert result["total_villages"] > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/services/test_snapshot_scheduler.py -v`
Expected: FAIL

- [ ] **Step 3: Implement SnapshotScheduler**

```python
# backend/app/services/snapshot_scheduler.py
"""自動快照排程服務.

每天自動下載已註冊伺服器的 map.sql，儲存快照並計算差異。
這就是 GetterTools 背後的核心機制。
"""

import logging

from sqlalchemy.orm import Session

from app.services.map_sql_service import MapSqlService
from app.services.snapshot_diff_service import SnapshotDiffService
from app.infrastructure.database.models.map_data import (
    MapConquest,
    MapNameChange,
    MapServerStats,
    MapSnapshot,
    MapPlayerData,
    MapVillageData,
    MapAllianceData,
)

logger = logging.getLogger(__name__)


class SnapshotScheduler:
    """自動快照排程."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.registered_servers: list[str] = []
        self.diff_service = SnapshotDiffService()

    def register_server(self, server_url: str) -> None:
        """註冊伺服器以進行自動快照."""
        server_url = server_url.rstrip("/")
        if server_url not in self.registered_servers:
            self.registered_servers.append(server_url)

    def download_snapshot(self, server_url: str) -> dict | None:
        """下載並儲存一個伺服器的快照."""
        try:
            sql_content = MapSqlService.download_map_sql(server_url)
            service = MapSqlService(self.db)
            parse_result = service.parse_sql(sql_content)

            if parse_result.total_villages == 0:
                logger.warning(f"No villages parsed for {server_url}")
                return None

            # 儲存快照
            snapshot = MapSnapshot(
                server_url=server_url,
                total_villages=parse_result.total_villages,
                total_players=parse_result.total_players,
                total_alliances=parse_result.total_alliances,
            )
            self.db.add(snapshot)
            self.db.flush()

            # 批量儲存村莊、玩家、聯盟
            for village in parse_result.villages:
                if village.village_id:
                    self.db.add(MapVillageData(
                        snapshot_id=snapshot.snapshot_id,
                        travian_village_id=village.village_id,
                        village_name=village.village_name,
                        x=village.x, y=village.y,
                        field_type=village.field_type,
                        travian_player_id=village.player_id,
                        player_name=village.player_name,
                        travian_alliance_id=village.alliance_id,
                        alliance_name=village.alliance_name,
                        population=village.population,
                        is_capital=village.is_capital,
                    ))

            for player in parse_result.players:
                self.db.add(MapPlayerData(
                    snapshot_id=snapshot.snapshot_id,
                    travian_player_id=player.player_id,
                    player_name=player.player_name,
                    travian_alliance_id=player.alliance_id,
                    alliance_name=player.alliance_name,
                    village_count=player.village_count,
                    total_population=player.total_population,
                ))

            for alliance in parse_result.alliances:
                self.db.add(MapAllianceData(
                    snapshot_id=snapshot.snapshot_id,
                    travian_alliance_id=alliance.alliance_id,
                    alliance_name=alliance.alliance_name,
                    member_count=alliance.member_count,
                    total_population=alliance.total_population,
                ))

            # 計算差異（與最近的前一個快照比較）
            self._compute_and_store_diff(snapshot, server_url)

            self.db.commit()

            return {
                "snapshot_id": snapshot.snapshot_id,
                "total_villages": parse_result.total_villages,
                "total_players": parse_result.total_players,
                "total_alliances": parse_result.total_alliances,
            }
        except Exception:
            logger.exception(f"Failed to download snapshot for {server_url}")
            self.db.rollback()
            return None

    def _compute_and_store_diff(self, new_snapshot: MapSnapshot, server_url: str) -> None:
        """計算並儲存快照差異."""
        # 找到前一個快照
        prev_snapshot = (
            self.db.query(MapSnapshot)
            .filter(
                MapSnapshot.server_url == server_url,
                MapSnapshot.snapshot_id != new_snapshot.snapshot_id,
            )
            .order_by(MapSnapshot.created_at.desc())
            .first()
        )
        if not prev_snapshot:
            return

        # 讀取前一個快照的村莊和玩家
        old_villages = [
            {"village_id": v.travian_village_id, "player_id": v.travian_player_id,
             "player_name": v.player_name, "alliance_name": v.alliance_name,
             "village_name": v.village_name, "x": v.x, "y": v.y, "population": v.population}
            for v in self.db.query(MapVillageData).filter(
                MapVillageData.snapshot_id == prev_snapshot.snapshot_id
            ).all()
        ]
        new_villages = [
            {"village_id": v.travian_village_id, "player_id": v.travian_player_id,
             "player_name": v.player_name, "alliance_name": v.alliance_name,
             "village_name": v.village_name, "x": v.x, "y": v.y, "population": v.population}
            for v in self.db.query(MapVillageData).filter(
                MapVillageData.snapshot_id == new_snapshot.snapshot_id
            ).all()
        ]

        old_players = [
            {"player_id": p.travian_player_id, "player_name": p.player_name,
             "total_population": p.total_population}
            for p in self.db.query(MapPlayerData).filter(
                MapPlayerData.snapshot_id == prev_snapshot.snapshot_id
            ).all()
        ]
        new_players = [
            {"player_id": p.travian_player_id, "player_name": p.player_name,
             "total_population": p.total_population}
            for p in self.db.query(MapPlayerData).filter(
                MapPlayerData.snapshot_id == new_snapshot.snapshot_id
            ).all()
        ]

        # 偵測征服
        conquests = self.diff_service.detect_conquests(old_villages, new_villages)
        for c in conquests:
            self.db.add(MapConquest(
                server_url=server_url,
                detected_at_snapshot_id=new_snapshot.snapshot_id,
                village_id=c["village_id"],
                village_name=c["village_name"],
                village_x=c["x"], village_y=c["y"],
                old_player_id=c["old_player_id"],
                old_player_name=c["old_player_name"],
                old_alliance_name=c["old_alliance_name"],
                new_player_id=c["new_player_id"],
                new_player_name=c["new_player_name"],
                new_alliance_name=c["new_alliance_name"],
            ))

        # 偵測改名
        name_changes = self.diff_service.detect_name_changes(old_players, new_players)
        for nc in name_changes:
            self.db.add(MapNameChange(
                server_url=server_url,
                detected_at_snapshot_id=new_snapshot.snapshot_id,
                player_id=nc["player_id"],
                old_name=nc["old_name"],
                new_name=nc["new_name"],
            ))

        # 計算伺服器統計
        old_snap_dict = {
            "players": old_players,
            "villages": old_villages,
            "alliances": [{"alliance_id": a.travian_alliance_id, "alliance_name": a.alliance_name}
                         for a in self.db.query(MapAllianceData).filter(
                             MapAllianceData.snapshot_id == prev_snapshot.snapshot_id).all()],
            "total_population": sum(p["total_population"] for p in old_players),
        }
        new_snap_dict = {
            "players": new_players,
            "villages": new_villages,
            "alliances": [{"alliance_id": a.travian_alliance_id, "alliance_name": a.alliance_name}
                         for a in self.db.query(MapAllianceData).filter(
                             MapAllianceData.snapshot_id == new_snapshot.snapshot_id).all()],
            "total_population": sum(p["total_population"] for p in new_players),
        }
        stats = self.diff_service.compute_server_stats(old_snap_dict, new_snap_dict)
        stats["conquests_today"] = len(conquests)

        self.db.add(MapServerStats(
            snapshot_id=new_snapshot.snapshot_id,
            server_url=server_url,
            **stats,
        ))
```

- [ ] **Step 4: Run tests**

Run: `cd backend && python -m pytest tests/unit/services/test_snapshot_scheduler.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/snapshot_scheduler.py backend/tests/unit/services/test_snapshot_scheduler.py
git commit -m "feat(statistics): add snapshot scheduler for automated daily map.sql download"
```

---

### Task 4: Statistics API Endpoints

**Files:**
- Create: `backend/app/domain/schemas/statistics.py`
- Create: `backend/app/services/statistics_service.py`
- Create: `backend/app/api/v1/endpoints/statistics.py`
- Modify: `backend/app/api/v1/__init__.py` — register router
- Test: `backend/tests/unit/services/test_statistics_service.py`

This is the API that powers all statistics pages: player rankings, alliance rankings, server overview, conquest activity, name changes.

- [ ] **Step 1: Create statistics schemas**

```python
# backend/app/domain/schemas/statistics.py
"""統計相關 Schema."""

from pydantic import BaseModel


class PlayerRankingItem(BaseModel):
    rank: int = 0
    player_id: int
    player_name: str
    alliance_name: str | None = None
    population: int = 0
    population_diff: int = 0
    villages: int = 0
    villages_diff: int = 0
    conquests: int = 0
    conquests_diff: int = 0


class AllianceRankingItem(BaseModel):
    rank: int = 0
    alliance_id: int
    alliance_name: str
    member_count: int = 0
    member_diff: int = 0
    village_count: int = 0
    village_diff: int = 0
    population: int = 0
    population_diff: int = 0
    population_per_member: int = 0
    conquests: int = 0
    conquests_diff: int = 0


class ConquestItem(BaseModel):
    village_id: int
    village_name: str
    x: int
    y: int
    old_player_name: str
    old_alliance_name: str | None = None
    new_player_name: str
    new_alliance_name: str | None = None
    detected_at: str


class NameChangeItem(BaseModel):
    player_id: int
    old_name: str
    new_name: str
    game_day: int | None = None
    detected_at: str


class ServerOverview(BaseModel):
    server_url: str
    round_year: int = 2026
    data_status: str = ""
    today: "ServerDayStats"
    yesterday: "ServerDayStats | None" = None


class ServerDayStats(BaseModel):
    total_players: int = 0
    active_players: int = 0
    new_players: int = 0
    deleted_players: int = 0
    villages_settled: int = 0
    villages_destroyed: int = 0
    conquests: int = 0
    total_population: int = 0
    population_diff: int = 0


class InactiveVillage(BaseModel):
    village_id: int
    village_name: str
    x: int
    y: int
    player_name: str
    alliance_name: str | None = None
    population: int = 0
    population_diff_1d: int = 0
    population_diff_7d: int = 0
    player_villages: int = 0
    playtime_days: int | None = None
    travel_time: str | None = None


class RankingRequest(BaseModel):
    server_url: str
    sort_by: str = "population"  # population, conquests, activity
    order: str = "desc"  # asc, desc
    page: int = 1
    page_size: int = 20
    tribe: str | None = None  # filter by tribe
    search: str | None = None  # search player/alliance name


class InactiveSearchRequest(BaseModel):
    server_url: str
    center_x: int = 0
    center_y: int = 0
    radius: int = 50
    max_population_change: int = 2
    min_player_villages: int | None = None
    max_player_population: int | None = None
    anti_noob: bool = False  # min 9 days playtime
    page: int = 1
    page_size: int = 50
```

- [ ] **Step 2: Create statistics service**

```python
# backend/app/services/statistics_service.py
"""統計查詢服務.

從已儲存的快照中查詢排名、征服、改名等統計資料。
"""

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.infrastructure.database.models.map_data import (
    MapAllianceData,
    MapConquest,
    MapNameChange,
    MapPlayerData,
    MapServerStats,
    MapSnapshot,
    MapVillageData,
)


class StatisticsService:
    """統計查詢服務."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_latest_snapshot(self, server_url: str) -> MapSnapshot | None:
        """取得最新快照."""
        return (
            self.db.query(MapSnapshot)
            .filter(MapSnapshot.server_url == server_url)
            .order_by(MapSnapshot.created_at.desc())
            .first()
        )

    def get_snapshot_n_days_ago(self, server_url: str, days: int = 7) -> MapSnapshot | None:
        """取得 N 天前的快照."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        return (
            self.db.query(MapSnapshot)
            .filter(
                MapSnapshot.server_url == server_url,
                MapSnapshot.created_at <= cutoff,
            )
            .order_by(MapSnapshot.created_at.desc())
            .first()
        )

    def get_player_ranking(
        self,
        server_url: str,
        sort_by: str = "population",
        order: str = "desc",
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> tuple[list[dict], int]:
        """取得玩家排名."""
        latest = self.get_latest_snapshot(server_url)
        if not latest:
            return [], 0

        old = self.get_snapshot_n_days_ago(server_url, 7)

        # 查詢當前玩家
        query = self.db.query(MapPlayerData).filter(
            MapPlayerData.snapshot_id == latest.snapshot_id
        )
        if search:
            query = query.filter(MapPlayerData.player_name.ilike(f"%{search}%"))

        total = query.count()

        # 排序
        sort_col = MapPlayerData.total_population
        if sort_by == "villages":
            sort_col = MapPlayerData.village_count
        order_fn = sort_col.desc() if order == "desc" else sort_col.asc()

        players = query.order_by(order_fn).offset((page - 1) * page_size).limit(page_size).all()

        # 取得舊快照的玩家資料做差異計算
        old_map = {}
        if old:
            old_players = self.db.query(MapPlayerData).filter(
                MapPlayerData.snapshot_id == old.snapshot_id
            ).all()
            old_map = {p.travian_player_id: p for p in old_players}

        # 取得征服數
        conquest_counts = {}
        conquest_rows = (
            self.db.query(
                MapConquest.new_player_id,
                func.count(MapConquest.conquest_id).label("cnt"),
            )
            .filter(MapConquest.server_url == server_url)
            .group_by(MapConquest.new_player_id)
            .all()
        )
        for row in conquest_rows:
            conquest_counts[row[0]] = row[1]

        result = []
        for i, p in enumerate(players):
            old_p = old_map.get(p.travian_player_id)
            result.append({
                "rank": (page - 1) * page_size + i + 1,
                "player_id": p.travian_player_id,
                "player_name": p.player_name,
                "alliance_name": p.alliance_name,
                "population": p.total_population,
                "population_diff": p.total_population - (old_p.total_population if old_p else 0),
                "villages": p.village_count,
                "villages_diff": p.village_count - (old_p.village_count if old_p else 0),
                "conquests": conquest_counts.get(p.travian_player_id, 0),
            })

        return result, total

    def get_alliance_ranking(
        self,
        server_url: str,
        sort_by: str = "population",
        order: str = "desc",
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> tuple[list[dict], int]:
        """取得聯盟排名."""
        latest = self.get_latest_snapshot(server_url)
        if not latest:
            return [], 0

        old = self.get_snapshot_n_days_ago(server_url, 7)

        query = self.db.query(MapAllianceData).filter(
            MapAllianceData.snapshot_id == latest.snapshot_id
        )
        if search:
            query = query.filter(MapAllianceData.alliance_name.ilike(f"%{search}%"))

        total = query.count()

        sort_col = MapAllianceData.total_population
        if sort_by == "members":
            sort_col = MapAllianceData.member_count
        order_fn = sort_col.desc() if order == "desc" else sort_col.asc()

        alliances = query.order_by(order_fn).offset((page - 1) * page_size).limit(page_size).all()

        old_map = {}
        if old:
            old_alliances = self.db.query(MapAllianceData).filter(
                MapAllianceData.snapshot_id == old.snapshot_id
            ).all()
            old_map = {a.travian_alliance_id: a for a in old_alliances}

        result = []
        for i, a in enumerate(alliances):
            old_a = old_map.get(a.travian_alliance_id)
            pop_per_member = a.total_population // a.member_count if a.member_count > 0 else 0
            result.append({
                "rank": (page - 1) * page_size + i + 1,
                "alliance_id": a.travian_alliance_id,
                "alliance_name": a.alliance_name,
                "member_count": a.member_count,
                "member_diff": a.member_count - (old_a.member_count if old_a else 0),
                "population": a.total_population,
                "population_diff": a.total_population - (old_a.total_population if old_a else 0),
                "population_per_member": pop_per_member,
            })

        return result, total

    def get_conquests(
        self, server_url: str, page: int = 1, page_size: int = 20
    ) -> tuple[list[dict], int]:
        """取得征服紀錄."""
        query = self.db.query(MapConquest).filter(
            MapConquest.server_url == server_url
        ).order_by(MapConquest.detected_at.desc())

        total = query.count()
        conquests = query.offset((page - 1) * page_size).limit(page_size).all()

        return [
            {
                "village_id": c.village_id,
                "village_name": c.village_name,
                "x": c.village_x,
                "y": c.village_y,
                "old_player_name": c.old_player_name,
                "old_alliance_name": c.old_alliance_name,
                "new_player_name": c.new_player_name,
                "new_alliance_name": c.new_alliance_name,
                "detected_at": c.detected_at.isoformat() if c.detected_at else "",
            }
            for c in conquests
        ], total

    def get_name_changes(
        self, server_url: str, page: int = 1, page_size: int = 20
    ) -> tuple[list[dict], int]:
        """取得改名紀錄."""
        query = self.db.query(MapNameChange).filter(
            MapNameChange.server_url == server_url
        ).order_by(MapNameChange.detected_at.desc())

        total = query.count()
        changes = query.offset((page - 1) * page_size).limit(page_size).all()

        return [
            {
                "player_id": c.player_id,
                "old_name": c.old_name,
                "new_name": c.new_name,
                "game_day": c.game_day,
                "detected_at": c.detected_at.isoformat() if c.detected_at else "",
            }
            for c in changes
        ], total

    def get_server_overview(self, server_url: str) -> dict | None:
        """取得伺服器總覽."""
        latest_stats = (
            self.db.query(MapServerStats)
            .filter(MapServerStats.server_url == server_url)
            .order_by(MapServerStats.created_at.desc())
            .first()
        )
        if not latest_stats:
            return None

        # 取得昨天的
        yesterday_stats = (
            self.db.query(MapServerStats)
            .filter(
                MapServerStats.server_url == server_url,
                MapServerStats.stats_id != latest_stats.stats_id,
            )
            .order_by(MapServerStats.created_at.desc())
            .first()
        )

        return {
            "server_url": server_url,
            "data_status": latest_stats.created_at.strftime("%d/%m/%Y") if latest_stats.created_at else "",
            "today": {
                "total_players": latest_stats.total_players,
                "active_players": latest_stats.active_players,
                "new_players": latest_stats.new_players,
                "deleted_players": latest_stats.deleted_players,
                "villages_settled": latest_stats.villages_settled,
                "villages_destroyed": latest_stats.villages_destroyed,
                "conquests": latest_stats.conquests_today,
                "total_population": latest_stats.total_population,
            },
            "yesterday": {
                "total_players": yesterday_stats.total_players if yesterday_stats else 0,
                "active_players": yesterday_stats.active_players if yesterday_stats else 0,
                "new_players": yesterday_stats.new_players if yesterday_stats else 0,
                "deleted_players": yesterday_stats.deleted_players if yesterday_stats else 0,
                "villages_settled": yesterday_stats.villages_settled if yesterday_stats else 0,
                "villages_destroyed": yesterday_stats.villages_destroyed if yesterday_stats else 0,
                "conquests": yesterday_stats.conquests_today if yesterday_stats else 0,
                "total_population": yesterday_stats.total_population if yesterday_stats else 0,
            } if yesterday_stats else None,
        }

    def search_inactive_villages(
        self,
        server_url: str,
        center_x: int = 0,
        center_y: int = 0,
        radius: int = 50,
        max_population_change: int = 2,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[dict], int]:
        """搜尋不活躍村莊（GetterTools 的 Search inactives）."""
        latest = self.get_latest_snapshot(server_url)
        old = self.get_snapshot_n_days_ago(server_url, 7)
        if not latest:
            return [], 0

        # 取得範圍內的村莊
        villages = (
            self.db.query(MapVillageData)
            .filter(
                MapVillageData.snapshot_id == latest.snapshot_id,
                MapVillageData.x >= center_x - radius,
                MapVillageData.x <= center_x + radius,
                MapVillageData.y >= center_y - radius,
                MapVillageData.y <= center_y + radius,
                MapVillageData.travian_player_id.isnot(None),
                MapVillageData.travian_player_id != 0,
            )
            .all()
        )

        # 建立舊快照的玩家人口 map
        old_player_pop = {}
        if old:
            for p in self.db.query(MapPlayerData).filter(
                MapPlayerData.snapshot_id == old.snapshot_id
            ).all():
                old_player_pop[p.travian_player_id] = p.total_population

        # 取得玩家資訊
        player_info = {}
        for p in self.db.query(MapPlayerData).filter(
            MapPlayerData.snapshot_id == latest.snapshot_id
        ).all():
            old_pop = old_player_pop.get(p.travian_player_id, p.total_population)
            pop_diff = p.total_population - old_pop
            player_info[p.travian_player_id] = {
                "population": p.total_population,
                "population_diff_7d": pop_diff,
                "village_count": p.village_count,
            }

        # 篩選不活躍
        result = []
        for v in villages:
            info = player_info.get(v.travian_player_id, {})
            pop_diff = info.get("population_diff_7d", 0)
            if abs(pop_diff) <= max_population_change:
                result.append({
                    "village_id": v.travian_village_id,
                    "village_name": v.village_name,
                    "x": v.x,
                    "y": v.y,
                    "player_name": v.player_name,
                    "alliance_name": v.alliance_name,
                    "population": v.population,
                    "population_diff_7d": pop_diff,
                    "player_villages": info.get("village_count", 0),
                })

        # 按人口排序
        result.sort(key=lambda x: x["population"])
        total = len(result)
        return result[(page - 1) * page_size: page * page_size], total
```

- [ ] **Step 3: Create API endpoint**

```python
# backend/app/api/v1/endpoints/statistics.py
"""伺服器統計 API 端點.

提供玩家/聯盟排名、征服活動、改名紀錄、不活躍搜尋等功能。
與 GetterTools 完全相同的功能，但使用我們自己的資料管道。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.services.statistics_service import StatisticsService

router = APIRouter(prefix="/statistics", tags=["Statistics"])


@router.get("/server-overview")
def get_server_overview(
    server_url: str = Query(..., description="Travian server URL"),
    db: Session = Depends(get_db),
):
    """伺服器總覽（等同 GetterTools Desktop 頁面）."""
    service = StatisticsService(db)
    return service.get_server_overview(server_url)


@router.get("/players/ranking")
def get_player_ranking(
    server_url: str = Query(...),
    sort_by: str = Query("population", regex="^(population|villages|conquests)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """玩家排名（等同 GetterTools Players 頁面）."""
    service = StatisticsService(db)
    items, total = service.get_player_ranking(
        server_url, sort_by, order, page, page_size, search
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/alliances/ranking")
def get_alliance_ranking(
    server_url: str = Query(...),
    sort_by: str = Query("population", regex="^(population|members|conquests)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """聯盟排名（等同 GetterTools Alliances 頁面）."""
    service = StatisticsService(db)
    items, total = service.get_alliance_ranking(
        server_url, sort_by, order, page, page_size, search
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/conquests")
def get_conquests(
    server_url: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """征服紀錄（等同 GetterTools Conquest activity）."""
    service = StatisticsService(db)
    items, total = service.get_conquests(server_url, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/name-changes")
def get_name_changes(
    server_url: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """改名紀錄（等同 GetterTools Change of name）."""
    service = StatisticsService(db)
    items, total = service.get_name_changes(server_url, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/search/inactives")
def search_inactives(
    server_url: str = Query(...),
    center_x: int = Query(0),
    center_y: int = Query(0),
    radius: int = Query(50, ge=1, le=100),
    max_population_change: int = Query(2, ge=0),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """搜尋不活躍村莊（等同 GetterTools Search inactives）."""
    service = StatisticsService(db)
    items, total = service.search_inactive_villages(
        server_url, center_x, center_y, radius, max_population_change, page, page_size
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/snapshot/trigger")
def trigger_snapshot(
    server_url: str = Query(..., description="Travian server URL to snapshot"),
    db: Session = Depends(get_db),
):
    """手動觸發一次快照下載."""
    from app.services.snapshot_scheduler import SnapshotScheduler
    scheduler = SnapshotScheduler(db)
    result = scheduler.download_snapshot(server_url)
    if result:
        return {"success": True, **result}
    return {"success": False, "message": "Failed to download snapshot"}
```

- [ ] **Step 4: Register router in __init__.py**

Add to `backend/app/api/v1/__init__.py`:

```python
from app.api.v1.endpoints.statistics import router as statistics_router
api_router.include_router(statistics_router)
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/domain/schemas/statistics.py backend/app/services/statistics_service.py backend/app/api/v1/endpoints/statistics.py backend/app/api/v1/__init__.py
git commit -m "feat(statistics): add statistics API with player/alliance ranking, conquests, inactives"
```

---

### Task 5-10: Frontend Pages (統計頁面)

Each page follows the same pattern: fetch from statistics API, display in a sortable table with pagination. Use existing shadcn/ui Table, Pagination components.

**Pages to create:**
- `ServerOverviewPage.tsx` — Server news + TOP-50 players/alliances
- `PlayerRankingPage.tsx` — Sortable player ranking table with tabs (Population, Ascending, Descending, Tribes, Conquests, Activity)
- `AllianceRankingPage.tsx` — Same for alliances
- `ConquestActivityPage.tsx` — Conquest log with filters
- `NameChangesPage.tsx` — Name change history
- `InactiveSearchPage.tsx` — Search form + results table

(Each page is a standard CRUD list view. Detailed step-by-step frontend tasks omitted here for brevity — follow existing `VillagesPage.tsx` patterns.)

---

## Phase 8: 進階計算器

### Overview

7 new stateless formula-based calculators. No database needed, pure computation.

### Calculator Specifications

#### 1. Interception Calculator (攔截計算器)
- Input: attacker_village(x,y), defender_village(x,y), attack_time, catcher_village(x,y), catcher_speed
- Formula: `distance = sqrt((x2-x1)² + (y2-y1)²)`, `travel_time = distance / speed * server_factor`
- Output: when to send catcher troops to intercept returning attacker

#### 2. Culture Points Calculator (文化點計算器)
- Input: current_cp, cp_production_per_day, current_villages
- Formula: CP needed for N-th village is defined by a lookup table (2000, 8000, 20000, 39000, ...)
- Output: date/time for each future village slot

#### 3. Technology Calculator (科技計算器)
- Input: tribe, research_level (0-20)
- Formula: `researched_value = base_value * (1 + 0.015 * level)^level` (per unit type: attack, def_inf, def_cav)
- Output: table showing base vs researched values for each troop

#### 4. NPC Calculator (NPC 計算器)
- Input: current_resources (wood, clay, iron, crop), troop_types_to_train, optimization_mode
- Formula: distribute resources across selected troop types based on optimization
- Output: number of each troop to train, leftover resources

#### 5. Save Troops Calculator (避兵計算器)
- Input: village(x,y), troop_speed, offline_duration, target_filters
- Formula: find inactive villages at distance = (offline_duration / 2) * speed
- Output: list of suitable target villages

#### 6. Path Calculator (路徑計算器)
- Input: start(x,y), target(x,y), unit_speed, tournament_square_level, hero_bonus, artifact
- Formula: `distance = sqrt(dx² + dy²)`, `ts_bonus = 1 + (ts_level * (speed - 20) / 20 * 0.1)` for speed > 20
- Output: distance, travel time

#### 7. Path-Speed-TS Reverse Calculator (TS 反推計算器)
- Input: attacker(x,y), target(x,y), travel_time, buffer_time
- Formula: reverse-calculate from travel_time + distance → possible speed + TS combinations
- Output: possible unit type + TS level combinations

### Task Structure

Each calculator follows this pattern:
1. Schema (request/response)
2. Service with formula logic + unit tests
3. API endpoint
4. Frontend page with form + result display

---

## Phase 9: 地圖與戰報

### 1. Interactive Map (GetterMap)
- Use Leaflet.js with custom tile layer
- Coordinate system: Travian uses (-200,-200) to (200,200)
- Markers for villages, colored by alliance
- Filter by alliance/player name
- Zoom, pan, tooltip with village info

### 2. Battle Report Parser
- Parse Travian battle report text (copy/paste format)
- Extract: attacker troops, defender troops, losses, bounty
- Generate shareable link
- Store in database (BattleReport model already exists)

### 3. Defense Tables
- Static reference table: all troops' defense values per crop
- Sort/filter by tribe, type (infantry/cavalry)
- Already have troop data in `troops.json`

---

## Phase 10: 聯盟協作工具 (Trooptool)

This is the most complex phase. Key features:
1. **Group/Alliance management** — create groups, invite members, assign roles
2. **Troop management** — members report their troops, leaders see overview
3. **Attack plan editor** — plan multi-wave attacks with timing
4. **Defense search** — find nearby allies who can defend
5. **Online times** — members set availability windows
6. **Alliance communication** — news feed, shoutbox

Each of these is a significant feature. Recommend breaking into sub-phases when Phase 6-9 are complete.

---

## Execution Dependencies

```
Phase 6 (Statistics Foundation)
  ├── Phase 7 (Search Tools) — depends on Phase 6 diff data
  ├── Phase 9 (Map & Reports) — depends on Phase 6 snapshot data
  └── Phase 10 (Alliance Tools) — depends on Phase 6 infrastructure

Phase 8 (Calculators) — independent, can run in parallel with Phase 6
```

**Recommended execution order:** Phase 6 → Phase 8 (parallel) → Phase 7 → Phase 9 → Phase 10
