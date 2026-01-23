# Travian Tools Design System

> 設計系統規範 - 基於 shadcn/ui + Tailwind CSS

## 技術棧

| 項目 | 技術 |
|------|------|
| UI 框架 | React 18+ |
| 元件庫 | shadcn/ui |
| CSS 框架 | Tailwind CSS |
| 圖示 | Lucide Icons |
| 圖表 | Recharts |

---

## 色彩系統

### 主題色

```css
/* 品牌色 - Travian 風格 */
--primary: 24 95% 53%;        /* 橙色 - 主要行動 */
--primary-foreground: 0 0% 100%;

/* 語意色 */
--destructive: 0 84% 60%;     /* 紅色 - 危險/刪除 */
--success: 142 76% 36%;       /* 綠色 - 成功 */
--warning: 38 92% 50%;        /* 黃色 - 警告 */
--info: 199 89% 48%;          /* 藍色 - 資訊 */
```

### 種族代表色

```css
/* 7 種族識別色 */
--tribe-romans: 220 90% 56%;     /* 藍色 */
--tribe-gauls: 142 76% 36%;      /* 綠色 */
--tribe-teutons: 0 84% 60%;      /* 紅色 */
--tribe-huns: 45 93% 47%;        /* 金色 */
--tribe-egyptians: 32 95% 44%;   /* 沙色 */
--tribe-vikings: 199 89% 48%;    /* 冰藍 */
--tribe-spartans: 280 68% 50%;   /* 紫色 */
```

### 資源代表色

```css
/* 4 種資源 */
--resource-wood: 25 76% 31%;     /* 木材 - 棕色 */
--resource-clay: 16 85% 57%;     /* 黏土 - 橙紅 */
--resource-iron: 220 13% 46%;    /* 鐵礦 - 灰藍 */
--resource-crop: 48 96% 53%;     /* 糧食 - 金黃 */
```

---

## 字型系統

```css
/* 字體 */
--font-sans: "Inter", system-ui, sans-serif;
--font-mono: "JetBrains Mono", monospace;

/* 字級 */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

---

## 間距系統

```css
/* 基於 4px 網格 */
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-12: 3rem;    /* 48px */
```

---

## 共用元件

### 1. ResourceDisplay

顯示資源數值的元件。

```typescript
interface ResourceDisplayProps {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  showIcons?: boolean;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}
```

**狀態**:
- 正常：黑色數字
- 不足：紅色數字 + 警告圖示
- 足夠：綠色數字（比較時）

---

### 2. TroopBadge

顯示兵種資訊的標籤。

```typescript
interface TroopBadgeProps {
  tribe: Tribe;
  troopId: string;
  count?: number;
  showStats?: boolean;
}
```

---

### 3. BuildingCard

建築資訊卡片。

```typescript
interface BuildingCardProps {
  buildingId: string;
  level: number;
  showCost?: boolean;
  showEffect?: boolean;
  onClick?: () => void;
}
```

---

### 4. CoordinateInput

座標輸入元件。

```typescript
interface CoordinateInputProps {
  value: { x: number; y: number };
  onChange: (coord: { x: number; y: number }) => void;
  label?: string;
}
```

---

### 5. TimeDisplay

時間顯示元件。

```typescript
interface TimeDisplayProps {
  seconds: number;
  format?: 'full' | 'short' | 'countdown';
}
```

**格式範例**:
- full: "2 天 3 小時 45 分鐘"
- short: "2d 3h 45m"
- countdown: "51:45:00"

---

### 6. TribeSelector

種族選擇器。

```typescript
interface TribeSelectorProps {
  value: Tribe | null;
  onChange: (tribe: Tribe) => void;
  showAll?: boolean;
}
```

---

### 7. LevelSlider

等級選擇滑桿。

```typescript
interface LevelSliderProps {
  min?: number;
  max?: number;
  value: number;
  onChange: (level: number) => void;
  label?: string;
}
```

---

### 8. CalculatorResult

計算結果顯示卡片。

```typescript
interface CalculatorResultProps {
  title: string;
  results: ResultItem[];
  actions?: Action[];
}

interface ResultItem {
  label: string;
  value: string | number;
  type?: 'resource' | 'time' | 'number' | 'percentage';
  highlight?: boolean;
}
```

---

### 9. DataTable

資料表格元件（基於 shadcn/ui Table）。

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
}
```

---

### 10. StatusIndicator

狀態指示器。

```typescript
interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  label?: string;
  pulse?: boolean;
}
```

---

## 頁面佈局

### AppLayout

主應用佈局。

```
┌─────────────────────────────────────────────────────────┐
│  Header (64px)                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Logo    Navigation              User Menu           ││
│  └─────────────────────────────────────────────────────┘│
├─────────┬───────────────────────────────────────────────┤
│         │                                               │
│ Sidebar │  Main Content                                 │
│ (240px) │                                               │
│         │  ┌─────────────────────────────────────────┐  │
│  - 數據庫 │  │ Page Header                            │  │
│  - 計算器 │  ├─────────────────────────────────────────┤  │
│  - 村莊  │  │                                         │  │
│  - AI   │  │ Page Content                            │  │
│  - 執行  │  │                                         │  │
│         │  │                                         │  │
│         │  └─────────────────────────────────────────┘  │
│         │                                               │
├─────────┴───────────────────────────────────────────────┤
│  Footer (optional)                                      │
└─────────────────────────────────────────────────────────┘
```

### 響應式斷點

```css
/* Tailwind 預設斷點 */
sm: 640px   /* 手機橫向 */
md: 768px   /* 平板 */
lg: 1024px  /* 桌面 */
xl: 1280px  /* 大螢幕 */
2xl: 1536px /* 超大螢幕 */
```

**行為**:
- < 768px: Sidebar 收起為漢堡選單
- ≥ 768px: Sidebar 固定顯示

---

## 互動模式

### 表單驗證

- 即時驗證：輸入時驗證
- 錯誤顯示：欄位下方紅色文字
- 成功提示：Toast 通知

### 載入狀態

- 按鈕：Spinner + 文字變更
- 頁面：Skeleton 骨架屏
- 資料：載入中動畫

### 錯誤處理

- API 錯誤：Toast 通知 + 重試按鈕
- 表單錯誤：欄位標紅 + 錯誤訊息
- 404：專用錯誤頁面

---

## 圖示規範

使用 Lucide Icons，常用圖示：

| 用途 | 圖示 |
|------|------|
| 建築 | `Building2` |
| 兵種 | `Sword` |
| 資源 | `Coins` |
| 計算 | `Calculator` |
| AI | `Bot` |
| 設定 | `Settings` |
| 搜尋 | `Search` |
| 新增 | `Plus` |
| 編輯 | `Pencil` |
| 刪除 | `Trash2` |
| 確認 | `Check` |
| 取消 | `X` |
| 警告 | `AlertTriangle` |
| 資訊 | `Info` |
| 時間 | `Clock` |
| 同步 | `RefreshCw` |

---

## 無障礙設計

1. **鍵盤導航**: 所有互動元素可用 Tab 鍵訪問
2. **對比度**: 文字對比度 ≥ 4.5:1
3. **焦點指示**: 明顯的焦點環
4. **ARIA 標籤**: 所有互動元素有適當標籤
5. **螢幕閱讀器**: 支援主流螢幕閱讀器

---

## 文件更新記錄

| 版本 | 日期 | 內容 |
|------|------|------|
| 1.0 | 2026-01-22 | 初版建立 |
