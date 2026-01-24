# Browser MCP 整合研究報告

> TICKET-204: Browser MCP Integration Research

## 1. 研究目標

研究並設計 Browser MCP (Model Context Protocol) 整合方案，用於自動化抓取 Travian: Legends 遊戲數據。

## 2. Travian 頁面結構分析

### 2.1 主要頁面

| 頁面 | URL 模式 | 關鍵數據 |
|------|----------|----------|
| 村莊總覽 | `/dorf1.php` | 資源田等級、產量、人口 |
| 村莊中心 | `/dorf2.php` | 建築等級、升級狀態 |
| 地圖 | `/map.php` | 玩家村莊座標 |
| 軍隊 | `/build.php?id=39` | 部隊數量、訓練佇列 |
| 英雄 | `/hero.php` | 英雄狀態、冒險 |
| 報告 | `/reports.php` | 戰鬥報告 |

### 2.2 頁面 DOM 結構

#### 資源田 (dorf1.php)
```html
<div id="rx" class="f10">  <!-- 資源田位置 1-18 -->
  <div class="labelLayer">Lv.10</div>
</div>
```

#### 建築 (dorf2.php)
```html
<div id="a26" class="aid26">  <!-- 建築位置 19-40 -->
  <div class="labelLayer">Lv.20</div>
</div>
```

#### 資源數量
```html
<span id="l1">12345</span>  <!-- 木材 -->
<span id="l2">12345</span>  <!-- 黏土 -->
<span id="l3">12345</span>  <!-- 鐵礦 -->
<span id="l4">12345</span>  <!-- 糧食 -->
```

### 2.3 資源產量
```html
<table id="production">
  <tr><td class="num">+800</td></tr>  <!-- 每種資源產量 -->
</table>
```

## 3. 抓取策略

### 3.1 瀏覽器擴展方案 (推薦)

使用 Browser Extension 作為數據抓取層，優點：
- 完整的頁面 DOM 存取
- 不受 CORS 限制
- 可以使用者登入狀態
- 使用者完全控制抓取時機

架構：
```
瀏覽器擴展 → Content Script → 頁面 DOM
              ↓
         Background Script
              ↓
         後端 API (/api/v1/sync)
```

### 3.2 MCP Server 方案

使用 MCP (Model Context Protocol) 連接 Claude 和瀏覽器：

```
Claude → MCP Client → Browser MCP Server → Puppeteer/Playwright → Travian
```

挑戰：
- 需要管理 Session/Cookie
- 需要處理登入認證
- 可能觸發遊戲的反自動化機制

### 3.3 混合方案 (建議)

結合瀏覽器擴展和 MCP：
1. 瀏覽器擴展負責數據抓取（使用者控制）
2. MCP Server 提供 AI 分析能力
3. 後端 API 儲存和處理數據

## 4. 數據抓取流程設計

### 4.1 手動觸發流程
```
1. 使用者安裝瀏覽器擴展
2. 使用者登入 Travian
3. 使用者點擊擴展按鈕
4. 擴展抓取當前頁面數據
5. 數據發送到後端 API
6. 後端儲存並更新村莊數據
```

### 4.2 自動同步流程（可選）
```
1. 擴展監聽頁面變化
2. 檢測到相關頁面載入完成
3. 自動抓取數據
4. 背景發送到後端
5. 定期同步（如每 15 分鐘）
```

## 5. API 端點設計

### 5.1 數據同步 API

```
POST /api/v1/sync/village-overview
{
  "account_id": "uuid",
  "village_id": "uuid",
  "resources": {
    "wood": 12345,
    "clay": 12345,
    "iron": 12345,
    "crop": 12345
  },
  "production": {
    "wood": 800,
    "clay": 800,
    "iron": 800,
    "crop": 400
  },
  "resource_fields": [
    {"position": 1, "type": "wood", "level": 10},
    ...
  ]
}
```

```
POST /api/v1/sync/village-center
{
  "account_id": "uuid",
  "village_id": "uuid",
  "buildings": [
    {"position": 26, "building_id": "main_building", "level": 20},
    ...
  ]
}
```

### 5.2 批量同步 API

```
POST /api/v1/sync/full
{
  "account_id": "uuid",
  "villages": [
    {
      "name": "Village 1",
      "coordinates": {"x": 0, "y": 0},
      "resources": {...},
      "buildings": [...],
      "troops": [...]
    }
  ]
}
```

## 6. POC 實作計畫

### 6.1 Phase 1: 基本抓取
- [ ] 建立瀏覽器擴展骨架
- [ ] 實作資源田抓取
- [ ] 實作建築抓取
- [ ] 連接後端 API

### 6.2 Phase 2: 進階功能
- [ ] 多村莊支援
- [ ] 自動同步
- [ ] 錯誤處理

### 6.3 Phase 3: 整合 MCP
- [ ] 建立 MCP Server
- [ ] 連接 Claude API
- [ ] 提供 AI 分析

## 7. 風險與限制

### 7.1 技術風險
| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| 頁面結構變更 | 中 | 高 | 使用選擇器模式，定期監控 |
| 反自動化機制 | 低 | 高 | 限制抓取頻率，模擬人類行為 |
| 登入 Session 過期 | 高 | 中 | 提示使用者重新登入 |

### 7.2 法律與 ToS 考量
- Travian 使用條款可能禁止自動化
- 建議僅供個人使用
- 不要實作自動化操作（如自動建造）

## 8. 建議架構

```
┌─────────────────────────────────────────────────────────┐
│                    使用者電腦                            │
│  ┌─────────────────┐    ┌─────────────────────────────┐│
│  │ 瀏覽器擴展       │    │ Travian 遊戲頁面            ││
│  │ (Content Script)│◄───│ (DOM)                      ││
│  └────────┬────────┘    └─────────────────────────────┘│
│           │                                             │
│  ┌────────▼────────┐                                   │
│  │ Background      │                                   │
│  │ Script          │                                   │
│  └────────┬────────┘                                   │
└───────────┼─────────────────────────────────────────────┘
            │ HTTPS
            ▼
┌─────────────────────────────────────────────────────────┐
│                    後端伺服器                            │
│  ┌─────────────────┐    ┌─────────────────────────────┐│
│  │ Sync API        │───►│ Village Service             ││
│  │ /api/v1/sync/*  │    │                             ││
│  └─────────────────┘    └──────────┬──────────────────┘│
│                                     │                   │
│                         ┌───────────▼───────────────┐  │
│                         │ MySQL Database            │  │
│                         │ (villages, buildings...)  │  │
│                         └───────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 9. 結論

建議採用**瀏覽器擴展 + 後端 API** 的混合方案：

1. **安全性**：使用者完全控制抓取行為
2. **可靠性**：不需要管理複雜的認證機制
3. **合規性**：半自動化減少違反 ToS 的風險
4. **擴展性**：未來可整合 MCP 提供 AI 分析

下一步：TICKET-205 實作村莊數據抓取功能
