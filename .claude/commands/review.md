# Code Review Command (Multi-Agent)

對當前變更進行 Multi-Agent Code Review。

## Usage

```
/project:review [TICKET-XXX]
/project:review --security    # 只執行 Security Agent
/project:review --test        # 只執行 Test Agent
/project:review --quality     # 只執行 Quality Agent
/project:review --pm          # 只執行 PM Agent
```

## 參考 Agents

→ 參考 [code-review-agents.md](../templates/code-review-agents.md)

### Expert Agents（規範參考，被 Quality Agent 載入）

| Agent | 檔案位置 | 用途 |
|-------|---------|------|
| **Frontend Expert** | `.claude/agents/experts/frontend.md` | 審查 `.tsx` 檔案時載入 |
| **Backend Expert** | `.claude/agents/experts/backend.md` | 審查 `.go` 檔案時載入 |
| **Database Expert** | `.claude/agents/experts/database.md` | 審查 DB Schema 時載入 |
| **CI/CD Expert** | `.claude/agents/experts/cicd.md` | 審查 `.github/workflows/*.yml` 時載入 |
| **Terraform Expert** | `.claude/agents/experts/terraform.md` | 審查 `terraform/*.tf` 時載入 |

## 執行流程

### 1. 準備

```bash
# 取得變更檔案
git diff --cached --name-only
git diff --name-only

# 識別 Ticket ID
git branch --show-current | grep -oE "TICKET-[0-9]+"
```

### 2. 依序執行 Multi-Agent Review

→ 參考 [code-review-agents.md](../templates/code-review-agents.md#agent-職責表)

**Security FAIL → 立即停止後續審查**

### 3. 產出報告

```
# Multi-Agent Code Review Report

## Agent 審查結果
| Agent | 狀態 | 摘要 |
|-------|------|------|
| 🔒 Security | ✅/❌ | ... |
| 🧪 Test | ✅/❌ | 覆蓋率 X% |
| 📐 Quality | ✅/❌ | Lint errors: X |
| 📋 PM | ✅/❌ | 驗收 X% |

## 最終狀態
✅ PASS - Ready for merge
或
❌ FAIL - 必須修復: [問題清單]
```

## 相關檔案

- `.claude/agents/reviewers/security.md`
- `.claude/agents/reviewers/test.md`
- `.claude/agents/reviewers/quality.md`
- `.claude/agents/reviewers/pm.md`
