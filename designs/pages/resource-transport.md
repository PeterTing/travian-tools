# 資源運送管理頁面

> 路由: `/automation/resource-transport`

## 相關 Tickets

- TICKET-501: 資源運送管理功能

---

## 頁面結構

```
┌─────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: 首頁 > 自動化 > 資源運送                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  資源運送管理                           [📜 運送日誌] [⚙️ 設定]     │
│  配置村莊間的資源自動調配                                            │
│                                                                     │
│  遊戲帳號: [玩家一號 (ts1.travian.com)                         ▼]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  全域控制                                                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│  │ ⏱️ 自動運送│ │ 📦 總運送次│ │ 🏘️ 參與村莊│ │ ⚠️ 待處理  │            │
│  │    開啟   │ │    156    │ │    4/5    │ │     2     │            │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ 定時運送設定 ─────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  自動運送               [====○====]  開啟                    │  │
│  │                                                              │  │
│  │  運送間隔                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────┐│  │
│  │  │  每  [30]  分鐘執行一次檢查                              ││  │
│  │  │  (建議: 15-60 分鐘)                                     ││  │
│  │  └─────────────────────────────────────────────────────────┘│  │
│  │                                                              │  │
│  │  下次檢查: 15:45:00 (12 分鐘後)                              │  │
│  │                                                              │  │
│  │  [▶️ 立即執行運送]                                           │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 村莊運送配置 ─────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  模式: (●) 多對一  ( ) 一對多  ( ) 自動平衡                  │  │
│  │                                                              │  │
│  │  拖曳調整運送優先順序                                        │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  ≡  🏰 主村 (45, -78)                    📥 接收       │ │  │
│  │  │                                                        │ │  │
│  │  │     資源狀態                                           │ │  │
│  │  │     🪵 45,230/80,000  🧱 38,450/80,000                 │ │  │
│  │  │     ⛏️ 52,100/80,000  🌾 28,900/80,000                 │ │  │
│  │  │                                                        │ │  │
│  │  │     滿倉時間上限: [8] 小時                             │ │  │
│  │  │     保留資源: 木[5000] 磚[5000] 鐵[5000] 糧[5000]      │ │  │
│  │  │                                                        │ │  │
│  │  │     [✏️ 編輯設定]                                      │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  ≡  🌾 糧村一號 (52, -65)               📤 運出        │ │  │
│  │  │                                                        │ │  │
│  │  │     資源狀態                                           │ │  │
│  │  │     🪵 12,300/40,000  🧱 15,200/40,000                 │ │  │
│  │  │     ⛏️ 8,900/40,000   🌾 75,200/120,000  ⚠️ 快滿倉    │ │  │
│  │  │                                                        │ │  │
│  │  │     預估滿倉時間: 2 小時 15 分鐘                       │ │  │
│  │  │     保留資源: 木[2000] 磚[2000] 鐵[2000] 糧[10000]     │ │  │
│  │  │                                                        │ │  │
│  │  │     [✏️ 編輯設定]                                      │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  ≡  ⚔️ 軍事村 (38, -82)                  📤 運出       │ │  │
│  │  │                                                        │ │  │
│  │  │     資源狀態                                           │ │  │
│  │  │     🪵 35,600/60,000  🧱 42,100/60,000                 │ │  │
│  │  │     ⛏️ 28,400/60,000  🌾 15,800/60,000                 │ │  │
│  │  │                                                        │ │  │
│  │  │     預估滿倉時間: 6 小時 45 分鐘                       │ │  │
│  │  │     保留資源: 木[3000] 磚[3000] 鐵[3000] 糧[8000]      │ │  │
│  │  │                                                        │ │  │
│  │  │     [✏️ 編輯設定]                                      │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  ≡  🏘️ 分村二號 (60, -90)               ⏸️ 停用       │ │  │
│  │  │                                                        │ │  │
│  │  │     此村莊已停用資源運送                               │ │  │
│  │  │                                                        │ │  │
│  │  │     [✏️ 編輯設定]                                      │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 外部運送 ─────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  運送到其他玩家村莊 (手動輸入座標)                          │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │  盟友供糧 - (120, -45)                   ⏱️ 每 6 小時  │ │  │
│  │  │  從: 糧村一號                                          │ │  │
│  │  │  運送: 🌾 20,000                                       │ │  │
│  │  │  [✏️ 編輯] [🗑️ 刪除]                                  │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  [+ 新增外部運送]                                           │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 村莊運送設定 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  編輯村莊運送設定                                              [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🌾 糧村一號 (52, -65)                                              │
│                                                                     │
│  ┌─ 運送角色 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  (●) 📤 運出 - 將資源運送到其他村莊                         ││
│  │  ( ) 📥 接收 - 從其他村莊接收資源                           ││
│  │  ( ) ⏸️ 停用 - 不參與自動運送                               ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 滿倉時間上限 ─────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  當任一資源預計在 [4] 小時內滿倉時，觸發運送                ││
│  │                                                              ││
│  │  ○──────────────●──────────────○                             ││
│  │  1h           4h              12h                            ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 保留資源 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  運送時保留以下資源不動                                     ││
│  │                                                              ││
│  │  🪵 木材    ┌──────────┐                                    ││
│  │            │   2000   │                                    ││
│  │            └──────────┘                                    ││
│  │                                                              ││
│  │  🧱 黏土    ┌──────────┐                                    ││
│  │            │   2000   │                                    ││
│  │            └──────────┘                                    ││
│  │                                                              ││
│  │  ⛏️ 鐵礦    ┌──────────┐                                    ││
│  │            │   2000   │                                    ││
│  │            └──────────┘                                    ││
│  │                                                              ││
│  │  🌾 糧食    ┌──────────┐                                    ││
│  │            │  10000   │                                    ││
│  │            └──────────┘                                    ││
│  │                                                              ││
│  │  [快速設定: 全部清零] [快速設定: 1小時產量]                 ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 運送優先 (僅運出模式) ────────────────────────────────────────┐│
│  │                                                              ││
│  │  優先運送資源類型 (拖曳排序)                                ││
│  │                                                              ││
│  │  1. ≡ 🌾 糧食 (快滿倉優先)                                  ││
│  │  2. ≡ 🧱 黏土                                               ││
│  │  3. ≡ ⛏️ 鐵礦                                               ││
│  │  4. ≡ 🪵 木材                                               ││
│  │                                                              ││
│  │  [ ] 自動依據滿倉時間調整優先順序                           ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                        [取消]  [儲存設定]          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 外部運送設定 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  新增外部運送                                                  [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  運送名稱                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 盟友供糧                                                       ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 目標座標 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  X 座標         Y 座標                                       ││
│  │  ┌─────────┐   ┌─────────┐                                   ││
│  │  │   120   │   │   -45   │                                   ││
│  │  └─────────┘   └─────────┘                                   ││
│  │                                                              ││
│  │  [驗證座標] ✅ 座標有效 - 村莊: xxx                         ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 來源村莊 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  [糧村一號 (52, -65)                                    ▼]  ││
│  │                                                              ││
│  │  商人數量: 10 / 最大可用: 12                                ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 運送資源 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  🪵 木材    ┌──────────┐    現有: 12,300                    ││
│  │            │     0    │                                    ││
│  │            └──────────┘                                    ││
│  │                                                              ││
│  │  🧱 黏土    ┌──────────┐    現有: 15,200                    ││
│  │            │     0    │                                    ││
│  │            └──────────┘                                    ││
│  │                                                              ││
│  │  ⛏️ 鐵礦    ┌──────────┐    現有: 8,900                     ││
│  │            │     0    │                                    ││
│  │            └──────────┘                                    ││
│  │                                                              ││
│  │  🌾 糧食    ┌──────────┐    現有: 75,200                    ││
│  │            │  20000   │                                    ││
│  │            └──────────┘                                    ││
│  │                                                              ││
│  │  總計: 20,000 資源 / 需要 2 趟商人                          ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 運送排程 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  (●) 週期運送  每 [6] 小時執行一次                          ││
│  │  ( ) 單次運送  立即執行一次                                 ││
│  │  ( ) 排程運送  指定時間執行                                 ││
│  │                                                              ││
│  │  預估抵達時間: 45 分鐘                                      ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                        [取消]  [建立運送]          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 運送日誌 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  運送日誌                                                      [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  篩選: [全部 ▼]  日期: [今天 ▼]                     [🔄 重新整理]  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 時間          │ 來源      │ 目標      │ 資源       │ 狀態    │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ 14:32:15     │ 糧村一號  │ 主村      │ 🌾 25,000  │ ✅ 完成 │ │
│  │ 14:32:18     │ 軍事村    │ 主村      │ 🪵 15,000  │ ✅ 完成 │ │
│  │              │           │           │ 🧱 18,000  │         │ │
│  │ 14:00:00     │ 糧村一號  │ (120,-45) │ 🌾 20,000  │ ✅ 完成 │ │
│  │ 13:32:10     │ 糧村一號  │ 主村      │ 🌾 22,000  │ ✅ 完成 │ │
│  │ 12:30:45     │ 軍事村    │ 主村      │ ⛏️ 12,000  │ ❌ 失敗 │ │
│  │              │           │           │            │ 商人不足│ │
│  │ ...          │           │           │            │         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  共 156 筆記錄                              [< 上一頁] 1/16 [下一頁 >]│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 元件規格

### VillageTransportCard

```typescript
interface VillageTransportCardProps {
  village: VillageTransportConfig;
  onEdit: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

interface VillageTransportConfig {
  id: string;
  villageId: string;
  villageName: string;
  coordinates: { x: number; y: number };
  role: 'send' | 'receive' | 'disabled';
  resources: ResourceStatus;
  capacity: ResourceCapacity;
  estimatedFullTime: number | null; // 預估滿倉時間 (分鐘)
  reserveResources: ResourceAmount;
  fullTimeThreshold: number; // 滿倉時間上限 (小時)
  priority: number;
}

interface ResourceAmount {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}
```

### TransportSettingsModal

```typescript
interface TransportSettingsModalProps {
  village: VillageTransportConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: VillageTransportConfig) => Promise<void>;
  isLoading: boolean;
}
```

### ExternalTransportCard

```typescript
interface ExternalTransportCardProps {
  transport: ExternalTransport;
  onEdit: () => void;
  onDelete: () => void;
}

interface ExternalTransport {
  id: string;
  name: string;
  targetCoordinates: { x: number; y: number };
  sourceVillageId: string;
  sourceVillageName: string;
  resources: ResourceAmount;
  schedule: TransportSchedule;
  lastExecuted?: Date;
  nextExecution?: Date;
  status: 'active' | 'paused' | 'error';
}

type TransportSchedule =
  | { type: 'periodic'; intervalHours: number }
  | { type: 'once' }
  | { type: 'scheduled'; datetime: Date };
```

### TransportModeSelector

```typescript
interface TransportModeSelectorProps {
  mode: 'many-to-one' | 'one-to-many' | 'auto-balance';
  onChange: (mode: TransportMode) => void;
}
```

### TransportLogModal

```typescript
interface TransportLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
}

interface TransportLogEntry {
  id: string;
  timestamp: Date;
  sourceVillage: string;
  targetVillage: string;
  targetCoordinates?: { x: number; y: number };
  resources: ResourceAmount;
  status: 'completed' | 'failed' | 'pending';
  errorMessage?: string;
}
```

---

## 狀態管理

```typescript
interface ResourceTransportPageState {
  // 基本狀態
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;

  // 全域設定
  globalSettings: {
    autoTransportEnabled: boolean;
    intervalMinutes: number;
    nextCheckTime: Date | null;
    mode: 'many-to-one' | 'one-to-many' | 'auto-balance';
  };

  // 村莊配置
  villageConfigs: VillageTransportConfig[];

  // 外部運送
  externalTransports: ExternalTransport[];

  // Modal 狀態
  editingVillage: VillageTransportConfig | null;
  editingExternal: ExternalTransport | null;
  showLogModal: boolean;

  // 統計
  stats: {
    totalTransports: number;
    activeVillages: number;
    pendingWarnings: number;
  };
}
```

---

## API 整合

```typescript
// 取得資源運送設定
GET /api/v1/automation/resource-transport?account_id={id}
Response: {
  globalSettings: GlobalTransportSettings;
  villageConfigs: VillageTransportConfig[];
  externalTransports: ExternalTransport[];
}

// 更新全域設定
PUT /api/v1/automation/resource-transport/settings
Request: GlobalTransportSettings
Response: GlobalTransportSettings

// 更新村莊運送配置
PUT /api/v1/automation/resource-transport/villages/{villageId}
Request: VillageTransportConfig
Response: VillageTransportConfig

// 更新村莊優先順序
PUT /api/v1/automation/resource-transport/villages/reorder
Request: { villageIds: string[] }
Response: { success: true }

// 新增外部運送
POST /api/v1/automation/resource-transport/external
Request: ExternalTransportFormData
Response: ExternalTransport

// 更新外部運送
PUT /api/v1/automation/resource-transport/external/{id}
Request: Partial<ExternalTransportFormData>
Response: ExternalTransport

// 刪除外部運送
DELETE /api/v1/automation/resource-transport/external/{id}
Response: { success: true }

// 立即執行運送
POST /api/v1/automation/resource-transport/execute
Request: { accountId: string }
Response: {
  executedCount: number;
  results: TransportResult[];
}

// 取得運送日誌
GET /api/v1/automation/resource-transport/logs?account_id={id}&page={page}&limit={limit}
Response: {
  logs: TransportLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

// 驗證座標
POST /api/v1/automation/resource-transport/validate-coordinates
Request: { x: number; y: number; accountId: string }
Response: {
  valid: boolean;
  villageName?: string;
  playerName?: string;
}
```

---

## i18n 支援

```typescript
// zh-TW
const zhTW = {
  resourceTransport: {
    title: '資源運送管理',
    subtitle: '配置村莊間的資源自動調配',

    globalControl: {
      autoTransport: '自動運送',
      totalTransports: '總運送次數',
      activeVillages: '參與村莊',
      pendingWarnings: '待處理',
    },

    timedSettings: {
      title: '定時運送設定',
      interval: '運送間隔',
      intervalHint: '每 {minutes} 分鐘執行一次檢查',
      nextCheck: '下次檢查',
      executeNow: '立即執行運送',
    },

    villageConfig: {
      title: '村莊運送配置',
      mode: {
        manyToOne: '多對一',
        oneToMany: '一對多',
        autoBalance: '自動平衡',
      },
      dragHint: '拖曳調整運送優先順序',
      role: {
        send: '運出',
        receive: '接收',
        disabled: '停用',
      },
      fullTimeWarning: '快滿倉',
      estimatedFullTime: '預估滿倉時間',
      reserveResources: '保留資源',
    },

    externalTransport: {
      title: '外部運送',
      subtitle: '運送到其他玩家村莊 (手動輸入座標)',
      addNew: '新增外部運送',
    },

    modal: {
      editVillage: '編輯村莊運送設定',
      addExternal: '新增外部運送',
      logs: '運送日誌',
    },
  },
};

// en
const en = {
  resourceTransport: {
    title: 'Resource Transport',
    subtitle: 'Configure automatic resource distribution between villages',

    globalControl: {
      autoTransport: 'Auto Transport',
      totalTransports: 'Total Transports',
      activeVillages: 'Active Villages',
      pendingWarnings: 'Pending',
    },

    timedSettings: {
      title: 'Scheduled Transport Settings',
      interval: 'Transport Interval',
      intervalHint: 'Check every {minutes} minutes',
      nextCheck: 'Next Check',
      executeNow: 'Execute Now',
    },

    villageConfig: {
      title: 'Village Transport Configuration',
      mode: {
        manyToOne: 'Many to One',
        oneToMany: 'One to Many',
        autoBalance: 'Auto Balance',
      },
      dragHint: 'Drag to adjust transport priority',
      role: {
        send: 'Send',
        receive: 'Receive',
        disabled: 'Disabled',
      },
      fullTimeWarning: 'Almost Full',
      estimatedFullTime: 'Estimated Full Time',
      reserveResources: 'Reserve Resources',
    },

    externalTransport: {
      title: 'External Transport',
      subtitle: 'Send resources to other players (manual coordinates)',
      addNew: 'Add External Transport',
    },

    modal: {
      editVillage: 'Edit Village Transport Settings',
      addExternal: 'Add External Transport',
      logs: 'Transport Logs',
    },
  },
};
```

---

## 錯誤處理

```typescript
interface TransportError {
  code: string;
  message: string;
  details?: object;
}

// 錯誤代碼
const ERROR_CODES = {
  INSUFFICIENT_MERCHANTS: 'insufficient_merchants',    // 商人不足
  INSUFFICIENT_RESOURCES: 'insufficient_resources',    // 資源不足
  INVALID_COORDINATES: 'invalid_coordinates',          // 座標無效
  TARGET_FULL: 'target_full',                         // 目標倉庫已滿
  TRANSPORT_IN_PROGRESS: 'transport_in_progress',     // 運送進行中
  RATE_LIMITED: 'rate_limited',                       // 操作過於頻繁
  NETWORK_ERROR: 'network_error',                     // 網路錯誤
};

// 錯誤訊息顯示
const errorMessages = {
  insufficient_merchants: '商人數量不足，請等待商人返回後再試',
  insufficient_resources: '資源不足，無法執行運送',
  invalid_coordinates: '座標無效，請確認輸入正確',
  target_full: '目標村莊倉庫已滿，無法接收更多資源',
  transport_in_progress: '運送正在進行中，請稍候',
  rate_limited: '操作過於頻繁，請稍後再試',
  network_error: '網路連線錯誤，請檢查網路後重試',
};
```

---

## 響應式設計

### Desktop (>= 1024px)
- 完整顯示所有村莊卡片
- 統計卡片水平排列 (4 欄)
- Modal 寬度 600px
- 拖曳排序正常運作

### Tablet (768px - 1023px)
- 統計卡片 2x2 網格
- Modal 寬度 90%
- 村莊卡片完整顯示

### Mobile (< 768px)
- 統計卡片垂直堆疊
- Modal 全螢幕
- 村莊卡片簡化顯示
- 拖曳改為上下移動按鈕
- 資源數值改為圖示 + 數字的緊湊格式
