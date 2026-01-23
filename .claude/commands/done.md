# Done Command

> 完成開發命令。執行測試、Multi-Agent Review、更新 Ticket 狀態。

## 使用方式

```bash
/project:done [TICKET-XXX]

# 範例
/project:done                    # 自動從 branch/commit 識別
/project:done TICKET-012         # 指定 Ticket
```

## 執行流程

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              /project:done [TICKET-XXX]                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Step 1: 識別 Ticket                                                            │
│     │                                                                           │
│     ├─ 從參數讀取 TICKET-XXX                                                    │
│     │                                                                           │
│     ├─ 或從 branch 名稱解析                                                     │
│     │   └─ feature/TICKET-XXX-description                                      │
│     │                                                                           │
│     └─ 或從最近 commit 解析                                                     │
│         └─ feat: xxx - TICKET-XXX                                              │
│                                                                                 │
│  Step 2: 執行測試（並行）                                                        │
│     │                                                                           │
│     ├──────────────┬──────────────┬──────────────┬──────────────┐              │
│     │              │              │              │              │              │
│     ▼              ▼              ▼              ▼              ▼              │
│  ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐              │
│  │ Unit  │    │  E2E  │    │ Lint  │    │Cover- │    │ Build │              │
│  │ Test  │    │ Test  │    │ Check │    │ age   │    │ Check │              │
│  │       │    │       │    │       │    │       │    │       │              │
│  │Backend│    │Playwright   │golangci│    │> 80%  │    │go build             │
│  │Frontend    │       │    │eslint │    │       │    │npm build             │
│  └───────┘    └───────┘    └───────┘    └───────┘    └───────┘              │
│     │              │              │              │              │              │
│     └──────────────┴──────────────┴──────────────┴──────────────┘              │
│                           │                                                     │
│                           ▼                                                     │
│                  ┌─────────────────┐                                            │
│                  │  測試全部通過？  │                                            │
│                  │                 │                                            │
│                  │  N → FAIL       │                                            │
│                  │       輸出失敗報告                                            │
│                  │       不執行 Review                                          │
│                  │                 │                                            │
│                  │  Y → 繼續       │                                            │
│                  └─────────────────┘                                            │
│                           │                                                     │
│  Step 3: Multi-Agent Review（並行）                                             │
│     │                                                                           │
│     ├──────────────┬──────────────┬──────────────┐                             │
│     │              │              │              │                             │
│     ▼              ▼              ▼              ▼                             │
│  ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐                             │
│  │🔒 Sec │    │🧪Test │    │📐Qual │    │📋 PM  │                             │
│  │ Agent │    │ Agent │    │ Agent │    │ Agent │                             │
│  │       │    │       │    │       │    │       │                             │
│  │OWASP  │    │覆蓋率 │    │Clean  │    │驗收   │                             │
│  │Secrets│    │E2E    │    │Arch   │    │條件   │                             │
│  └───────┘    └───────┘    └───────┘    └───────┘                             │
│     │              │              │              │                             │
│     │   Security FAIL → 整體立即 FAIL                                          │
│     │                                                                          │
│     └──────────────┴──────────────┴──────────────┘                             │
│                           │                                                     │
│  Step 4: 結果判定                                                               │
│     │                                                                           │
│     ├─ 全部 PASS → APPROVED                                                    │
│     │     ├─ 更新 TICKETS.md（✅ 完成）                                         │
│     │     └─ 輸出成功報告                                                       │
│     │                                                                           │
│     └─ 任一 FAIL → REJECTED                                                    │
│           ├─ 保持 TICKETS.md 狀態                                               │
│           └─ 輸出問題報告                                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 測試執行

### 根據 project.yaml 設定執行

```yaml
# project.yaml
tech_stack:
  backend:
    language: "go"    # → go test
  frontend:
    framework: "next" # → pnpm test
    package_manager: "pnpm"

team:
  test_coverage: 80
  e2e_required: true
  e2e_framework: "playwright"
```

### 測試命令對應

| 語言/框架 | 單元測試 | E2E 測試 | Lint |
| --------- | -------- | -------- | ---- |
| **Go** | `go test -v -race ./...` | - | `golangci-lint run` |
| **Node (pnpm)** | `pnpm test` | `pnpm test:e2e` | `pnpm lint` |
| **Node (npm)** | `npm test` | `npm run test:e2e` | `npm run lint` |
| **Python** | `pytest` | `pytest e2e/` | `ruff check` |

---

## TICKETS.md 更新

### 更新項目

```markdown
### 🎫 TICKET-XXX: [標題]

**狀態**: ✅ 完成 (原: 🔵 進行中)
**完成日期**: 2026-01-22

**Backend 驗收條件**:
- [x] 條件 1
- [x] 條件 2

**Frontend 驗收條件**:
- [x] 條件 1
- [x] 條件 2
```

### 進度追蹤表格更新

```markdown
| Ticket | 標題 | 狀態 | 完成日期 |
| ------ | ---- | ---- | -------- |
| TICKET-012 | 用戶登入 | ✅ | 2026-01-22 |
```

---

## 輸出格式

### 成功 (APPROVED)

```markdown
## /project:done 執行結果

### Ticket: TICKET-XXX
### 結果: ✅ APPROVED

---

### 測試結果

| 測試類型 | 結果 | 詳情 |
| -------- | ---- | ---- |
| Unit Test (Backend) | ✅ PASS | 45 passed |
| Unit Test (Frontend) | ✅ PASS | 23 passed |
| E2E Test | ✅ PASS | 8 passed |
| Lint (Backend) | ✅ PASS | 0 issues |
| Lint (Frontend) | ✅ PASS | 0 issues |
| Coverage | ✅ PASS | 85% (target: 80%) |
| Build | ✅ PASS | - |

---

### Review 結果

| Agent | 結果 | 關鍵發現 |
| ----- | ---- | -------- |
| 🔒 Security | ✅ PASS | 無安全問題 |
| 🧪 Test | ✅ PASS | 覆蓋率 85%，E2E 完整 |
| 📐 Quality | ✅ PASS | 架構正確，Lint 通過 |
| 📋 PM | ✅ PASS | 驗收 100% 完成 |

---

### TICKETS.md 已更新

```diff
- **狀態**: 🔵 進行中
+ **狀態**: ✅ 完成
+ **完成日期**: 2026-01-22
```

---

### 下一步

- 可以繼續開發下一個 Ticket
- 或執行 `/project:deploy` 部署
```

### 失敗 (REJECTED)

```markdown
## /project:done 執行結果

### Ticket: TICKET-XXX
### 結果: ❌ REJECTED

---

### 測試結果

| 測試類型 | 結果 | 詳情 |
| -------- | ---- | ---- |
| Unit Test (Backend) | ✅ PASS | 45 passed |
| Unit Test (Frontend) | ❌ FAIL | 2 failed |
| E2E Test | ✅ PASS | 8 passed |
| Coverage | ⚠️ WARNING | 72% (target: 80%) |

### 測試失敗詳情

```text
FAIL  src/components/LoginForm.test.tsx
  ✕ should display error message on failed login (52ms)
    Expected: "登入失敗"
    Received: undefined

  ✕ should disable button while loading (28ms)
    Expected button to be disabled
```

---

### Review 結果

| Agent | 結果 | 關鍵發現 |
| ----- | ---- | -------- |
| 🔒 Security | ✅ PASS | - |
| 🧪 Test | ❌ FAIL | 測試失敗，覆蓋率不足 |
| 📐 Quality | ✅ PASS | - |
| 📋 PM | ⚠️ WARNING | 錯誤訊息顯示未完成 |

---

### 需修復項目

1. **測試失敗** - LoginForm.test.tsx
   - 修復錯誤訊息顯示邏輯
   - 修復 loading 狀態按鈕

2. **覆蓋率不足** (72% < 80%)
   - 補充 error handling 測試

3. **驗收條件未完成**
   - [ ] 錯誤訊息顯示

---

### 下一步

1. 修復上述問題
2. 重新執行 `/project:done`
```

---

## Review 快速模式

```bash
# 只執行特定 Agent
/project:done --security    # 只執行 Security Agent
/project:done --test        # 只執行 Test Agent
/project:done --quality     # 只執行 Quality Agent
/project:done --pm          # 只執行 PM Agent

# 跳過測試（不建議）
/project:done --skip-tests  # 直接進入 Review
```

---

## 相關文件

- [WORKFLOWS.md](../WORKFLOWS.md) - 完整開發流程
- [security.md](../agents/reviewers/security.md) - Security Agent
- [test.md](../agents/reviewers/test.md) - Test Agent
- [quality.md](../agents/reviewers/quality.md) - Quality Agent
- [pm.md](../agents/reviewers/pm.md) - PM Agent
