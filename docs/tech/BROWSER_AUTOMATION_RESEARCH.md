# 瀏覽器自動化技術研究報告

> Phase 4 半自動執行系統 - 技術研究文件
> 更新日期: 2026-01-29

## 1. 研究目標

研究並評估各種瀏覽器自動化技術，用於實現 Travian: Legends 的半自動執行功能（建造、訓練、資源管理）。

## 2. 技術方案評估

### 2.1 Nodriver (Python) ⭐ 推薦方案

**專案資訊**:
- GitHub: https://github.com/AcutisPrime/nodriver
- 語言: Python
- 維護狀態: 活躍維護中

**特點**:
- 繞過 CDP (Chrome DevTools Protocol) 協議檢測
- 直接使用 Chrome，無需修補的 chromedriver
- 原生支援 asyncio
- 比 Puppeteer Stealth 更難被偵測
- Python 生態系統整合良好（與後端技術棧一致）

**反偵測能力**:
| 偵測類型 | 繞過能力 |
|---------|---------|
| navigator.webdriver | ✅ 完全繞過 |
| CDP 協議偵測 | ✅ 完全繞過 |
| Chrome.runtime 檢測 | ✅ 完全繞過 |
| 自動化標記 | ✅ 自動移除 |

**範例程式碼**:
```python
import nodriver as uc

async def main():
    browser = await uc.start()
    page = await browser.get('https://travian.com')

    # 等待元素並點擊
    button = await page.select('.build-button')
    await button.click()

    await browser.stop()

if __name__ == '__main__':
    uc.loop().run_until_complete(main())
```

**優點**:
- Python 原生，與後端無縫整合
- 反偵測能力最強
- 不需要額外的 chromedriver 管理
- asyncio 支援良好

**缺點**:
- 相對較新的專案
- 文件較少（但 API 直觀）

---

### 2.2 Puppeteer Real Browser (Node.js)

**專案資訊**:
- GitHub: https://github.com/nicnocquee/puppeteer-real-browser
- 語言: JavaScript/Node.js
- 維護狀態: ⚠️ 2026 年 2 月停止維護

**特點**:
- 基於 Rebrowser Patches
- 修補 Puppeteer 以繞過偵測
- 支援 Fingerprint Spoofing

**不推薦原因**:
- 已停止維護
- Node.js 需要額外的服務層
- 與 Python 後端不同技術棧

---

### 2.3 Puppeteer Stealth (Node.js)

**專案資訊**:
- GitHub: https://github.com/niceguyjames/puppeteer-extra-plugin-stealth
- 語言: JavaScript/Node.js
- 維護狀態: 維護中

**隱身模組**:
| 模組 | 功能 |
|------|------|
| user-agent-override | 覆蓋 User-Agent |
| navigator.webdriver | 移除 webdriver 標記 |
| chrome.runtime | 模擬 Chrome 擴展環境 |
| media.codecs | 模擬媒體解碼器 |
| iframe.contentWindow | 修復 iframe 偵測 |
| webgl.vendor | 覆蓋 WebGL 渲染器資訊 |
| navigator.plugins | 模擬瀏覽器外掛 |

**侷限性**:
- 無法繞過 CDP 協議層級偵測
- 對進階反機器人系統（如 DataDome、Kasada）效果有限
- 需要定期更新以應對偵測規則變化

---

### 2.4 undetected-chromedriver (Python)

**專案資訊**:
- GitHub: https://github.com/ultrafunkamsterdam/undetected-chromedriver
- 語言: Python
- 維護狀態: 維護中，但更新頻率下降

**特點**:
- 自動修補 chromedriver
- 移除自動化標記
- Selenium 相容

**與 Nodriver 比較**:
| 比較項目 | undetected-chromedriver | Nodriver |
|---------|------------------------|----------|
| CDP 偵測繞過 | ❌ | ✅ |
| 維護活躍度 | 中 | 高 |
| Async 支援 | 有限 | 原生 |
| 效能 | 中 | 高 |

---

## 3. Travian 反偵測機制分析

### 3.1 已知偵測方式

| 偵測類型 | 說明 | 風險等級 |
|---------|------|---------|
| Multihunter 系統 | 人工審查異常行為 | 高 |
| 行為模式分析 | 偵測規律性操作時間 | 中 |
| 點擊軌跡分析 | 偵測機器人式精確點擊 | 中 |
| 請求頻率分析 | 偵測過於頻繁的操作 | 中 |
| 時間規律偵測 | 偵測固定間隔操作 | 高 |

### 3.2 建議的規避策略

```python
# 隨機延遲機制
import random

def get_random_delay():
    """產生隨機延遲（1-5 秒，正態分佈）"""
    base = 3.0  # 基準延遲
    variance = random.gauss(0, 1)  # 正態分佈
    delay = max(1.0, base + variance)  # 最少 1 秒
    return min(delay, 5.0)  # 最多 5 秒

# 人類化滑鼠移動
async def human_like_click(page, element):
    """模擬人類點擊行為"""
    # 加入隨機偏移
    offset_x = random.randint(-5, 5)
    offset_y = random.randint(-5, 5)

    # 等待隨機時間後點擊
    await asyncio.sleep(get_random_delay())
    await element.click(offset=(offset_x, offset_y))
```

---

## 4. 技術架構建議

### 4.1 推薦架構

```
┌─────────────────────────────────────────────────────────────────┐
│                      使用者介面 (Frontend)                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 執行確認介面                                                  ││
│  │ - 操作預覽                                                   ││
│  │ - 確認/取消按鈕                                              ││
│  │ - 執行狀態顯示                                               ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      後端服務 (FastAPI)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ExecutionQueue  │  │ ExecutionEngine │  │ SafetyService   │ │
│  │ 操作佇列管理     │─▶│ Nodriver 整合    │─▶│ 安全機制       │ │
│  └─────────────────┘  └────────┬────────┘  └─────────────────┘ │
│                                │                                 │
│                                ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ExecutionLogger - 操作日誌記錄                               ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────────────┘
                           │ Nodriver
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Chrome 瀏覽器實例                           │
│  - 使用者登入狀態                                                │
│  - 遊戲頁面操作                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 核心元件設計

#### ExecutionQueue（操作佇列）

```python
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

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

@dataclass
class ExecutionTask:
    id: str
    account_id: str
    village_id: str
    execution_type: ExecutionType
    target: str  # building_id 或 troop_id
    quantity: int = 1
    status: ExecutionStatus = ExecutionStatus.PENDING
    created_at: datetime = None
    confirmed_at: datetime = None
    executed_at: datetime = None
    result: dict = None
```

#### SafetyService（安全機制）

```python
class SafetyService:
    # 每日操作限制
    DAILY_OPERATION_LIMIT = 100

    # 最小操作間隔（秒）
    MIN_OPERATION_INTERVAL = 60

    # 操作時段限制（避免半夜操作）
    ALLOWED_HOURS = range(7, 24)  # 07:00-23:59

    async def validate_operation(self, task: ExecutionTask) -> bool:
        """驗證操作是否符合安全規則"""
        # 1. 檢查每日限制
        # 2. 檢查操作間隔
        # 3. 檢查操作時段
        # 4. 檢查資源是否足夠
        pass
```

---

## 5. 風險評估與緩解

### 5.1 風險矩陣

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| 帳號被封禁 | 中 | 高 | 人工確認、隨機延遲、操作限制 |
| 偵測規則更新 | 中 | 中 | 定期更新 Nodriver、監控偵測 |
| 操作失敗 | 低 | 低 | 重試機制、錯誤處理 |
| 資料不一致 | 低 | 中 | 操作前後驗證、同步檢查 |

### 5.2 必要安全措施

1. **人工確認機制**: 所有操作必須經使用者確認
2. **隨機延遲**: 1-5 秒隨機延遲，模擬人類行為
3. **每日限制**: 限制每日操作次數
4. **操作日誌**: 完整記錄所有操作
5. **時段控制**: 避免不合理時段操作

---

## 6. 法律與 ToS 考量

### 6.1 Travian 使用條款重點

> ⚠️ **重要**: Travian 使用條款明確禁止使用自動化工具

相關條款（摘要）:
- 禁止使用機器人、腳本、或自動化工具
- 禁止以任何方式干擾遊戲正常運作
- 違反者可能被永久封禁

### 6.2 建議做法

1. **僅供個人使用**: 不公開分發自動化功能
2. **半自動模式**: 保持人工確認環節
3. **使用者責任**: 明確告知風險，由使用者自行決定
4. **功能限制**: 不實作完全自動化（如自動農場）

---

## 7. 實作建議

### 7.1 Phase 4 實作優先順序

1. **TICKET-401**: 操作佇列系統設計
   - 實作 ExecutionQueue 資料模型
   - 設計確認介面 UI

2. **TICKET-402**: 半自動建造執行
   - 整合 Nodriver
   - 實作建造操作
   - 加入安全機制

3. **TICKET-403**: 半自動訓練執行
   - 擴展執行引擎
   - 訓練操作支援

4. **TICKET-404**: 操作日誌系統
   - 完整操作記錄
   - 日誌查詢介面

5. **TICKET-405**: 排程提醒系統
   - 瀏覽器通知
   - 提醒規則設定

### 7.2 技術準備

```bash
# 安裝 Nodriver
pip install nodriver

# 額外依賴
pip install aiohttp  # 非同步 HTTP
pip install python-dotenv  # 環境變數
```

### 7.3 配置需求

```python
# config/automation.py
class AutomationConfig:
    # Chrome 設定
    CHROME_HEADLESS = False  # 建議使用有頭模式，更不容易被偵測
    CHROME_USER_DATA_DIR = None  # 可選：使用現有 Chrome Profile

    # 安全設定
    MIN_DELAY_SECONDS = 1.0
    MAX_DELAY_SECONDS = 5.0
    DAILY_OPERATION_LIMIT = 100

    # 功能開關
    ENABLE_BUILD_EXECUTION = True
    ENABLE_TRAIN_EXECUTION = True
    ENABLE_ADVENTURE_EXECUTION = False  # 預設關閉
```

---

## 8. 結論與建議

### 8.1 技術選型結論

**推薦方案**: Nodriver (Python)

理由:
1. ✅ 與後端技術棧一致（Python + FastAPI）
2. ✅ 反偵測能力最強（繞過 CDP 偵測）
3. ✅ 活躍維護中
4. ✅ 原生 asyncio 支援
5. ✅ 不需要管理 chromedriver

### 8.2 實作建議

1. **保守策略**: 優先實作瀏覽器擴展數據同步，自動執行作為可選功能
2. **漸進式開發**: 先實作建造執行，驗證可行性後再擴展
3. **安全優先**: 所有安全機制必須在第一版就實作完成
4. **使用者告知**: 明確告知風險與 ToS 相關資訊

---

## 變更記錄

| 版本 | 日期 | 變更內容 |
|------|------|----------|
| 1.0 | 2026-01-29 | 初版建立，評估 Nodriver、Puppeteer Stealth 等方案 |
