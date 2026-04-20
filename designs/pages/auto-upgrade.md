# 自動升級管理頁面

> 路由: `/automation/auto-upgrade`

## 相關 Tickets

- TICKET-502: 自動升級管理功能

---

## 頁面結構

```
┌─────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: 首頁 > 自動化 > 自動升級                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  自動升級管理                           [📜 升級日誌] [⚙️ 進階設定]  │
│  配置建築自動升級佇列                                                │
│                                                                     │
│  遊戲帳號: [玩家一號 (ts1.travian.com)                         ▼]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  全域設定                                                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│  │ ⚡ 自動升級│ │ 🏗️ 進行中 │ │ 📋 佇列中 │ │ ✅ 今日完成│            │
│  │    開啟   │ │     2    │ │    15    │ │     8     │            │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ 帳號特殊設定 ─────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  種族: 羅馬                                                  │  │
│  │                                                              │  │
│  │  [ ✓ ] 羅馬雙建築                                            │  │
│  │        同時建造兩個建築 (僅限羅馬種族)                       │  │
│  │                                                              │  │
│  │  [ ✓ ] Travian Plus 多建築                                   │  │
│  │        Plus 會員可使用多建築佇列                             │  │
│  │        目前佇列上限: [2] 個                                  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 村莊自動升級設定 ─────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  Tab: [全部] [已啟用] [已停用]                               │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  🏰 主村 (45, -78)                                      │ │  │
│  │  │                                                        │ │  │
│  │  │  自動升級              [====○====]  開啟               │ │  │
│  │  │                                                        │ │  │
│  │  │  當前升級佇列 (2/2)                                    │ │  │
│  │  │  ┌──────────────────────────────────────────────────┐ │ │  │
│  │  │  │  1. 🏛️ 本部 Lv15 → Lv16                          │ │ │  │
│  │  │  │     ⏱️ 剩餘 2h 35m                                │ │ │  │
│  │  │  │     🪵 25,500 🧱 24,000 ⛏️ 19,500 🌾 8,250        │ │ │  │
│  │  │  ├──────────────────────────────────────────────────┤ │ │  │
│  │  │  │  2. ⚔️ 兵營 Lv13 → Lv14                          │ │ │  │
│  │  │  │     ⏱️ 等待資源... (預計 1h 後開始)              │ │ │  │
│  │  │  │     🪵 10,200 🧱 8,925 ⛏️ 7,140 🌾 2,970 ⚠️     │ │ │  │
│  │  │  └──────────────────────────────────────────────────┘ │ │  │
│  │  │                                                        │ │  │
│  │  │  待升級佇列 (5 項)                                     │ │  │
│  │  │  ┌──────────────────────────────────────────────────┐ │ │  │
│  │  │  │  ≡ 3. 🐴 馬廄 Lv10 → Lv11       [⬆️] [⬇️] [🗑️] │ │ │  │
│  │  │  │  ≡ 4. 📦 倉庫 Lv15 → Lv16       [⬆️] [⬇️] [🗑️] │ │ │  │
│  │  │  │  ≡ 5. 🌾 糧倉 Lv15 → Lv16       [⬆️] [⬇️] [🗑️] │ │ │  │
│  │  │  │  ≡ 6. 🏪 市場 Lv9 → Lv10        [⬆️] [⬇️] [🗑️] │ │ │  │
│  │  │  │  ≡ 7. 📚 研究院 Lv10 → Lv11     [⬆️] [⬇️] [🗑️] │ │ │  │
│  │  │  └──────────────────────────────────────────────────┘ │ │  │
│  │  │                                                        │ │  │
│  │  │  [+ 新增升級項目]  [🤖 AI 建議]  [📊 ROI 排序]         │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  🌾 糧村一號 (52, -65)                                  │ │  │
│  │  │                                                        │ │  │
│  │  │  自動升級              [====○====]  開啟               │ │  │
│  │  │                                                        │ │  │
│  │  │  當前升級佇列 (1/2)                                    │ │  │
│  │  │  ┌──────────────────────────────────────────────────┐ │ │  │
│  │  │  │  1. 🌾 農田 Lv9 → Lv10                           │ │ │  │
│  │  │  │     ⏱️ 剩餘 45m                                   │ │ │  │
│  │  │  └──────────────────────────────────────────────────┘ │ │  │
│  │  │                                                        │ │  │
│  │  │  待升級佇列 (8 項)                                     │ │  │
│  │  │  ┌──────────────────────────────────────────────────┐ │ │  │
│  │  │  │  ≡ 2. 🌾 農田 Lv8 → Lv9         [⬆️] [⬇️] [🗑️] │ │ │  │
│  │  │  │  ≡ 3. 🌾 農田 Lv8 → Lv9         [⬆️] [⬇️] [🗑️] │ │ │  │
│  │  │  │  ... 展開檢視更多                                 │ │ │  │
│  │  │  └──────────────────────────────────────────────────┘ │ │  │
│  │  │                                                        │ │  │
│  │  │  [+ 新增升級項目]  [🤖 AI 建議]  [📊 ROI 排序]         │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  ⚔️ 軍事村 (38, -82)                         ⏸️ 已停用 │ │  │
│  │  │                                                        │ │  │
│  │  │  自動升級              [○====]  關閉                   │ │  │
│  │  │                                                        │ │  │
│  │  │  此村莊已停用自動升級功能                              │ │  │
│  │  │                                                        │ │  │
│  │  │  [啟用自動升級]                                        │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 新增升級項目 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  新增升級項目                                                  [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  村莊: 🏰 主村 (45, -78)                                            │
│                                                                     │
│  ┌─ 選擇建築 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  🔍 搜尋建築...                                              ││
│  │                                                              ││
│  │  分類: [全部 ▼]                                              ││
│  │                                                              ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │ 建築          │ 當前 │ 可升級 │ 資源需求      │ 時間  │ ││
│  │  ├────────────────────────────────────────────────────────┤ ││
│  │  │ 🏛️ 本部       │ Lv16 │ → Lv17 │ 32,640 總計   │ 8h 15m│ ││
│  │  │ ⚔️ 兵營       │ Lv14 │ → Lv15 │ 12,495 總計   │ 5h 40m│ ││
│  │  │ 🐴 馬廄       │ Lv11 │ → Lv12 │ 9,350 總計    │ 4h 20m│ ││
│  │  │ 🏭 工坊       │ Lv5  │ → Lv6  │ 3,280 總計    │ 1h 50m│ ││
│  │  │ 📚 研究院     │ Lv11 │ → Lv12 │ 8,750 總計    │ 3h 45m│ ││
│  │  │ 🏰 城牆       │ Lv12 │ → Lv13 │ 6,430 總計    │ 2h 55m│ ││
│  │  │ 📦 倉庫       │ Lv16 │ → Lv17 │ 11,200 總計   │ 3h 30m│ ││
│  │  │ 🌾 糧倉       │ Lv16 │ → Lv17 │ 11,200 總計   │ 3h 30m│ ││
│  │  │ 🏪 市場       │ Lv10 │ → Lv11 │ 5,850 總計    │ 2h 15m│ ││
│  │  │ ...          │      │        │               │       │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  已選擇: 🏭 工坊 Lv5 → Lv6                                         │
│                                                                     │
│  ┌─ 升級資訊 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  資源需求                                                    ││
│  │  🪵 木材    1,250 / 45,230    ✅                             ││
│  │  🧱 黏土    1,180 / 38,450    ✅                             ││
│  │  ⛏️ 鐵礦     680 / 52,100    ✅                             ││
│  │  🌾 糧食     170 / 28,900    ✅                             ││
│  │                                                              ││
│  │  建造時間: 1 小時 50 分鐘                                    ││
│  │                                                              ││
│  │  升級效果:                                                   ││
│  │  • 攻城器械訓練速度: -25% → -30%                            ││
│  │  • 人口: +2                                                  ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  插入位置: [佇列末端                                          ▼]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                        [取消]  [加入佇列]          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AI 建議 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  AI 升級建議                                                   [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🤖 基於你的帳號狀態，AI 為 主村 推薦以下升級優先順序:              │
│                                                                     │
│  ┌─ 建議升級項目 ─────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │ [☐] 1. 📦 倉庫 Lv15 → Lv16                  ROI: 高   │ ││
│  │  │                                                        │ ││
│  │  │     理由: 倉庫容量即將達到上限，升級後可避免資源溢出   │ ││
│  │  │     預計回報時間: 2.3 天                               │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │ [☐] 2. 🏛️ 本部 Lv15 → Lv16                  ROI: 中高 │ ││
│  │  │                                                        │ ││
│  │  │     理由: 提升建造速度，加快後續所有建築升級          │ ││
│  │  │     預計回報時間: 3.5 天                               │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │ [☐] 3. ⚔️ 兵營 Lv13 → Lv14                  ROI: 中   │ ││
│  │  │                                                        │ ││
│  │  │     理由: 你有大量步兵訓練需求，提升訓練效率          │ ││
│  │  │     預計回報時間: 4.8 天                               │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │ [☐] 4. 🏪 市場 Lv9 → Lv10                   ROI: 中   │ ││
│  │  │                                                        │ ││
│  │  │     理由: 增加商人數量可提升資源運送效率              │ ││
│  │  │     預計回報時間: 5.2 天                               │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  已選擇 0 項                                                        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                       [取消]  [全選]  [加入選中項目到佇列]          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 進階設定 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  自動升級進階設定                                              [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ 升級行為設定 ─────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  資源不足時的行為                                           ││
│  │  (●) 等待資源足夠後自動開始                                 ││
│  │  ( ) 跳過此項目，執行下一項                                 ││
│  │  ( ) 暫停自動升級，等待手動處理                             ││
│  │                                                              ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                              ││
│  │  建築佇列已滿時的行為                                       ││
│  │  (●) 等待佇列空位                                           ││
│  │  ( ) 傳送通知提醒                                           ││
│  │                                                              ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                              ││
│  │  [ ✓ ] 自動從商人獲取不足資源                               ││
│  │        當本村資源不足時，自動從其他村莊運送                 ││
│  │                                                              ││
│  │  [ ] 夜間暫停自動升級                                       ││
│  │      暫停時間: [23:00] 至 [07:00]                           ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 優先順序設定 ─────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  建築類型優先順序 (拖曳排序)                                ││
│  │                                                              ││
│  │  1. ≡ 資源建築 (倉庫、糧倉)                                 ││
│  │  2. ≡ 基礎建築 (本部、市場)                                 ││
│  │  3. ≡ 軍事建築 (兵營、馬廄、工坊)                           ││
│  │  4. ≡ 研究建築 (研究院)                                     ││
│  │  5. ≡ 防禦建築 (城牆)                                       ││
│  │  6. ≡ 資源田                                                ││
│  │                                                              ││
│  │  [ ] 自動依據 ROI 調整升級順序                              ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 通知設定 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  [ ✓ ] 建築升級完成時通知                                   ││
│  │  [ ✓ ] 資源不足時通知                                       ││
│  │  [ ] 佇列清空時通知                                         ││
│  │  [ ✓ ] 升級失敗時通知                                       ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                        [取消]  [儲存設定]          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 元件規格

### VillageUpgradeCard

```typescript
interface VillageUpgradeCardProps {
  village: VillageUpgradeConfig;
  onToggleEnabled: (enabled: boolean) => void;
  onAddItem: () => void;
  onAiSuggest: () => void;
  onRoiSort: () => void;
  onQueueItemMove: (itemId: string, direction: 'up' | 'down') => void;
  onQueueItemRemove: (itemId: string) => void;
}

interface VillageUpgradeConfig {
  id: string;
  villageId: string;
  villageName: string;
  coordinates: { x: number; y: number };
  enabled: boolean;
  maxQueueSlots: number;
  currentQueue: UpgradeQueueItem[];
  pendingQueue: UpgradeQueueItem[];
}

interface UpgradeQueueItem {
  id: string;
  buildingId: string;
  buildingName: string;
  buildingIcon: string;
  currentLevel: number;
  targetLevel: number;
  resources: ResourceAmount;
  buildTime: number; // 秒
  status: 'building' | 'waiting_resources' | 'pending';
  remainingTime?: number;
  estimatedStart?: Date;
}
```

### BuildingSelectorModal

```typescript
interface BuildingSelectorModalProps {
  villageId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (building: BuildingUpgradeOption) => void;
}

interface BuildingUpgradeOption {
  buildingId: string;
  buildingName: string;
  buildingIcon: string;
  category: BuildingCategory;
  currentLevel: number;
  maxLevel: number;
  resources: ResourceAmount;
  buildTime: number;
  effects: BuildingEffect[];
}

type BuildingCategory =
  | 'resource'      // 資源建築
  | 'infrastructure' // 基礎建築
  | 'military'      // 軍事建築
  | 'research'      // 研究建築
  | 'defense'       // 防禦建築
  | 'field';        // 資源田
```

### AiSuggestionModal

```typescript
interface AiSuggestionModalProps {
  villageId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToQueue: (items: AiSuggestedItem[]) => void;
}

interface AiSuggestedItem {
  buildingId: string;
  buildingName: string;
  buildingIcon: string;
  currentLevel: number;
  targetLevel: number;
  roiScore: 'high' | 'medium-high' | 'medium' | 'low';
  reason: string;
  estimatedRoiDays: number;
  resources: ResourceAmount;
  buildTime: number;
}
```

### AdvancedSettingsModal

```typescript
interface AdvancedSettingsModalProps {
  settings: AutoUpgradeSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AutoUpgradeSettings) => Promise<void>;
}

interface AutoUpgradeSettings {
  insufficientResourcesBehavior: 'wait' | 'skip' | 'pause';
  queueFullBehavior: 'wait' | 'notify';
  autoFetchResources: boolean;
  nightPause: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  categoryPriority: BuildingCategory[];
  autoRoiSort: boolean;
  notifications: {
    onComplete: boolean;
    onInsufficientResources: boolean;
    onQueueEmpty: boolean;
    onFailure: boolean;
  };
}
```

### UpgradeQueueList

```typescript
interface UpgradeQueueListProps {
  items: UpgradeQueueItem[];
  type: 'current' | 'pending';
  maxSlots?: number;
  onMove?: (itemId: string, direction: 'up' | 'down') => void;
  onRemove?: (itemId: string) => void;
  isDraggable?: boolean;
}
```

---

## 狀態管理

```typescript
interface AutoUpgradePageState {
  // 基本狀態
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;

  // 全域設定
  globalSettings: {
    autoUpgradeEnabled: boolean;
    romanDualBuild: boolean;
    plusMultiBuild: boolean;
    plusQueueLimit: number;
  };

  // 村莊配置
  villageConfigs: VillageUpgradeConfig[];

  // 進階設定
  advancedSettings: AutoUpgradeSettings;

  // Modal 狀態
  addingToVillage: string | null;
  showAiSuggestionFor: string | null;
  showAdvancedSettings: boolean;
  showLogs: boolean;

  // 統計
  stats: {
    currentlyBuilding: number;
    inQueue: number;
    completedToday: number;
  };
}
```

---

## API 整合

```typescript
// 取得自動升級設定
GET /api/v1/automation/auto-upgrade?account_id={id}
Response: {
  globalSettings: GlobalUpgradeSettings;
  villageConfigs: VillageUpgradeConfig[];
  advancedSettings: AutoUpgradeSettings;
}

// 更新全域設定
PUT /api/v1/automation/auto-upgrade/settings
Request: GlobalUpgradeSettings
Response: GlobalUpgradeSettings

// 切換村莊自動升級
PUT /api/v1/automation/auto-upgrade/villages/{villageId}/toggle
Request: { enabled: boolean }
Response: VillageUpgradeConfig

// 新增升級項目到佇列
POST /api/v1/automation/auto-upgrade/villages/{villageId}/queue
Request: {
  buildingId: string;
  targetLevel: number;
  position?: number;
}
Response: UpgradeQueueItem

// 調整佇列順序
PUT /api/v1/automation/auto-upgrade/villages/{villageId}/queue/reorder
Request: { itemIds: string[] }
Response: { success: true }

// 移除佇列項目
DELETE /api/v1/automation/auto-upgrade/villages/{villageId}/queue/{itemId}
Response: { success: true }

// 取得 AI 建議
POST /api/v1/automation/auto-upgrade/villages/{villageId}/ai-suggest
Response: AiSuggestedItem[]

// ROI 排序
POST /api/v1/automation/auto-upgrade/villages/{villageId}/roi-sort
Response: VillageUpgradeConfig

// 更新進階設定
PUT /api/v1/automation/auto-upgrade/advanced-settings
Request: AutoUpgradeSettings
Response: AutoUpgradeSettings

// 取得升級日誌
GET /api/v1/automation/auto-upgrade/logs?account_id={id}&page={page}&limit={limit}
Response: {
  logs: UpgradeLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}
```

---

## i18n 支援

```typescript
// zh-TW
const zhTW = {
  autoUpgrade: {
    title: '自動升級管理',
    subtitle: '配置建築自動升級佇列',

    globalSettings: {
      autoUpgrade: '自動升級',
      currentlyBuilding: '進行中',
      inQueue: '佇列中',
      completedToday: '今日完成',
    },

    accountSettings: {
      title: '帳號特殊設定',
      romanDualBuild: '羅馬雙建築',
      romanDualBuildDesc: '同時建造兩個建築 (僅限羅馬種族)',
      plusMultiBuild: 'Travian Plus 多建築',
      plusMultiBuildDesc: 'Plus 會員可使用多建築佇列',
      queueLimit: '目前佇列上限',
    },

    villageConfig: {
      title: '村莊自動升級設定',
      tabs: {
        all: '全部',
        enabled: '已啟用',
        disabled: '已停用',
      },
      autoUpgrade: '自動升級',
      currentQueue: '當前升級佇列',
      pendingQueue: '待升級佇列',
      remainingTime: '剩餘',
      waitingResources: '等待資源...',
      estimatedStart: '預計 {time} 後開始',
      addItem: '新增升級項目',
      aiSuggest: 'AI 建議',
      roiSort: 'ROI 排序',
      enableAutoUpgrade: '啟用自動升級',
      disabledMessage: '此村莊已停用自動升級功能',
    },

    modal: {
      addItem: '新增升級項目',
      aiSuggestion: 'AI 升級建議',
      advancedSettings: '自動升級進階設定',
      logs: '升級日誌',
    },

    building: {
      searchPlaceholder: '搜尋建築...',
      category: '分類',
      currentLevel: '當前',
      targetLevel: '目標',
      resourcesNeeded: '資源需求',
      buildTime: '建造時間',
      effects: '升級效果',
      insertPosition: '插入位置',
      queueEnd: '佇列末端',
    },

    ai: {
      title: '基於你的帳號狀態，AI 為 {village} 推薦以下升級優先順序:',
      roi: {
        high: '高',
        'medium-high': '中高',
        medium: '中',
        low: '低',
      },
      reason: '理由',
      estimatedRoi: '預計回報時間',
      days: '天',
      selected: '已選擇 {count} 項',
      selectAll: '全選',
      addSelected: '加入選中項目到佇列',
    },
  },
};

// en
const en = {
  autoUpgrade: {
    title: 'Auto Upgrade Management',
    subtitle: 'Configure automatic building upgrade queue',

    globalSettings: {
      autoUpgrade: 'Auto Upgrade',
      currentlyBuilding: 'Building',
      inQueue: 'In Queue',
      completedToday: 'Completed Today',
    },

    accountSettings: {
      title: 'Account Special Settings',
      romanDualBuild: 'Roman Dual Build',
      romanDualBuildDesc: 'Build two buildings simultaneously (Romans only)',
      plusMultiBuild: 'Travian Plus Multi-Build',
      plusMultiBuildDesc: 'Plus members can use multi-build queue',
      queueLimit: 'Current queue limit',
    },

    villageConfig: {
      title: 'Village Auto Upgrade Settings',
      tabs: {
        all: 'All',
        enabled: 'Enabled',
        disabled: 'Disabled',
      },
      autoUpgrade: 'Auto Upgrade',
      currentQueue: 'Current Build Queue',
      pendingQueue: 'Pending Queue',
      remainingTime: 'Remaining',
      waitingResources: 'Waiting for resources...',
      estimatedStart: 'Expected to start in {time}',
      addItem: 'Add Upgrade',
      aiSuggest: 'AI Suggest',
      roiSort: 'ROI Sort',
      enableAutoUpgrade: 'Enable Auto Upgrade',
      disabledMessage: 'Auto upgrade is disabled for this village',
    },

    modal: {
      addItem: 'Add Upgrade Item',
      aiSuggestion: 'AI Upgrade Suggestions',
      advancedSettings: 'Advanced Auto Upgrade Settings',
      logs: 'Upgrade Logs',
    },

    building: {
      searchPlaceholder: 'Search buildings...',
      category: 'Category',
      currentLevel: 'Current',
      targetLevel: 'Target',
      resourcesNeeded: 'Resources Needed',
      buildTime: 'Build Time',
      effects: 'Upgrade Effects',
      insertPosition: 'Insert Position',
      queueEnd: 'End of Queue',
    },

    ai: {
      title: 'Based on your account status, AI recommends the following upgrade priority for {village}:',
      roi: {
        high: 'High',
        'medium-high': 'Medium-High',
        medium: 'Medium',
        low: 'Low',
      },
      reason: 'Reason',
      estimatedRoi: 'Estimated ROI',
      days: 'days',
      selected: '{count} selected',
      selectAll: 'Select All',
      addSelected: 'Add Selected to Queue',
    },
  },
};
```

---

## 錯誤處理

```typescript
interface UpgradeError {
  code: string;
  message: string;
  details?: object;
}

// 錯誤代碼
const ERROR_CODES = {
  INSUFFICIENT_RESOURCES: 'insufficient_resources',    // 資源不足
  QUEUE_FULL: 'queue_full',                           // 佇列已滿
  BUILDING_MAX_LEVEL: 'building_max_level',           // 建築已達最高等級
  PREREQUISITE_NOT_MET: 'prerequisite_not_met',       // 前置條件不符
  UPGRADE_IN_PROGRESS: 'upgrade_in_progress',         // 升級進行中
  VILLAGE_NOT_FOUND: 'village_not_found',             // 村莊不存在
  BUILDING_NOT_FOUND: 'building_not_found',           // 建築不存在
  NETWORK_ERROR: 'network_error',                     // 網路錯誤
};

// 錯誤訊息顯示
const errorMessages = {
  insufficient_resources: '資源不足，無法開始升級',
  queue_full: '建築佇列已滿，請等待當前升級完成',
  building_max_level: '此建築已達最高等級',
  prerequisite_not_met: '未滿足前置條件，請先升級相關建築',
  upgrade_in_progress: '此建築正在升級中',
  village_not_found: '村莊資料不存在，請重新同步',
  building_not_found: '建築資料不存在',
  network_error: '網路連線錯誤，請檢查網路後重試',
};
```

---

## 響應式設計

### Desktop (>= 1024px)
- 村莊卡片完整顯示
- 統計卡片水平排列 (4 欄)
- 佇列項目完整顯示所有操作按鈕
- Modal 寬度 700px

### Tablet (768px - 1023px)
- 統計卡片 2x2 網格
- Modal 寬度 90%
- 村莊卡片完整顯示
- 佇列項目操作按鈕改為下拉選單

### Mobile (< 768px)
- 統計卡片垂直堆疊
- Modal 全螢幕
- 村莊卡片簡化顯示
- 佇列項目改為可點擊展開詳情
- 拖曳改為上下移動按鈕
