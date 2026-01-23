# UX Command

產出用戶體驗設計：用戶流程、資訊架構、Wireframe。

## Usage

```bash
/project:ux <功能需求描述>
```

## 執行流程

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         /project:ux                                  │
├─────────────────────────────────────────────────────────────────────┤
│  1. 分析需求                                                         │
│     └─ 從 PRD 提取功能需求                                           │
│     └─ 識別用戶角色和目標                                             │
│                                                                     │
│  2. UX 設計（UX/UI Designer Agent - Phase 1）                        │
│     ├─ 用戶流程 (User Flow)                                          │
│     ├─ 資訊架構 (IA)                                                 │
│     └─ Wireframe                                                    │
│                                                                     │
│  3. UX Review（可選）                                                │
│     ├─ PRD Alignment：流程是否覆蓋需求                               │
│     └─ Accessibility：流程是否考慮無障礙                              │
│                                                                     │
│  4. 輸出到 docs/designs/ux/                                          │
│     └─ 產出「交接給 UI」清單                                          │
└─────────────────────────────────────────────────────────────────────┘
```

## 參考 Agent

| Agent | 檔案位置 | 用途 |
|-------|---------|------|
| **UX/UI Designer** | `.claude/agents/experts/ux-ui-designer.md` | 執行 Phase 1 (UX) |

---

## Step 1: 分析需求

### 1.1 讀取專案背景

```bash
# 讀取 PRD 了解功能需求
Read docs/PRD.md

# 讀取現有 UX 設計（如有）
Glob docs/designs/ux/**/*.md

# 讀取網站結構（如有）
Read docs/designs/ux/ia/site-structure.md
```

### 1.2 識別用戶角色

從 PRD 中識別：
- 主要用戶角色 (Primary Persona)
- 次要用戶角色 (Secondary Persona)
- 用戶目標和痛點

---

## Step 2: 產出用戶流程

### 2.1 User Flow 結構

→ 參考 [design-templates.md](../templates/design-templates.md#ux-用戶流程模板)

### 2.2 輸出位置

```text
docs/designs/ux/flows/[feature]-flow.md
```

---

## Step 3: 產出 Wireframe

### 3.1 Wireframe 結構

→ 參考 [design-templates.md](../templates/design-templates.md#ux-wireframe-模板)

### 3.2 輸出位置

```text
docs/designs/ux/wireframes/[page]-wireframe.md
```

---

## Step 4: 更新資訊架構（如需）

### 4.1 IA 結構

```markdown
# 資訊架構

## 網站結構

\`\`\`text
InsightHub
├── / (Landing)
├── /login
├── /app
│   ├── /app/dashboard
│   └── /app/[new-feature]  ← 新增
└── /app/admin
\`\`\`

## 導航更新

| 項目 | 路由 | 權限 |
|------|------|------|
| [新功能] | /app/xxx | member |
```

### 4.2 輸出位置

```text
docs/designs/ux/ia/site-structure.md
```

---

## Step 5: UX Review（可選）

如果需要 UX Review，執行：

```text
/project:review-design --ux
```

### UX Review Agents

| Agent | 審查項目 |
|-------|---------|
| PRD Alignment | 流程是否覆蓋 PRD 所有需求 |
| Accessibility | 流程是否考慮無障礙用戶 |

---

## 輸出總覽

```text
docs/designs/ux/
├── flows/
│   └── [feature]-flow.md        ← 用戶流程
├── wireframes/
│   └── [page]-wireframe.md      ← Wireframe
└── ia/
    └── site-structure.md        ← 更新（如需）
```

---

## 後續步驟

UX 完成後，可以：

1. **繼續 UI 設計**：`/project:design [功能]` 或 `/project:ui [元件]`
2. **產出 Tickets**：`/project:plan [功能]`（會自動讀取 UX）

---

## 範例

### 範例 1：成員管理功能

```bash
/project:ux 組織成員管理功能
```

輸出：
- `docs/designs/ux/flows/member-management-flow.md`
- `docs/designs/ux/wireframes/members-page-wireframe.md`
- 更新 `docs/designs/ux/ia/site-structure.md`

交接給 UI：
- MemberList 元件
- InviteMemberDialog 元件
- Members 頁面

### 範例 2：查詢功能

```bash
/project:ux 自然語言查詢功能
```

輸出：
- `docs/designs/ux/flows/query-flow.md`
- `docs/designs/ux/wireframes/query-page-wireframe.md`

交接給 UI：
- QueryInput 元件
- QueryResult 元件
- Query 頁面

---

## 相關檔案

- `docs/PRD.md` - 產品需求文件
- `docs/designs/ux/` - UX 設計目錄
- `.claude/agents/experts/ux-ui-designer.md` - UX/UI Designer Agent
- `.claude/commands/design.md` - 完整設計指令
- `.claude/commands/ui.md` - UI 設計指令
