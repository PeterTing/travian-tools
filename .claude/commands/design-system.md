# Design System Command

從 PRD 或需求文件產出完整的設計系統規劃，包含頁面設計、Design Tokens 和元件清單。所有設計稿存放到 `docs/designs/`。

## Usage

```bash
/project:design-system [PRD.md 路徑或需求描述]
```

## 參考 Agents

| Agent | 檔案位置 | 用途 |
| ----- | -------- | ---- |
| **Design System Architect** | `.claude/agents/experts/design-system-architect.md` | Design Tokens、元件庫架構 |
| **UI Designer** | `.claude/agents/experts/ui-designer.md` | 頁面設計、版面架構 |
| **Accessibility Expert** | `.claude/agents/experts/accessibility-expert.md` | 無障礙設計規範 |
| **Frontend Expert** | `.claude/agents/experts/frontend.md` | InsightHub 前端規範 |

## 設計稿存放位置

```text
docs/designs/
├── design-system.md          # 整體設計系統總覽（本命令產出）
├── tokens/                   # Design Tokens CSS
│   ├── colors.css
│   ├── typography.css
│   ├── spacing.css
│   └── misc.css
├── pages/                    # 頁面設計
│   ├── landing.md
│   ├── login.md
│   ├── dashboard.md
│   └── settings.md
└── components/               # 元件設計
    ├── Button.md
    ├── Input.md
    └── ...
```

---

## Instructions

當收到此 command 時，請執行以下三階段設計流程：

---

## Phase 1: 頁面設計稿（UI Wireframes）

### 1.1 讀取需求文件

```bash
# 如果提供了檔案路徑
讀取 $ARGUMENTS 指定的檔案（例如 docs/PRD.md）

# 如果沒有提供
讀取 docs/PRD.md 作為預設

# 檢查是否已有設計系統
讀取 docs/designs/design-system.md（如存在）
```

### 1.2 提取頁面清單

從 PRD 中識別所有需要的頁面：

- 公開頁面（Landing, Login, Register）
- 認證後頁面（Dashboard, Settings）
- 功能頁面（Query, Connections, Reports）
- 管理頁面（Admin Panel）

### 1.3 產出頁面設計稿

每個頁面產出設計稿到 `docs/designs/pages/<pagename>.md`：

```markdown
# <PageName> 頁面設計

## 基本資訊

- **路由**: `/app/<path>`
- **UI 框架**: MUI / Ant Design
- **認證要求**: 需要登入 / 公開
- **相關 TICKET**: TICKET-XXX（如有）

## 頁面結構（Wireframe）

\`\`\`text
┌─────────────────────────────────────────────────────┐
│  Header                                    [User ▼] │
├─────────┬───────────────────────────────────────────┤
│         │                                           │
│ Sidebar │  Main Content Area                        │
│         │                                           │
│  - Nav1 │  ┌─────────────────────────────────────┐  │
│  - Nav2 │  │  Section 1                          │  │
│  - Nav3 │  │  - Component A                      │  │
│         │  │  - Component B                      │  │
│         │  └─────────────────────────────────────┘  │
│         │                                           │
└─────────┴───────────────────────────────────────────┘
\`\`\`

## 主要區塊

| 區塊 | 描述 | 包含元件 |
| ---- | ---- | -------- |
| Header | 頂部導航 | Logo, Navigation, UserMenu |
| Sidebar | 側邊導航 | NavItems, CollapseButton |
| Main | 主要內容 | ... |

## 響應式行為

| 斷點 | 變化 |
| ---- | ---- |
| xs (手機) | Sidebar 隱藏，Bottom Nav |
| sm (平板) | Sidebar 折疊 |
| md+ (桌面) | 完整顯示 |

## 使用者流程

1. 使用者進入頁面
2. ...
3. ...

## 需要的元件

| 元件 | 分類 | 設計稿連結 |
| ---- | ---- | ---------- |
| ComponentA | features/ | [ComponentA.md](../components/ComponentA.md) |
| ComponentB | ui/ | [ComponentB.md](../components/ComponentB.md) |
```

---

## Phase 2: Design Tokens 設計

### 2.1 建立 Token 檔案

將以下 CSS 檔案建立到 `docs/designs/tokens/`：

**colors.css** - 色彩系統：

```css
:root {
  /* === Primitive Tokens === */
  --blue-50: #e3f2fd;
  --blue-500: #2196f3;
  --blue-700: #1976d2;
  /* ... */

  /* === Semantic Tokens === */
  --color-primary: var(--blue-700);
  --color-background: var(--gray-50);
  --color-text-primary: var(--gray-900);
  /* ... */
}

[data-theme='dark'] {
  --color-background: #121212;
  --color-surface: #1e1e1e;
  /* ... */
}
```

**typography.css** - 字體系統：

```css
:root {
  --font-family-base: 'Inter', sans-serif;
  --font-size-base: 1rem;
  --font-weight-medium: 500;
  /* ... */
}
```

**spacing.css** - 間距系統：

```css
:root {
  --spacing-1: 0.25rem;
  --spacing-4: 1rem;
  --spacing-md: var(--spacing-4);
  /* ... */
}
```

**misc.css** - 其他 Tokens：

```css
:root {
  --radius-md: 8px;
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --duration-fast: 150ms;
  /* ... */
}
```

---

## Phase 3: 元件清單與設計稿

### 3.1 元件分類

從頁面設計中提取所有需要的元件，建立清單：

```markdown
## 元件清單

### UI 基礎元件 (ui/)

| 元件 | 設計稿 | 優先級 | 相關 TICKET |
| ---- | ------ | ------ | ----------- |
| Button | [Button.md](components/Button.md) | P0 | - |
| Input | [Input.md](components/Input.md) | P0 | - |
| Card | [Card.md](components/Card.md) | P0 | - |

### Layout 版面元件 (layout/)

| 元件 | 設計稿 | 優先級 | 相關 TICKET |
| ---- | ------ | ------ | ----------- |
| AppShell | [AppShell.md](components/AppShell.md) | P0 | - |
| Header | [Header.md](components/Header.md) | P0 | - |

### Features 功能元件 (features/)

| 元件 | 分組 | 設計稿 | 優先級 | 相關 TICKET |
| ---- | ---- | ------ | ------ | ----------- |
| LoginForm | auth | [LoginForm.md](components/LoginForm.md) | P0 | TICKET-003 |
| MemberList | organization | [MemberList.md](components/MemberList.md) | P1 | TICKET-006 |
```

### 3.2 產出元件設計稿

為每個元件建立設計稿到 `docs/designs/components/<ComponentName>.md`，遵循 `/project:design` 格式。

---

## Phase 4: 儲存設計系統總覽

建立 `docs/designs/design-system.md` 作為設計系統入口：

```markdown
# InsightHub 設計系統

> 基於 PRD 產出的完整設計系統

## 總覽

| 項目 | 數量 |
| ---- | ---- |
| 頁面設計 | X 個 |
| Design Tokens | 4 個檔案 |
| 元件設計 | X 個 |

## 頁面設計

| 頁面 | 路由 | UI 框架 | 設計稿 |
| ---- | ---- | ------- | ------ |
| Landing | / | MUI | [landing.md](pages/landing.md) |
| Login | /login | MUI | [login.md](pages/login.md) |
| Dashboard | /app | MUI | [dashboard.md](pages/dashboard.md) |

## Design Tokens

| Token 類型 | 檔案 |
| ---------- | ---- |
| 色彩 | [colors.css](tokens/colors.css) |
| 字體 | [typography.css](tokens/typography.css) |
| 間距 | [spacing.css](tokens/spacing.css) |
| 其他 | [misc.css](tokens/misc.css) |

## 元件清單

### 優先級 P0（必須）

| 元件 | 分類 | 設計稿 | 相關 TICKET |
| ---- | ---- | ------ | ----------- |
| Button | ui/ | [Button.md](components/Button.md) | - |
| ...

### 優先級 P1（重要）

...

### 優先級 P2（次要）

...
```

---

## Phase 5: 更新 TICKETS.md（如有關聯）

如果設計稿與 TICKET 有關聯，更新 `docs/TICKETS.md`：

```markdown
### 🎫 TICKET-006: 組織成員管理

**類型**: Full-Stack

**設計稿**:
- [MemberList.md](designs/components/MemberList.md)
- [InviteMemberDialog.md](designs/components/InviteMemberDialog.md)
- [settings.md](designs/pages/settings.md)

...
```

---

## Output Format

### 終端輸出

```markdown
## 設計系統規劃完成

### 產出摘要

| 項目 | 數量 | 路徑 |
| ---- | ---- | ---- |
| 設計系統總覽 | 1 | `docs/designs/design-system.md` |
| 頁面設計 | X | `docs/designs/pages/` |
| Design Tokens | 4 | `docs/designs/tokens/` |
| 元件設計 | X | `docs/designs/components/` |

### 檔案清單

\`\`\`text
docs/designs/
├── design-system.md ✅
├── tokens/
│   ├── colors.css ✅
│   ├── typography.css ✅
│   ├── spacing.css ✅
│   └── misc.css ✅
├── pages/
│   ├── landing.md ✅
│   ├── login.md ✅
│   └── dashboard.md ✅
└── components/
    ├── Button.md ✅
    ├── Input.md ✅
    └── ...
\`\`\`

### 下一步

1. 將 Tokens 複製到 `frontend/src/styles/tokens/`
2. 開發 P0 元件: `/project:start-dev TICKET-XXX`
3. 按優先級實作各頁面
```

---

## Examples

```bash
# 從 PRD 產出完整設計系統
/project:design-system docs/PRD.md

# 使用預設 PRD 路徑
/project:design-system

# 針對特定功能產出設計
/project:design-system "組織管理功能，包含組織設定、成員管理、邀請成員"
```

---

## 相關檔案

- `docs/PRD.md` - 產品需求文件
- `docs/TICKETS.md` - Ticket 追蹤
- `docs/designs/` - 設計稿目錄
- `.claude/agents/experts/design-system-architect.md`
- `.claude/agents/experts/ui-designer.md`
- `.claude/agents/experts/accessibility-expert.md`
