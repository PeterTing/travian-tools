# Design Command

完整設計流程：UX 設計 → UI 設計 → Design Review，並在 NEEDS_CHANGES 時自動修改後重新審查。

## Usage

```bash
# 模式 1: AI 產出設計（從頭設計）
/project:design <功能或元件描述>

# 模式 2: 讀取 Figma 設計稿轉換成 MD（當 Figma 已有設計時）
/project:design <功能或元件描述> --figma <Figma URL>
```

## 前置條件

**如果專案有既有 Figma Design System，請先執行：**

```bash
/project:sync-design-system <Figma Design System URL>
```

這會將 Figma Design System 轉換成專案格式，後續設計才能正確參照 Design Tokens 和元件規範。

## 執行流程

### 模式 1: AI 產出設計（無 --figma）

```text
┌─────────────────────────────────────────────────────────────────────┐
│                /project:design <功能>                                │
├─────────────────────────────────────────────────────────────────────┤
│  1. 需求分析                                                         │
│     └─ 從 PRD 提取需求                                               │
│     └─ 判斷類型: 元件 / 頁面 / 功能                                   │
│                                                                     │
│  2. Phase 1: UX 設計 (UX/UI Designer Agent)                          │
│     ├─ 用戶流程 (User Flow)                                          │
│     ├─ 資訊架構 (IA)                                                 │
│     └─ Wireframe                                                    │
│     └─ 輸出到 docs/designs/ux/                                       │
│                                                                     │
│  3. Phase 2: UI 設計 (UX/UI Designer Agent)                          │
│     ├─ 視覺設計（基於 Wireframe + design-system.md）                  │
│     ├─ 元件規格                                                      │
│     └─ 輸出 MD 設計稿（Figma 連結為佔位符，需手動補）                  │
│     └─ 輸出到 docs/designs/components/ 或 pages/                     │
│                                                                     │
│  4. Design Review（並行審查，最多 3 輪）                               │
│     ├─ PRD Alignment (critical)                                      │
│     ├─ Accessibility (high)                                          │
│     ├─ Design System (high)                                          │
│     └─ UX Alignment (high)                                          │
│                                                                     │
│  5. NEEDS_CHANGES → 自動修改 → 重新審查                               │
│     └─ 最多 3 輪，超過輸出檢討報告                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 模式 2: 讀取 Figma 設計稿（有 --figma）

```text
┌─────────────────────────────────────────────────────────────────────┐
│          /project:design <功能> --figma <Figma URL>                  │
├─────────────────────────────────────────────────────────────────────┤
│  1. 讀取 Figma 設計稿                                                │
│     ├─ get_design_context: 元件結構、樣式                            │
│     ├─ get_variable_defs: 使用的 Design Tokens                      │
│     └─ get_screenshot: 視覺截圖                                      │
│                                                                     │
│  2. 轉換成 MD 設計稿（與 AI 產出格式相同）                            │
│     ├─ Props 介面                                                    │
│     ├─ 狀態設計                                                      │
│     ├─ 響應式行為                                                    │
│     └─ 輸出到 docs/designs/components/ 或 pages/                     │
│                                                                     │
│  3. Design Review（同模式 1）                                        │
│     └─ 確保 Figma 設計符合專案規範                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 參考 Agents

### Producer Agents（產出者）

| Agent | 檔案位置 | 用途 |
|-------|---------|------|
| **UX/UI Designer** | `.claude/agents/experts/ux-ui-designer.md` | UX + UI 完整設計 |
| **Accessibility Expert** | `.claude/agents/experts/accessibility-expert.md` | WCAG 合規、無障礙設計 |
| **Design System Architect** | `.claude/agents/experts/design-system-architect.md` | Design Tokens、主題系統 |

### Reviewer Agents（審查者）

| Agent | 檔案位置 | 用途 | 優先級 |
|-------|---------|------|--------|
| **PRD Alignment** | `.claude/agents/reviewers/prd-alignment.md` | PRD 功能覆蓋 | critical |
| **Accessibility** | `.claude/agents/experts/accessibility-expert.md` | WCAG 合規 | high |
| **Design System** | `.claude/agents/experts/design-system-architect.md` | Token 使用 | high |
| **UX Alignment** | (內建檢查) | 是否符合 UX 流程 | high |

---

## 設計稿存放位置

→ 參考 [design-templates.md](../templates/design-templates.md#設計稿存放位置)

---

## Step 1: 需求分析

### 1.1 讀取專案背景

```bash
# 讀取 PRD 了解功能需求
Read docs/PRD.md

# 讀取設計系統
Read docs/designs/design-system.md

# 讀取現有 UX（如有）
Glob docs/designs/ux/**/*.md

# 檢查是否有關聯 TICKET
Grep "TICKET-" docs/TICKETS.md
```

### 1.2 判斷設計類型

| 類型 | 判斷條件 | UX 階段 | UI 階段 |
|------|---------|---------|---------|
| **功能** | 涉及用戶流程 | 完整 UX | 完整 UI |
| **頁面** | 新頁面 | Wireframe | 頁面設計 |
| **元件** | 單一元件 | 可跳過 | 元件設計 |

---

## Step 2: Phase 1 - UX 設計

### 2.1 用戶流程

→ 參考 [design-templates.md](../templates/design-templates.md#ux-用戶流程模板)

### 2.2 Wireframe

→ 參考 [design-templates.md](../templates/design-templates.md#ux-wireframe-模板)

### 2.3 UX 輸出位置

```text
docs/designs/ux/flows/[feature]-flow.md
docs/designs/ux/wireframes/[page]-wireframe.md
```

---

## Step 3: Phase 2 - UI 設計

### 3.1 讀取 UX 產出

```bash
# 讀取對應的用戶流程
Read docs/designs/ux/flows/[feature]-flow.md

# 讀取 Wireframe
Read docs/designs/ux/wireframes/[page]-wireframe.md
```

### 3.2 元件設計稿格式

→ 參考 [design-templates.md](../templates/design-templates.md#ui-元件設計稿模板)

### 3.3 UI 輸出位置

```text
docs/designs/components/<ComponentName>.md
docs/designs/pages/<PageName>.md
```

---

## Step 4: Design Review

### 4.1 Design Review Agents（並行）

使用 Task tool **單一訊息**同時啟動 4 個 Reviewer Agents：

| Agent | 優先級 | 審查項目 |
|-------|--------|---------|
| 📋 PRD Alignment | critical | PRD 功能覆蓋、用戶流程、邊界情況 |
| ♿ Accessibility | high | WCAG 合規、ARIA、鍵盤導航、色彩對比 |
| 🎨 Design System | high | Design Tokens 使用、響應式、元件一致性 |
| 🔄 UX Alignment | high | 是否符合 UX 流程和 Wireframe |

### 4.2 Design Review 流程

→ 參考 [design-templates.md](../templates/design-templates.md#design-review-流程)

---

## Step 5: 自動修改機制

### 5.1 NEEDS_CHANGES 處理

→ 參考 [design-templates.md](../templates/design-templates.md#needs_changes-處理流程)

### 5.2 修改指令格式

```text
修改設計稿 docs/designs/components/MemberList.md

Findings:
1. [A11y/major] 缺少 aria-label - Props 介面
2. [Design System/minor] 色彩值未使用 Token - 樣式定義

請修改以上問題。
```

---

## 輸出格式

### 設計完成報告

```markdown
## Design Report: <功能名稱>

### 設計摘要

| 項目 | 內容 |
|------|------|
| 設計類型 | 功能 / 頁面 / 元件 |
| 關聯 TICKET | TICKET-XXX |
| 關聯 PRD | F1.x.x |

### 產出檔案

| 階段 | 檔案 | 狀態 |
|------|------|------|
| UX | `docs/designs/ux/flows/xxx-flow.md` | ✅ |
| UX | `docs/designs/ux/wireframes/xxx-wireframe.md` | ✅ |
| UI | `docs/designs/components/Xxx.md` | ✅ |
| UI | Figma: [連結] | ✅ |

### Design Review 結果

| Agent | 狀態 | 問題數 |
|-------|------|--------|
| PRD Alignment | ✅ APPROVED | 0 |
| Accessibility | ✅ APPROVED | 0 |
| Design System | ✅ APPROVED | 0 |
| UX Alignment | ✅ APPROVED | 0 |

**整體結果**: ✅ APPROVED (2 輪)

### 下一步

- 開發實作: `/project:start-dev TICKET-XXX`
- 產出 Tickets: `/project:plan`
```

---

## Examples

### 範例 1：完整功能設計

```bash
/project:design 組織成員管理功能
```

輸出：
- UX: `member-management-flow.md`, `members-page-wireframe.md`
- UI: `MemberList.md`, `InviteMemberDialog.md`, `members.md`

### 範例 2：單一元件設計

```bash
/project:design Button 元件，支援 primary/secondary/outline 變體
```

輸出：
- UI: `Button.md`（跳過 UX 階段）

### 範例 3：頁面設計

```bash
/project:design Dashboard 頁面
```

輸出：
- UX: `dashboard-wireframe.md`
- UI: `dashboard.md`

### 範例 4：從 Figma 讀取設計

```bash
/project:design MemberList 元件 --figma https://figma.com/design/ABC123/DesignSystem?node-id=100-200
```

輸出：

- UI: `MemberList.md`（從 Figma 轉換，包含完整 Props、狀態、樣式）

### 範例 5：完整流程（有既有 Figma Design System）

```bash
# 1. 先同步 Design System（只需執行一次）
/project:sync-design-system https://figma.com/design/ABC123/DesignSystem?node-id=0-1

# 2. 新功能設計 - 有 Figma 設計稿
/project:design 用戶設定頁面 --figma https://figma.com/design/ABC123/DesignSystem?node-id=500-600

# 3. 新功能設計 - 沒有 Figma，AI 根據同步後的 design-system.md 產出
/project:design 通知中心功能
```

---

## 相關檔案

- `docs/PRD.md` - 產品需求文件
- `docs/designs/` - 設計稿目錄
- `.claude/agents/experts/ux-ui-designer.md` - UX/UI Designer Agent
- `.claude/agents/experts/accessibility-expert.md` - 無障礙專家
- `.claude/agents/experts/design-system-architect.md` - 設計系統架構師
- `.claude/agents/reviewers/prd-alignment.md` - PRD 對齊審查
- `.claude/commands/ux.md` - UX 設計指令（只有 Phase 1）
- `.claude/commands/ui.md` - UI 設計指令（只有 Phase 2）
- `.claude/commands/sync-design-system.md` - 同步 Figma Design System
- `.claude/patterns/multi-agent-review.md` - Review Pattern 規範
