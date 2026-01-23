# Code Review Agents

> Multi-Agent Code Review 的 Agent 職責定義，供 CLAUDE.md 和各 Command 引用

---

## Agent 總覽

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         Review Orchestrator                              │
└──────┬──────────┬──────────┬──────────┬──────────┬───────────────────────┘
       │          │          │          │          │
   ┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ┌───▼───┐
   │🔒     │  │🧪     │  │📐     │  │📋     │  │🎨     │
   │Security│  │ Test  │  │Quality│  │  PM   │  │  UI   │
   └───────┘  └───────┘  └───────┘  └───────┘  └───────┘
```

---

## Agent 職責表

| Agent | 優先級 | 審查項目 | FAIL 條件 |
|-------|-------|---------|----------|
| 🔒 Security | **最高** | OWASP Top 10、Secrets、SQL Injection、XSS | 任何 Critical 問題 |
| 🧪 Test | 高 | 測試檔案存在、覆蓋率 > 80%、**E2E 測試覆蓋驗收條件** | 缺少必要測試、覆蓋率不足、**E2E 測試未覆蓋驗收條件** |
| 📐 Quality | 高 | Clean Architecture、Lint、命名規範 | 架構違規、Lint errors |
| 📋 PM | 高 | Ticket 驗收條件 | 驗收未 100% 完成 |
| 🎨 UI | 高 | 設計稿合規、Props、CSS Modules、響應式 | 未依設計稿實作、缺少必要 Props |

---

## 詳細定義

### 🔒 Security Agent (最高優先)

**如果 Security Agent FAIL，整體 Review 立即 FAIL，不執行後續 Agent。**

檢查項目：
- SQL Injection (參數化查詢)
- 硬編碼 Secrets
- XSS 漏洞
- 認證/授權缺失
- CORS 設定
- 依賴漏洞

詳細定義：`.claude/agents/reviewers/security.md`

### 🧪 Test Agent

確保每個程式碼檔案都有對應的測試。

**核心檢查**：
- 測試檔案是否存在
- 測試覆蓋率 > 80%
- **E2E 測試是否覆蓋 Ticket 的所有驗收條件**

詳細定義：`.claude/agents/reviewers/test.md`

測試規範：→ 參考 [test-requirements.md](./test-requirements.md)

### 📐 Quality Agent

確保程式碼品質和架構一致性。

檢查項目：
- Clean Architecture 合規
- Lint 無錯誤
- 命名規範
- 程式碼重複

詳細定義：`.claude/agents/reviewers/quality.md`

架構規範：→ 參考 [clean-architecture.md](./clean-architecture.md)

### 📋 PM Agent

從 `docs/TICKETS.md` 讀取驗收條件，驗證每個條件是否滿足。

**識別 Ticket 方式**：
1. Branch 名稱: `feature/TICKET-012-xxx`
2. Commit message: `feat: xxx - TICKET-012`
3. 手動指定: `/project:done TICKET-012`

詳細定義：`.claude/agents/reviewers/pm.md`

### 🎨 UI Agent

確保 UI 實作符合設計稿規範。

檢查項目：
- 是否依照設計稿實作
- Props 介面是否正確
- CSS Modules 使用
- 響應式行為

詳細定義：`.claude/agents/reviewers/ui.md`

---

## Consensus 規則與回饋迴圈

→ 參考 [multi-agent-review.md](../patterns/multi-agent-review.md#核心概念)

**快速參考**：

- **critical Agent (Security) BLOCKED** → 整體立即 BLOCKED
- **high Agent NEEDS_CHANGES** → 觸發回饋迴圈（最多 5 輪）
- **全部 APPROVED** → 整體 APPROVED

---

## 與 Commands 的對應

| Command | 使用的 Agents | Max Iterations |
|---------|--------------|----------------|
| `/project:done` | Security, Test, Quality, PM, UI | 1（驗收）|
| `/project:review` | Security, Test, Quality, PM, UI | 1（審查）|
| `/project:start-dev` | Security, Test, Quality, PM | 5（開發迴圈）|

---

## Agent 定義檔案位置

```text
.claude/agents/reviewers/
├── security.md        # 🔒 Security Agent
├── test.md            # 🧪 Test Agent
├── quality.md         # 📐 Quality Agent
├── pm.md              # 📋 PM Agent
└── ui.md              # 🎨 UI Agent
```

---

## 使用方式

在其他文件中引用：

```markdown
## Multi-Agent Code Review

→ 參考 [code-review-agents.md](../.claude/templates/code-review-agents.md)

## Agent 職責

→ 參考 [code-review-agents.md](../.claude/templates/code-review-agents.md#agent-職責表)
```
