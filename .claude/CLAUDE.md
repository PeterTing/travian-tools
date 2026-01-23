# CLAUDE.md - travian-tools

> Claude Code 專案指引。定義開發流程、規範和 AI 協作準則。

## 開發流程

**📖 完整工作流程總覽**：→ [.claude/WORKFLOWS.md](.claude/WORKFLOWS.md)

### 標準開發流程

```text
┌─────────────────────────────────────────────────────────────────┐
│  Phase 0        Phase 1       Phase 2       Phase 3   Phase 4  │
│  ──────────     ──────────    ──────────    ────────  ──────── │
│  /project:plan  /project:     TDD 實作      E2E 測試  /project:│
│  (產出 Tickets) start-dev     RED→GREEN→    (強制)    done     │
│                 /project:tdd  REFACTOR                Review   │
└─────────────────────────────────────────────────────────────────┘
```

## 專案資訊

| 項目 | 值 |
| ---- | -- |
| 專案名稱 | travian-tools |
| 專案類型 | web-app |
| 後端 | python + fastapi |
| ORM | sqlalchemy |
| 架構 | clean |
| 前端 | react |
| UI 框架 | shadcn |
| 套件管理器 | pnpm |
| 資料庫 | mysql 16 |
| 測試覆蓋率目標 | 80% |
| E2E 測試 | 強制 |

## Review Agents

| Agent | 說明 |
| ----- | ---- |
| security | OWASP 安全檢查 |
| test | 測試覆蓋率、E2E 測試 |
| quality | Clean Architecture、Lint |
| pm | 驗收條件檢查 |

## 可用指令

| 指令 | 說明 |
| ---- | ---- |
| `/project:plan <需求>` | 需求規劃，產出 Tickets |
| `/project:start-dev TICKET-XXX` | 多 Agent 協作開發 |
| `/project:tdd TICKET-XXX` | TDD 模式開發 |
| `/project:done` | 完成開發，執行 Review |
| `/project:add-feature <type>` | 新增功能模組 |
| `/project:design <元件>` | UI 設計稿生成 |
| `/project:test-e2e` | E2E 測試 |
| `/project:deploy <env>` | 部署 |

## 外部資源

建議瀏覽以下開源資源擴充專案能力：

- **[wshobson/agents](https://github.com/wshobson/agents)** - 108 個專業 Agents
- **[anthropics/skills](https://github.com/anthropics/skills)** - 官方 Skills 集合

詳見 → [.claude/EXTERNAL_RESOURCES.md](.claude/EXTERNAL_RESOURCES.md)

## 相關文件

- [docs/PRD.md](docs/PRD.md) - 產品需求文件
- [docs/TICKETS.md](docs/TICKETS.md) - Ticket 追蹤
