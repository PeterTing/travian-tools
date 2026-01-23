# Design Templates

> 設計相關的共用模板，供各 command 和 agent 引用

---

## 設計稿存放位置

```text
docs/designs/
├── ux/                       # UX 設計（Phase 1 產出）
│   ├── flows/                # 用戶流程
│   │   └── [feature]-flow.md
│   ├── wireframes/           # Wireframe
│   │   └── [page]-wireframe.md
│   └── ia/                   # 資訊架構
│       └── site-structure.md
├── components/               # UI 元件設計（Phase 2 產出）
│   └── <ComponentName>.md
├── pages/                    # UI 頁面設計（Phase 2 產出）
│   └── <PageName>.md
├── tokens/                   # Design Tokens CSS
│   ├── colors.css
│   ├── typography.css
│   └── spacing.css
└── design-system.md          # 設計系統總覽
```

---

## UX 用戶流程模板

```markdown
# [功能名稱] 用戶流程

## 基本資訊

- **相關 PRD**: F1.x.x
- **相關 TICKET**: TICKET-XXX
- **用戶角色**: [角色名稱]
- **建立日期**: YYYY-MM-DD

## 用戶目標

1. [主要目標]
2. [次要目標]

## 流程圖

\`\`\`mermaid
flowchart TD
    A[起點] --> B{決策點}
    B -->|選項1| C[步驟1]
    B -->|選項2| D[步驟2]
    C --> E[結果]
    D --> E

    %% 錯誤處理
    C -->|錯誤| F[錯誤處理]
    F --> C
\`\`\`

## 步驟說明

| 步驟 | 用戶行為 | 系統回應 | 備註 |
|------|---------|---------|------|
| 1 | 點擊按鈕 | 顯示表單 | |
| 2 | 填寫資料 | 驗證輸入 | 即時驗證 |
| 3 | 提交表單 | 處理請求 | 顯示 Loading |

## 錯誤情境

| 情境 | 觸發條件 | 處理方式 |
|------|---------|---------|
| 網路錯誤 | 請求失敗 | 顯示重試按鈕 |
| 驗證失敗 | 輸入不合法 | 顯示錯誤訊息 |

## 交接給 UI

### 需要設計的元件

| 元件名稱 | 類型 | 優先級 | 參考 Wireframe |
|---------|------|--------|---------------|
| ... | features | high | [wireframe](link) |

### 需要設計的頁面

| 頁面 | 路由 | 參考流程 |
|------|------|---------|
| ... | /app/xxx | [flow](link) |

### 關鍵互動點

1. [互動1]: 點擊 → Dialog → 輸入 → 發送
2. [互動2]: 點擊 → 確認 Dialog → 執行
```

---

## UX Wireframe 模板

```markdown
# [頁面/功能] Wireframe

## 基本資訊

- **相關流程**: [flow-name.md](../flows/flow-name.md)
- **相關 PRD**: F1.x.x
- **頁面類型**: 頁面 / 元件 / Dialog

## 桌面版 (≥1200px)

\`\`\`text
┌─────────────────────────────────────────────────────────┐
│  [Header]                                               │
│  Logo    Nav1  Nav2  Nav3              User  Settings   │
├─────────────────────────────────────────────────────────┤
│         │                                               │
│ [側邊欄] │  [主要內容區]                                  │
│         │                                               │
│  Menu1  │  ┌─────────────────────────────────────┐     │
│  Menu2  │  │  標題                                │     │
│  Menu3  │  ├─────────────────────────────────────┤     │
│         │  │                                     │     │
│         │  │  內容區塊                            │     │
│         │  │                                     │     │
│         │  └─────────────────────────────────────┘     │
│         │                                               │
├─────────────────────────────────────────────────────────┤
│  [Footer]                                               │
└─────────────────────────────────────────────────────────┘
\`\`\`

## 平板版 (600-1199px)

\`\`\`text
（可收合側邊欄的版本）
\`\`\`

## 手機版 (<600px)

\`\`\`text
┌─────────────────────┐
│  Logo    ≡  User    │  ← 漢堡選單
├─────────────────────┤
│                     │
│  [主要內容區]        │
│                     │
│  標題               │
│  ─────────────────  │
│  內容區塊           │
│                     │
├─────────────────────┤
│  🏠  📊  ⚙️  👤     │  ← 底部導航
└─────────────────────┘
\`\`\`

## 功能區塊說明

| 區塊 | 功能 | 互動 |
|------|------|------|
| Header | 導航、用戶資訊 | 點擊導向 |
| 側邊欄 | 主要導航 | 可收合 |
| 主內容區 | 核心功能 | 依功能而定 |

## 交接給 UI

此 Wireframe 需要以下 UI 設計：
- [ ] Header 元件
- [ ] Sidebar 元件
- [ ] [功能] 元件
```

---

## UI 元件設計稿模板

```markdown
# <ComponentName>

> 簡短描述

## 基本資訊

- **分類**: ui / layout / features
- **UI 框架**: MUI / Ant Design
- **相關 TICKET**: TICKET-XXX
- **相關 PRD**: F1.x.x
- **UX 流程**: [flow.md](../ux/flows/xxx-flow.md)
- **Wireframe**: [wireframe.md](../ux/wireframes/xxx-wireframe.md)
- **Figma**: [連結](https://figma.com/...)

## Props 介面

\`\`\`typescript
interface I<ComponentName>Props {
  // 必要 props
  data: IDataType[]

  // 可選 props
  variant?: 'default' | 'compact'
  onAction?: (item: IDataType) => void

  // 無障礙
  ariaLabel?: string
}
\`\`\`

## 狀態設計

| 狀態 | 觸發條件 | 視覺變化 |
|------|---------|---------|
| Default | 初始載入 | 標準樣式 |
| Hover | 滑鼠移入 | 背景色變淺 |
| Loading | 載入中 | 顯示 Skeleton |
| Empty | data.length === 0 | 顯示空狀態 |
| Error | 載入失敗 | 顯示錯誤訊息 |

## 結構設計

\`\`\`text
（基於 Wireframe 的詳細視覺結構）
\`\`\`

## 響應式行為

| 斷點 | 行為 |
|------|------|
| Desktop (≥1200px) | ... |
| Tablet (600-1199px) | ... |
| Mobile (<600px) | ... |

## 無障礙要求

- [ ] 鍵盤操作支援
- [ ] ARIA labels
- [ ] 色彩對比 ≥ 4.5:1
- [ ] Focus 狀態可見

## 樣式定義

\`\`\`css
/* <ComponentName>.module.css */
.container {
  background-color: var(--color-surface);
}
\`\`\`

## 元件骨架

\`\`\`typescript
// <ComponentName>.tsx
...
\`\`\`

## 測試案例

\`\`\`typescript
// <ComponentName>.test.tsx
...
\`\`\`
```

---

## Design Review Agents

### UI 設計審查

| Agent | 檔案位置 | 優先級 | 審查項目 |
|-------|---------|--------|---------|
| 📋 PRD Alignment | `.claude/agents/reviewers/prd-alignment.md` | critical | PRD 功能覆蓋、用戶流程、邊界情況 |
| ♿ Accessibility | `.claude/agents/experts/accessibility-expert.md` | high | WCAG 合規、ARIA、鍵盤導航、色彩對比 |
| 🎨 Design System | `.claude/agents/experts/design-system-architect.md` | high | Design Tokens 使用、響應式、一致性 |
| 🔄 UX Alignment | (內建檢查) | high | 是否符合 UX 流程和 Wireframe |

### UX 設計審查

| Agent | 優先級 | 審查項目 |
|-------|--------|---------|
| 📋 PRD Alignment | critical | 流程是否覆蓋 PRD 需求 |
| 🧭 Flow Completeness | high | 流程是否完整、錯誤處理 |
| ♿ UX Accessibility | high | 流程是否考慮無障礙用戶 |

---

## Design Review 流程

```text
設計稿產出
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  Design Review（並行審查，最多 3 輪）                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ PRD      │ │ A11y     │ │ Design   │ │ UX       │           │
│  │ Alignment│ │          │ │ System   │ │ Alignment│           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └────────────┼────────────┼────────────┘                  │
│                    ▼                                             │
│             Consensus Check                                      │
│                    │                                             │
│    ┌───────────────┼───────────────┐                            │
│    ▼               ▼               ▼                            │
│ APPROVED     NEEDS_CHANGES      BLOCKED                         │
│ → 完成        → 自動修改         → PRD 覆蓋不足                  │
│              → 重新審查          → 輸出報告停止                   │
└──────────────────────────────────────────────────────────────────┘
```

### Consensus 規則

```text
1. PRD Alignment 為 BLOCKED → 整體 BLOCKED（功能覆蓋不足）
2. 任何 high Agent 為 NEEDS_CHANGES → 整體 NEEDS_CHANGES
3. 全部 APPROVED → 整體 APPROVED
4. 最多 3 輪，超過則輸出檢討報告
```

---

## NEEDS_CHANGES 處理流程

```text
Review 結果
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  NEEDS_CHANGES 處理                                              │
│                                                                 │
│  1. 收集所有 Findings                                            │
│     ├─ [A11y] 缺少 aria-label - line 85                         │
│     └─ [Design System] 未使用 Design Token - line 120            │
│                                                                 │
│  2. 呼叫 UX/UI Designer Agent 修改                               │
│     ├─ 傳入 Findings                                             │
│     └─ 指定修改位置                                              │
│                                                                 │
│  3. 重新執行 Design Review                                       │
│     └─ 只針對有修改的部分                                        │
│                                                                 │
│  4. 重複直到 APPROVED 或達到 3 輪                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 使用方式

在其他 command 或 agent 文件中引用：

```markdown
## UI 設計稿格式

→ 參考 [design-templates.md](../.claude/templates/design-templates.md#ui-元件設計稿模板)
```
