# Review Design Command

審核現有設計稿是否符合 PRD、UX 流程和設計規範。支援 UI 設計審查和 UX 回顧審查。

## Usage

```bash
/project:review-design [設計稿路徑或元件名稱]
```

## 範例

```bash
# 審核單一元件設計稿
/project:review-design MemberList

# 審核指定路徑
/project:review-design docs/designs/components/MemberList.md

# 審核所有設計稿（UI + UX）
/project:review-design --all

# 只審核 UX 設計
/project:review-design --ux

# 對既有 UI 進行 UX 回顧審查（檢查是否符合 UX 原則）
/project:review-design MemberList --ux-review

# 只執行特定審查
/project:review-design MemberList --prd        # 只檢查 PRD 對齊
/project:review-design MemberList --a11y       # 只檢查無障礙
/project:review-design MemberList --tokens     # 只檢查 Design Tokens
/project:review-design MemberList --ux-align   # 只檢查 UX 對齊
```

## 審查模式

| 模式 | Flag | 審查對象 | 說明 |
|------|------|---------|------|
| **完整審查** | `--all` | UI + UX 所有設計稿 | 最完整，適合發布前 |
| **UI 審查** | (預設) | UI 設計稿 | 元件/頁面視覺設計 |
| **UX 審查** | `--ux` | UX 設計稿 | 用戶流程/Wireframe |
| **UX 回顧** | `--ux-review` | 既有 UI 設計稿 | 檢查 UI 是否符合 UX 原則 |

---

## Reviewer Agents

→ 參考 [design-templates.md](../templates/design-templates.md#design-review-agents)

### UX 回顧審查 (`--ux-review`)

針對**既有 UI 設計**進行 UX 原則檢查：

| 審查項目 | 說明 |
|---------|------|
| 用戶流程合理性 | UI 元件是否支援完整用戶任務 |
| 資訊架構 | 內容組織是否合理、導航是否清晰 |
| 互動一致性 | 操作模式是否統一、可預測 |
| 錯誤預防與處理 | 是否有適當的錯誤狀態設計 |
| 認知負荷 | 資訊量是否適當、是否有漸進式呈現 |

---

## Instructions

### 步驟 1: 解析參數

```text
參數解析：
- 無 flag → UI 設計審查（單一元件或頁面）
- --all → 完整審查（UI + UX 所有設計稿）
- --ux → UX 設計審查
- --ux-review → 對既有 UI 進行 UX 回顧
- --prd, --a11y, --tokens, --ux-align → 快速模式
```

### 步驟 2: 定位設計稿

```bash
# 如果提供元件名稱，尋找對應設計稿
Glob docs/designs/**/$ARGUMENTS*.md

# 如果提供 --all，列出所有設計稿
Glob docs/designs/components/*.md
Glob docs/designs/pages/*.md
Glob docs/designs/ux/**/*.md

# 如果提供 --ux，只列出 UX 設計稿
Glob docs/designs/ux/**/*.md
```

### 步驟 3: 讀取必要檔案

```bash
# 讀取 PRD
Read docs/PRD.md

# 讀取設計系統
Read docs/designs/design-system.md

# 讀取目標設計稿
Read docs/designs/components/<ComponentName>.md

# 如果是 UI 審查，也讀取對應的 UX 檔案（如有）
Read docs/designs/ux/flows/<feature>-flow.md
Read docs/designs/ux/wireframes/<page>-wireframe.md
```

### 步驟 4: 執行 Design Review

#### UI 設計審查（預設）

使用 Task tool **單一訊息**同時啟動 4 個 Reviewer Agents：

```text
┌──────────────────────────────────────────────────────────────────┐
│  UI Design Review（並行審查）                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ PRD      │ │ A11y     │ │ Design   │ │ UX       │           │
│  │ Alignment│ │          │ │ System   │ │ Alignment│           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └────────────┼────────────┼────────────┘                  │
│                    ▼                                             │
│             Consensus Check                                      │
└──────────────────────────────────────────────────────────────────┘
```

#### UX 設計審查 (`--ux`)

```text
┌──────────────────────────────────────────────────────────────────┐
│  UX Design Review（並行審查）                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ PRD          │ │ Flow         │ │ UX           │             │
│  │ Alignment    │ │ Completeness │ │ Accessibility│             │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│                   Consensus Check                                │
└──────────────────────────────────────────────────────────────────┘
```

#### UX 回顧審查 (`--ux-review`)

針對既有 UI 設計進行 UX 原則檢查：

```text
┌──────────────────────────────────────────────────────────────────┐
│  UX Review for Existing UI                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ User Flow    │ │ Information  │ │ Cognitive    │             │
│  │ Analysis     │ │ Architecture │ │ Load         │             │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│             UX Improvement Recommendations                       │
└──────────────────────────────────────────────────────────────────┘
```

### 步驟 5: Consensus 規則

```text
1. PRD Alignment 為 BLOCKED → 整體 BLOCKED（功能覆蓋不足）
2. 任何 high Agent 為 NEEDS_CHANGES → 整體 NEEDS_CHANGES
3. 全部 APPROVED → 整體 APPROVED
```

### 步驟 6: 產出審查報告

---

## Output Format

### UI 設計審查報告

```markdown
## UI Design Review Report

**審查對象**: docs/designs/components/MemberList.md
**關聯 PRD**: F1.2.1, F1.2.2
**關聯 TICKET**: TICKET-006
**關聯 UX**: [member-management-flow.md](../ux/flows/member-management-flow.md)

### 審查結果

| Agent | 狀態 | 問題數 |
|-------|------|--------|
| PRD Alignment | ✅ APPROVED | 0 |
| Accessibility | ⚠️ NEEDS_CHANGES | 2 |
| Design System | ✅ APPROVED | 0 |
| UX Alignment | ✅ APPROVED | 0 |

### Findings

#### PRD Alignment
✅ 所有功能點都有覆蓋

#### Accessibility
1. [major] 缺少 `aria-label` - 行 85
2. [minor] 建議增加 `:focus-visible` 樣式

#### Design System
✅ 正確使用 Design Tokens

#### UX Alignment
✅ 符合 Wireframe 結構和用戶流程

### 整體結果: ⚠️ NEEDS_CHANGES

### 修改建議

1. 在 Props 介面加入 `ariaLabel?: string`
2. 在 CSS Modules 加入 `:focus-visible` 樣式

### 下一步

修改設計稿後重新審查：
\`\`\`bash
/project:review-design MemberList
\`\`\`
```

### UX 回顧審查報告 (`--ux-review`)

```markdown
## UX Review Report for Existing UI

**審查對象**: docs/designs/components/MemberList.md
**審查類型**: UX 回顧（既有 UI 的 UX 評估）

### UX 評估摘要

| 項目 | 評分 | 說明 |
|------|------|------|
| 用戶流程 | ⭐⭐⭐⭐ | 完整但缺少錯誤處理 |
| 資訊架構 | ⭐⭐⭐⭐⭐ | 結構清晰 |
| 互動一致性 | ⭐⭐⭐⭐ | 大致一致 |
| 錯誤處理 | ⭐⭐⭐ | 需要改善 |
| 認知負荷 | ⭐⭐⭐⭐ | 適當 |

### UX 問題發現

1. **[high] 缺少空狀態設計**
   - 當列表為空時，沒有引導用戶的提示
   - 建議: 加入空狀態插圖和「邀請成員」CTA

2. **[medium] 錯誤訊息不夠具體**
   - 目前只顯示「操作失敗」
   - 建議: 提供具體錯誤原因和解決方案

3. **[low] 批量操作缺少確認**
   - 批量刪除沒有確認 Dialog
   - 建議: 加入確認步驟，顯示將刪除的數量

### UX 改善建議

| 優先級 | 建議 | 影響範圍 |
|--------|------|---------|
| high | 設計空狀態和 Empty State 元件 | MemberList.md |
| medium | 統一錯誤訊息格式 | 全域 |
| low | 加入批量操作確認 Dialog | MemberList.md |

### 建議的 UX 產出

如果要補足 UX 設計，建議產出：
- `docs/designs/ux/flows/member-management-flow.md`
- `docs/designs/ux/wireframes/members-page-wireframe.md`

\`\`\`bash
# 產出對應的 UX 設計
/project:ux 組織成員管理功能
\`\`\`
```

---

## 快速模式

```bash
# 只執行 PRD 對齊檢查
/project:review-design MemberList --prd

# 只執行無障礙檢查
/project:review-design MemberList --a11y

# 只執行 Design System 檢查
/project:review-design MemberList --tokens

# 只執行 UX 對齊檢查
/project:review-design MemberList --ux-align

# 對既有 UI 進行完整 UX 回顧
/project:review-design MemberList --ux-review
```

---

## 自動修改機制

→ 參考 [design-templates.md](../templates/design-templates.md#needs_changes-處理流程)

---

## 相關檔案

- `docs/PRD.md` - 產品需求文件
- `docs/designs/` - 設計稿目錄
  - `docs/designs/components/` - UI 元件設計
  - `docs/designs/pages/` - UI 頁面設計
  - `docs/designs/ux/` - UX 設計（流程、Wireframe）
- `docs/designs/design-system.md` - 設計系統
- `.claude/agents/experts/ux-ui-designer.md` - UX/UI Designer Agent
- `.claude/agents/reviewers/prd-alignment.md`
- `.claude/agents/experts/accessibility-expert.md`
- `.claude/agents/experts/design-system-architect.md`
- `.claude/patterns/multi-agent-review.md`
