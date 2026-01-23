# AppLayout - 應用主佈局

> 所有頁面的主要佈局框架

## 相關 Tickets

- 所有 Frontend / Full-Stack Tickets

---

## 佈局結構

```
┌─────────────────────────────────────────────────────────────────────┐
│  Header                                                    h: 64px  │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ [Logo] Travian Tools    [Nav Items...]    [🔔] [👤 User Menu]   ││
│  └─────────────────────────────────────────────────────────────────┘│
├───────────────┬─────────────────────────────────────────────────────┤
│               │                                                     │
│   Sidebar     │   Main Content Area                                 │
│   w: 240px    │                                                     │
│               │   ┌─────────────────────────────────────────────┐   │
│   📊 數據庫    │   │  Breadcrumb                                 │   │
│     建築      │   │  Home > 計算器 > 建築升級                    │   │
│     兵種      │   ├─────────────────────────────────────────────┤   │
│     資源田    │   │                                             │   │
│               │   │  Page Title                                 │   │
│   🔢 計算器    │   │  建築升級計算器                             │   │
│     建築升級   │   │                                             │   │
│     ROI       │   │  ┌─────────────────────────────────────┐   │   │
│     戰鬥模擬   │   │  │                                     │   │   │
│     糧食平衡   │   │  │  Page Content                       │   │   │
│               │   │  │                                     │   │   │
│   🏘️ 村莊     │   │  │                                     │   │   │
│     我的村莊   │   │  │                                     │   │   │
│     同步設定   │   │  └─────────────────────────────────────┘   │   │
│               │   │                                             │   │
│   🤖 AI 助手   │   └─────────────────────────────────────────────┘   │
│     策略諮詢   │                                                     │
│     健康檢查   │                                                     │
│               │                                                     │
│   ⚡ 執行      │                                                     │
│     待執行    │                                                     │
│     執行日誌   │                                                     │
│               │                                                     │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

## 元件規格

### Header

```typescript
interface HeaderProps {
  user: User | null;
  notifications: Notification[];
}
```

**內容**:
- Logo + 應用名稱（點擊回首頁）
- 通知按鈕（未讀數量 Badge）
- 用戶選單（下拉）
  - 帳號設定
  - 遊戲帳號管理
  - 登出

**樣式**:
```css
.header {
  height: 64px;
  background: var(--background);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}
```

---

### Sidebar

```typescript
interface SidebarProps {
  currentPath: string;
  collapsed?: boolean;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: NavItem[];
}
```

**導航結構**:

```typescript
const navItems: NavItem[] = [
  {
    label: '數據庫',
    icon: Database,
    children: [
      { label: '建築', href: '/database/buildings', icon: Building2 },
      { label: '兵種', href: '/database/troops', icon: Sword },
      { label: '資源田', href: '/database/resources', icon: Wheat },
    ]
  },
  {
    label: '計算器',
    icon: Calculator,
    children: [
      { label: '建築升級', href: '/calculator/building', icon: ArrowUp },
      { label: '資源 ROI', href: '/calculator/roi', icon: TrendingUp },
      { label: '戰鬥模擬', href: '/calculator/battle', icon: Swords },
      { label: '糧食平衡', href: '/calculator/crop', icon: Scale },
      { label: '座標距離', href: '/calculator/distance', icon: MapPin },
      { label: '多波次攻擊', href: '/calculator/waves', icon: Zap },
    ]
  },
  {
    label: '村莊',
    icon: Home,
    children: [
      { label: '我的村莊', href: '/villages', icon: Map },
      { label: '同步設定', href: '/villages/sync', icon: RefreshCw },
    ]
  },
  {
    label: 'AI 助手',
    icon: Bot,
    children: [
      { label: '策略諮詢', href: '/ai/advisor', icon: MessageSquare },
      { label: '健康檢查', href: '/ai/health', icon: Activity },
    ]
  },
  {
    label: '執行',
    icon: Play,
    children: [
      { label: '待執行', href: '/execute/queue', icon: ListTodo },
      { label: '執行日誌', href: '/execute/logs', icon: FileText },
      { label: '提醒設定', href: '/execute/reminders', icon: Bell },
    ]
  },
];
```

**樣式**:
```css
.sidebar {
  width: 240px;
  background: var(--card);
  border-right: 1px solid var(--border);
  height: calc(100vh - 64px);
  position: sticky;
  top: 64px;
  overflow-y: auto;
}

.sidebar-collapsed {
  width: 64px;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -240px;
    z-index: 40;
    transition: left 0.3s ease;
  }

  .sidebar-open {
    left: 0;
  }
}
```

---

### Main Content

```typescript
interface MainContentProps {
  breadcrumb?: BreadcrumbItem[];
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}
```

**樣式**:
```css
.main-content {
  flex: 1;
  padding: var(--spacing-6);
  min-height: calc(100vh - 64px);
  background: var(--background);
}

.page-header {
  margin-bottom: var(--spacing-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 600;
}
```

---

## 響應式行為

### Desktop (≥ 1024px)
- Sidebar 固定顯示 240px
- Main Content 彈性寬度

### Tablet (768px - 1023px)
- Sidebar 可收起至 64px（僅圖示）
- 點擊展開完整選單

### Mobile (< 768px)
- Sidebar 隱藏
- Header 顯示漢堡選單按鈕
- 點擊後 Sidebar 從左側滑入
- 背景遮罩點擊關閉

---

## 狀態管理

```typescript
interface LayoutState {
  sidebarCollapsed: boolean;
  sidebarOpen: boolean; // mobile only
  currentPath: string;
}

// 使用 Zustand 或 Context
const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  sidebarOpen: false,
  currentPath: '/',
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openMobileSidebar: () => set({ sidebarOpen: true }),
  closeMobileSidebar: () => set({ sidebarOpen: false }),
}));
```

---

## 使用範例

```tsx
// pages/calculator/building.tsx
export default function BuildingCalculatorPage() {
  return (
    <AppLayout
      breadcrumb={[
        { label: '首頁', href: '/' },
        { label: '計算器', href: '/calculator' },
        { label: '建築升級' },
      ]}
      title="建築升級計算器"
      actions={
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          歷史記錄
        </Button>
      }
    >
      <BuildingUpgradeCalculator />
    </AppLayout>
  );
}
```
