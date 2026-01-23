# Start-Dev Command

> 多 Agent 協作開發命令。自動化開發循環與 Code Review。

## 使用方式

```bash
/project:start-dev TICKET-XXX

# 範例
/project:start-dev TICKET-012
/project:start-dev TICKET-012,TICKET-013  # 多個 Tickets
```

## 執行流程

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         /project:start-dev TICKET-XXX                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Phase 1: 需求分析                                                              │
│     ├─ 讀取 TICKETS.md 找到 TICKET-XXX                                          │
│     ├─ 讀取相關設計稿（如有）                                                    │
│     ├─ 讀取相關 PRD 章節                                                        │
│     └─ 解析所有驗收條件                                                         │
│                                                                                 │
│  Phase 2: 開發循環（最多 5 輪）                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                         │   │
│  │    ┌────────────────────────────────────────────────┐                  │   │
│  │    │              Engineer Agent                     │                  │   │
│  │    │                                                 │                  │   │
│  │    │  1. 讀取驗收條件                                 │                  │   │
│  │    │  2. TDD 開發（RED → GREEN → REFACTOR）          │                  │   │
│  │    │  3. 撰寫單元測試                                 │                  │   │
│  │    │  4. 撰寫 E2E 測試（覆蓋驗收條件）               │                  │   │
│  │    │  5. 執行自我檢查                                 │                  │   │
│  │    └──────────────────────┬─────────────────────────┘                  │   │
│  │                           │                                             │   │
│  │                           ▼                                             │   │
│  │    ┌────────────────────────────────────────────────┐                  │   │
│  │    │           Review Agents (並行執行)              │                  │   │
│  │    │                                                 │                  │   │
│  │    │  ┌────────────┬────────────┬────────────┬────┐ │                  │   │
│  │    │  │ 🔒Security │ 🧪 Test    │ 📐Quality  │ 📋PM│ │                  │   │
│  │    │  │   Agent    │   Agent    │   Agent    │Agent│ │                  │   │
│  │    │  │            │            │            │     │ │                  │   │
│  │    │  │ OWASP      │ 覆蓋率     │ Clean      │驗收 │ │                  │   │
│  │    │  │ Secrets    │ E2E        │ Arch       │條件 │ │                  │   │
│  │    │  │ Auth       │ 品質       │ Lint       │100% │ │                  │   │
│  │    │  └────────────┴────────────┴────────────┴─────┘ │                  │   │
│  │    └──────────────────────┬─────────────────────────┘                  │   │
│  │                           │                                             │   │
│  │                           ▼                                             │   │
│  │                  ┌─────────────────┐                                    │   │
│  │                  │  全部 APPROVED? │                                    │   │
│  │                  │                 │                                    │   │
│  │                  │  Y → 結束循環   │                                    │   │
│  │                  │  N → 整合 feedback                                   │   │
│  │                  │      回 Engineer│                                    │   │
│  │                  └─────────────────┘                                    │   │
│  │                                                                         │   │
│  │  若 5 輪後仍未通過 → 輸出檢討報告                                        │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Phase 3: 完成                                                                  │
│     ├─ 輸出 Final Report                                                       │
│     ├─ 更新 TICKETS.md 狀態                                                    │
│     └─ 提示下一步                                                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent 協作機制

### 使用 Claude Code Task Tool

```text
Orchestrator 使用 Task tool 啟動 sub-agents：

1. 啟動 Engineer Agent
   Task(prompt="實作 TICKET-XXX", agent_type="engineer")

2. Engineer 完成後，並行啟動 4 個 Review Agents
   Task(prompt="Security Review", agent_type="security")  ─┐
   Task(prompt="Test Review", agent_type="test")          ├─ 並行
   Task(prompt="Quality Review", agent_type="quality")    │
   Task(prompt="PM Review", agent_type="pm")              ─┘

3. 收集 Review 結果，判斷是否通過
```

### Review Agent 優先級

| Agent | 優先級 | FAIL 處理 |
| ----- | ------ | --------- |
| 🔒 Security | **最高** | 立即 FAIL，阻止後續 |
| 🧪 Test | 高 | 需修復後重試 |
| 📐 Quality | 高 | 需修復後重試 |
| 📋 PM | 高 | 需補充功能後重試 |

---

## Feedback 整合

### 當 Review 未通過時

```markdown
## Review Feedback (Round X/5)

### 未通過 Agents

#### 🔒 Security Agent: FAIL
- [ ] SQL Injection 風險 - internal/user/repository.go:45
- [ ] 缺少權限檢查 - internal/user/handler.go:78

#### 🧪 Test Agent: FAIL
- [ ] 測試覆蓋率 65%（目標 80%）
- [ ] E2E 未覆蓋：用戶登出流程

### 已通過 Agents
- 📐 Quality Agent: PASS
- 📋 PM Agent: PASS

### 請 Engineer 修復上述問題後重新提交
```

### Engineer 收到 Feedback 後

```text
1. 依優先級處理（Security 優先）
2. 逐一修復問題
3. 執行測試確認修復
4. 重新提交 Review
```

---

## 檢討報告（5 輪後仍未通過）

```markdown
## 開發檢討報告

### 基本資訊
- Ticket: TICKET-XXX
- 執行輪數: 5
- 最終結果: FAIL

### 持續失敗的問題

| Agent | 問題 | 出現輪數 |
| ----- | ---- | -------- |
| Security | SQL Injection | 1-5 |
| Test | 覆蓋率不足 | 2-5 |

### 根本原因分析

1. **SQL Injection 問題**
   - 原因：使用 string concatenation 組合 SQL
   - 解決方案：改用參數化查詢

2. **測試覆蓋率不足**
   - 原因：錯誤處理邏輯未測試
   - 解決方案：補充 error case 測試

### 建議行動

1. 先解決 Security 問題（阻擋性）
2. 補充測試覆蓋
3. 考慮拆分 Ticket 為更小單位

### 參考資源

- [參數化查詢指南](link)
- [測試最佳實踐](link)
```

---

## 輸出格式

### 成功完成

```markdown
## /project:start-dev 執行結果

### Ticket: TICKET-XXX
### 結果: ✅ APPROVED

### 執行摘要

| 項目 | 結果 |
| ---- | ---- |
| 執行輪數 | 2 |
| 最終狀態 | APPROVED |

### Review 結果

| Agent | 結果 | 備註 |
| ----- | ---- | ---- |
| 🔒 Security | ✅ PASS | - |
| 🧪 Test | ✅ PASS | 覆蓋率 85% |
| 📐 Quality | ✅ PASS | - |
| 📋 PM | ✅ PASS | 驗收 100% |

### 建立/修改的檔案

| 檔案 | 類型 | 說明 |
| ---- | ---- | ---- |
| internal/auth/service.go | 新增 | 認證服務 |
| internal/auth/service_test.go | 新增 | 服務測試 |
| internal/auth/handler.go | 新增 | HTTP Handler |
| ... | ... | ... |

### TICKETS.md 已更新
- TICKET-XXX 狀態: 🔵 → ✅

### 下一步
- 執行 `/project:done` 進行最終確認
- 或繼續開發下一個 Ticket
```

---

## 相關文件

- [engineer.md](../agents/workers/engineer.md) - Engineer Agent 定義
- [security.md](../agents/reviewers/security.md) - Security Agent 定義
- [test.md](../agents/reviewers/test.md) - Test Agent 定義
- [quality.md](../agents/reviewers/quality.md) - Quality Agent 定義
- [pm.md](../agents/reviewers/pm.md) - PM Agent 定義
