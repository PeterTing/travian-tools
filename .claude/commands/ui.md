# UI Command

UI 設計指令（Phase 2 only）。當 UX 設計已存在時，只執行 UI 視覺設計階段。

## Usage

```bash
/project:ui <元件或頁面名稱>
```

## 執行流程

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        /project:ui                                  │
├─────────────────────────────────────────────────────────────────────┤
│  前置條件：UX 設計已存在                                              │
│  └─ 確認 docs/designs/ux/ 有對應的 flow 或 wireframe                │
│                                                                     │
│  1. 讀取 UX 產出                                                     │
│     ├─ 用戶流程 (docs/designs/ux/flows/)                            │
│     └─ Wireframe (docs/designs/ux/wireframes/)                      │
│                                                                     │
│  2. Phase 2: UI 設計 (UX/UI Designer Agent)                          │
│     ├─ 視覺設計（基於 Wireframe）                                     │
│     ├─ 元件規格                                                      │
│     └─ 雙軌產出（MD + Figma）                                        │
│     └─ 輸出到 docs/designs/components/ 或 pages/                     │
│                                                                     │
│  3. Design Review（並行審查，最多 3 輪）                               │
│     ├─ PRD Alignment (critical)                                      │
│     ├─ Accessibility (high)                                          │
│     ├─ Design System (high)                                          │
│     └─ UX Alignment (high)                                           │
│                                                                     │
│  4. NEEDS_CHANGES → 自動修改 → 重新審查                               │
│     └─ 最多 3 輪，超過輸出檢討報告                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 參考 Agents

### Producer Agent（產出者）

| Agent | 檔案位置 | 用途 |
|-------|---------|------|
| **UX/UI Designer** | `.claude/agents/experts/ux-ui-designer.md` | UI 視覺設計（Phase 2） |

### Reviewer Agents（審查者）

| Agent | 檔案位置 | 用途 | 優先級 |
|-------|---------|------|--------|
| **PRD Alignment** | `.claude/agents/reviewers/prd-alignment.md` | PRD 功能覆蓋 | critical |
| **Accessibility** | `.claude/agents/experts/accessibility-expert.md` | WCAG 合規 | high |
| **Design System** | `.claude/agents/experts/design-system-architect.md` | Token 使用 | high |
| **UX Alignment** | (內建檢查) | 是否符合 UX 流程 | high |

---

## Instructions

### Step 1: 確認 UX 產出存在

```bash
# 尋找對應的 UX 檔案
Glob docs/designs/ux/flows/*$ARGUMENTS*.md
Glob docs/designs/ux/wireframes/*$ARGUMENTS*.md

# 如果找不到，提示用戶先執行 UX 設計
# /project:ux <功能描述>
```

### Step 2: 讀取 UX 產出

```bash
# 讀取 PRD
Read docs/PRD.md

# 讀取設計系統
Read docs/designs/design-system.md

# 讀取對應的用戶流程
Read docs/designs/ux/flows/[feature]-flow.md

# 讀取 Wireframe
Read docs/designs/ux/wireframes/[page]-wireframe.md

# 確認 UX 中的「交接給 UI」章節
```

### Step 3: 產出 UI 設計稿

參考 UX/UI Designer Agent（Phase 2）產出：

```text
docs/designs/
├── components/               # UI 元件設計
│   └── <ComponentName>.md
└── pages/                    # UI 頁面設計
    └── <PageName>.md
```

### Step 4: UI 設計稿格式

→ 參考 [design-templates.md](../templates/design-templates.md#ui-元件設計稿模板)

### Step 5: Design Review

→ 參考 [design-templates.md](../templates/design-templates.md#design-review-流程)

### Step 6: NEEDS_CHANGES 處理

→ 參考 [design-templates.md](../templates/design-templates.md#needs_changes-處理流程)

---

## Output Format

### UI 設計完成報告

```markdown
## UI Design Report: <元件/頁面名稱>

### 設計摘要

| 項目 | 內容 |
|------|------|
| 設計類型 | 元件 / 頁面 |
| 關聯 TICKET | TICKET-XXX |
| 關聯 PRD | F1.x.x |
| 參考 UX | [flow.md](...) |

### 產出檔案

| 檔案 | 路徑 | 狀態 |
|------|------|------|
| UI 設計稿 | `docs/designs/components/Xxx.md` | ✅ |
| Figma | [連結] | ✅ |

### Design Review 結果

| Agent | 狀態 | 問題數 |
|-------|------|--------|
| PRD Alignment | ✅ APPROVED | 0 |
| Accessibility | ✅ APPROVED | 0 |
| Design System | ✅ APPROVED | 0 |
| UX Alignment | ✅ APPROVED | 0 |

**整體結果**: ✅ APPROVED (1 輪)

### 下一步

- 開發實作: `/project:start-dev TICKET-XXX`
```

---

## Examples

### 範例 1：基於既有 UX 設計 UI 元件

```bash
# 前提：已有 UX 設計
# - docs/designs/ux/flows/member-management-flow.md
# - docs/designs/ux/wireframes/members-page-wireframe.md

/project:ui MemberList
```

輸出：
- `docs/designs/components/MemberList.md`

### 範例 2：設計頁面 UI

```bash
# 前提：已有 dashboard-wireframe.md

/project:ui dashboard
```

輸出：
- `docs/designs/pages/dashboard.md`

### 範例 3：UX 不存在時

```bash
/project:ui SomeNewComponent

# 輸出提示：
# ⚠️ 找不到對應的 UX 設計
# 建議先執行：
# /project:ux <功能描述>
# 或執行完整設計流程：
# /project:design <功能描述>
```

---

## 相關指令

| 指令 | 說明 |
|------|------|
| `/project:ux <功能>` | 只執行 UX 設計（Phase 1） |
| `/project:ui <元件>` | 只執行 UI 設計（Phase 2，本指令） |
| `/project:design <功能>` | 完整設計流程（Phase 1 + 2） |
| `/project:review-design` | 審查設計稿 |

---

## 相關檔案

- `docs/PRD.md` - 產品需求文件
- `docs/designs/ux/` - UX 設計（流程、Wireframe）
- `docs/designs/components/` - UI 元件設計
- `docs/designs/pages/` - UI 頁面設計
- `docs/designs/design-system.md` - 設計系統
- `.claude/agents/experts/ux-ui-designer.md` - UX/UI Designer Agent
- `.claude/commands/ux.md` - UX 設計指令
- `.claude/commands/design.md` - 完整設計指令
