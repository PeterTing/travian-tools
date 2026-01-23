# Add Feature Command

> 為現有專案新增功能模組，自動補上對應的流程、Agents 和 Commands。

## 使用方式

```bash
/project:add-feature <feature-type>

# 範例
/project:add-feature frontend      # 新增前端功能
/project:add-feature backend       # 新增後端功能
/project:add-feature database      # 新增資料庫功能
/project:add-feature infrastructure # 新增基礎設施功能
/project:add-feature design        # 新增設計系統功能
```

## 可用的 Feature Types

| Feature Type | 說明 | 新增內容 |
| ------------ | ---- | -------- |
| `frontend` | 前端開發功能 | React/Vue 規範、UI 設計 Agents、前端 Commands |
| `backend` | 後端開發功能 | Go/Node/Python 規範、後端 Workers |
| `database` | 資料庫功能 | Database 專家、Schema 設計模板 |
| `infrastructure` | 基礎設施功能 | CI/CD、Terraform、Deploy Commands |
| `design` | 設計系統功能 | Design System、UI/UX Agents |

---

## 執行流程

```text
┌─────────────────────────────────────────────────────────────────┐
│                  /project:add-feature <type>                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 驗證專案設定                                            │
│     │                                                           │
│     ├─ 讀取 .claude/project.yaml                                │
│     │                                                           │
│     └─ 檢查 feature 是否已存在                                   │
│           │                                                     │
│           ├─ 已存在 → 提示並詢問是否覆蓋                          │
│           │                                                     │
│           └─ 不存在 → 繼續                                       │
│                                                                 │
│  Step 2: 收集 Feature 設定                                       │
│     │                                                           │
│     ├─ frontend:                                                │
│     │   ├─ framework: next | react | vue | nuxt                │
│     │   ├─ package_manager: pnpm | npm | yarn | bun            │
│     │   └─ styling: css-modules | tailwind | styled-components │
│     │                                                           │
│     ├─ backend:                                                 │
│     │   ├─ language: go | python | node                        │
│     │   └─ framework: gin | fastapi | express                  │
│     │                                                           │
│     ├─ database:                                                │
│     │   ├─ type: postgresql | mysql | mongodb                  │
│     │   └─ orm: gorm | prisma | sqlalchemy                     │
│     │                                                           │
│     ├─ infrastructure:                                          │
│     │   ├─ cloud: gcp | aws | azure                            │
│     │   ├─ ci_cd: github-actions | gitlab-ci                   │
│     │   └─ iac: terraform | pulumi                             │
│     │                                                           │
│     └─ design:                                                  │
│         ├─ enabled: true                                       │
│         └─ system: material | antd | custom                    │
│                                                                 │
│  Step 3: 更新 project.yaml                                       │
│     │                                                           │
│     └─ 將新設定寫入 .claude/project.yaml                         │
│                                                                 │
│  Step 4: 複製相關檔案                                             │
│     │                                                           │
│     ├─ 讀取 _registry.yaml                                      │
│     │                                                           │
│     ├─ 根據 requires 條件篩選檔案                                 │
│     │                                                           │
│     └─ 複製符合條件的檔案                                         │
│           ├─ Agents (experts, workers, reviewers)              │
│           ├─ Commands                                           │
│           ├─ Templates                                          │
│           └─ Skills                                             │
│                                                                 │
│  Step 5: 更新 CLAUDE.md                                          │
│     │                                                           │
│     ├─ 新增 Feature 相關章節                                     │
│     │                                                           │
│     └─ 更新可用指令列表                                           │
│                                                                 │
│  Step 6: 輸出報告                                                │
│     │                                                           │
│     ├─ 新增的 Agents                                            │
│     ├─ 新增的 Commands                                          │
│     └─ 建議的下一步                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature 對應檔案

### Frontend

```yaml
agents:
  experts:
    - frontend.md
    - frontend-react.md   # 如果 framework: next|react
    - frontend-vue.md     # 如果 framework: vue|nuxt
    - ux-ui-designer.md
    - accessibility-expert.md
  workers:
    - engineer-frontend.md
  reviewers:
    - ui.md
    - prd-alignment.md

commands:
  - design.md
  - design-system.md
  - sync-design-system.md
  - review-design.md
  - ux.md
  - ui.md
  - test-e2e.md

templates:
  - design-templates.md

skills:
  - webapp-testing/
```

### Backend

```yaml
agents:
  experts:
    - backend.md
    - backend-go.md       # 如果 language: go
    - backend-python.md   # 如果 language: python
    - backend-node.md     # 如果 language: node
  workers:
    - engineer-backend.md
  reference:
    - golang-pro.md       # 如果 language: go

templates:
  - clean-architecture.md
  - gorm-patterns.md      # 如果 language: go
```

### Database

```yaml
agents:
  experts:
    - database.md
  reference:
    - database-architect.md

templates:
  - (database-specific templates)
```

### Infrastructure

```yaml
agents:
  experts:
    - cicd.md
    - terraform.md        # 如果 iac: terraform
  workers:
    - devops-troubleshooter.md
  reviewers:
    - infra-validator.md
    - rollback.md
  reference:
    - cloud-architect.md

commands:
  - deploy.md
  - db-migrate.md
```

### Design

```yaml
agents:
  experts:
    - design-system-architect.md
    - ux-ui-designer.md
    - accessibility-expert.md
  reviewers:
    - ui.md
    - prd-alignment.md

commands:
  - design.md
  - design-system.md
  - sync-design-system.md
  - review-design.md
```

---

## 輸出格式

### 成功

```markdown
## /project:add-feature 執行結果

### Feature: frontend
### 結果: ✅ 成功

---

### 更新的 project.yaml

```yaml
tech_stack:
  frontend:
    framework: "next"
    package_manager: "pnpm"
    styling: "css-modules"
```

---

### 新增的檔案

**Agents (7 個)**:
- ✅ experts/frontend.md
- ✅ experts/frontend-react.md
- ✅ experts/ux-ui-designer.md
- ✅ experts/accessibility-expert.md
- ✅ workers/engineer-frontend.md
- ✅ reviewers/ui.md
- ✅ reviewers/prd-alignment.md

**Commands (6 個)**:
- ✅ commands/design.md
- ✅ commands/design-system.md
- ✅ commands/sync-design-system.md
- ✅ commands/review-design.md
- ✅ commands/ux.md
- ✅ commands/ui.md

**Templates (1 個)**:
- ✅ templates/design-templates.md

**Skills (1 個)**:
- ✅ skills/webapp-testing/

---

### CLAUDE.md 已更新

新增章節:
- Frontend 開發規範
- UI 設計指令
- E2E 測試

---

### 下一步

1. 執行 `/project:design-system` 建立設計系統
2. 參考 `experts/frontend.md` 了解前端規範
3. 使用 `/project:tdd TICKET-XXX` 開始開發
```

### 已存在

```markdown
## /project:add-feature 執行結果

### Feature: frontend
### 結果: ⚠️ 已存在

---

Frontend 功能已存在於 project.yaml:

```yaml
tech_stack:
  frontend:
    framework: "next"
    package_manager: "pnpm"
```

---

### 選項

1. **保持現狀** - 不做任何變更
2. **覆蓋設定** - 重新設定 frontend（會覆蓋現有設定）
3. **補充缺失** - 只新增缺少的檔案（不覆蓋現有檔案）

請選擇或輸入 `/project:add-feature frontend --force` 強制覆蓋
```

---

## 進階用法

```bash
# 強制覆蓋（不詢問確認）
/project:add-feature frontend --force

# 只新增缺失的檔案
/project:add-feature frontend --merge

# 指定具體設定（跳過互動問答）
/project:add-feature frontend --framework=next --package-manager=pnpm

# 同時新增多個 features
/project:add-feature frontend backend database
```

---

## 🔌 開源 Agents 與 Skills 推薦

新增功能模組後，建議根據功能類型選擇適合的開源 Agents 和 Skills：

### 依 Feature Type 推薦

#### Frontend 推薦

| 資源 | 來源 | 說明 |
| ---- | ---- | ---- |
| `frontend-developer` | [wshobson/agents](https://github.com/wshobson/agents) | React/Vue 開發專家 |
| `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills) | Playwright E2E 測試 |

#### Backend 推薦

| 資源 | 來源 | 說明 |
| ---- | ---- | ---- |
| `golang-pro` | [wshobson/agents](https://github.com/wshobson/agents) | Go 專業實踐（如 language: go）|
| `database-architect` | [wshobson/agents](https://github.com/wshobson/agents) | 資料庫設計專家 |

#### Infrastructure 推薦

| 資源 | 來源 | 說明 |
| ---- | ---- | ---- |
| `cloud-architect` | [wshobson/agents](https://github.com/wshobson/agents) | 多雲架構設計 |
| `devops-troubleshooter` | [wshobson/agents](https://github.com/wshobson/agents) | 生產環境問題排查 |

#### 報表/文件 推薦

| 資源 | 來源 | 說明 |
| ---- | ---- | ---- |
| `xlsx` | [anthropics/skills](https://github.com/anthropics/skills) | Excel 報表生成 |
| `pdf` | [anthropics/skills](https://github.com/anthropics/skills) | PDF 文件生成 |
| `doc-coauthoring` | [anthropics/skills](https://github.com/anthropics/skills) | 結構化文件協作 |

### 自動安裝（即將支援）

```bash
# 未來版本將支援自動安裝推薦的 Agents/Skills
/project:add-feature frontend --with-recommended

# 或手動指定
/project:add-feature frontend --agents=frontend-developer --skills=webapp-testing
```

### 手動安裝

```bash
# 安裝 Agent
curl -o .claude/agents/reference/frontend-developer.md \
  https://raw.githubusercontent.com/wshobson/agents/main/frontend-developer.md

# 安裝 Skill
git clone --depth 1 https://github.com/anthropics/skills.git /tmp/skills
cp -r /tmp/skills/webapp-testing .claude/skills/
```

---

## 相關文件

- [init.md](./init.md) - 專案初始化
- [_registry.yaml](../agents/_registry.yaml) - Agents 註冊表
- [project-schema.yaml](../../schema/project-schema.yaml) - 專案設定 Schema
