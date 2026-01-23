# External Resources Guide

> 推薦的開源 Agents 和 Skills 資源，用於擴充專案的 Claude Code 能力。

---

## 資源來源

| 來源 | 說明 | 連結 |
| ---- | ---- | ---- |
| **wshobson/agents** | 社群維護的 108 個專業 Agents | [GitHub](https://github.com/wshobson/agents) |
| **anthropics/skills** | Anthropic 官方 Skills 集合 | [GitHub](https://github.com/anthropics/skills) |

---

## wshobson/agents - 108 個專業 Agents

### 概覽

- **72 個專注的 plugins**，每個包含專業 Agents
- **23 個分類領域**
- 優化 token 使用和組合性

### 架構與系統設計

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `backend-architect` | opus | RESTful API 設計、微服務邊界、資料庫 Schema | 大型後端架構 |
| `frontend-developer` | sonnet | React 元件和客戶端狀態管理 | 前端開發 |
| `graphql-architect` | opus | GraphQL schemas、resolvers、federation | GraphQL 專案 |
| `cloud-architect` | opus | AWS/Azure/GCP 基礎設施和成本優化 | 雲端架構 |
| `kubernetes-architect` | opus | Kubernetes 和 GitOps 雲原生架構 | K8s 專案 |
| `event-sourcing-architect` | opus | Event sourcing、CQRS、saga 編排 | 事件驅動架構 |
| `monorepo-architect` | opus | Nx、Turborepo、Bazel monorepo 工具 | Monorepo 專案 |

### UI/UX 與行動開發

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `ui-designer` | opus | 行動和網頁 UI/UX 設計 | UI 設計 |
| `accessibility-expert` | opus | WCAG 合規、無障礙審計 | 無障礙需求 |
| `design-system-architect` | opus | Design tokens、元件庫、主題系統 | 設計系統 |
| `mobile-developer` | sonnet | React Native 和 Flutter 開發 | 跨平台 App |
| `ios-developer` | sonnet | Swift/SwiftUI 原生 iOS 開發 | iOS 專案 |
| `flutter-expert` | sonnet | Flutter 進階開發與狀態管理 | Flutter 專案 |

### 程式語言 - 系統與低階

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `golang-pro` | sonnet | goroutines、channels、並行程式設計 | Go 專案 |
| `rust-pro` | sonnet | 記憶體安全、所有權模式 | Rust 專案 |
| `c-pro` | sonnet | 系統程式設計、記憶體管理、OS 介面 | C 專案 |
| `cpp-pro` | sonnet | 現代 C++、RAII、智慧指標、STL | C++ 專案 |

### 程式語言 - Web 與應用

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `javascript-pro` | sonnet | ES6+、async 模式、Node.js | JavaScript 專案 |
| `typescript-pro` | sonnet | 進階型別系統、泛型 | TypeScript 專案 |
| `python-pro` | sonnet | Python 進階功能和優化 | Python 專案 |
| `django-pro` | sonnet | Django ORM 和 async views | Django 專案 |
| `fastapi-pro` | sonnet | FastAPI async 模式和 Pydantic | FastAPI 專案 |

### 程式語言 - Enterprise 與 JVM

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `java-pro` | sonnet | streams、並行、JVM 優化 | Java 專案 |
| `scala-pro` | sonnet | 函數式程式設計、分散式系統 | Scala 專案 |
| `csharp-pro` | sonnet | .NET 框架和模式 | C# 專案 |

### 基礎設施與運維

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `devops-troubleshooter` | sonnet | 生產除錯、日誌分析、部署排障 | 生產問題 |
| `deployment-engineer` | sonnet | CI/CD pipelines、容器化、雲部署 | 部署自動化 |
| `terraform-specialist` | sonnet | Terraform 模組和狀態管理 | IaC 專案 |
| `database-optimizer` | sonnet | 查詢優化、索引設計、遷移策略 | 效能優化 |
| `database-architect` | opus | 資料庫設計、技術選型、Schema 建模 | 資料庫架構 |
| `incident-responder` | opus | 生產事件管理和解決 | 事件處理 |

### 品質保證與安全

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `code-reviewer` | opus | 安全導向程式碼審查 | Code Review |
| `security-auditor` | opus | 漏洞評估、OWASP 合規 | 安全審計 |
| `test-automator` | sonnet | 完整測試套件（unit、integration、e2e） | 測試自動化 |
| `tdd-orchestrator` | sonnet | TDD 方法論指引 | TDD 開發 |
| `performance-engineer` | opus | 應用 profiling 和優化 | 效能工程 |
| `observability-engineer` | opus | 監控、分散式追蹤、SLI/SLO 管理 | 可觀測性 |

### 資料與 AI

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `data-scientist` | opus | 資料分析、SQL、BigQuery 操作 | 資料分析 |
| `data-engineer` | sonnet | ETL pipelines、資料倉儲、串流架構 | 資料工程 |
| `ai-engineer` | opus | LLM 應用、RAG 系統、prompt pipelines | AI 應用 |
| `ml-engineer` | opus | ML pipelines、模型部署、特徵工程 | ML 專案 |
| `prompt-engineer` | opus | LLM prompt 優化和工程 | Prompt 工程 |

### 文件與技術寫作

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `docs-architect` | opus | 完整技術文件生成 | 文件架構 |
| `api-documenter` | sonnet | OpenAPI/Swagger 規格和開發者文件 | API 文件 |
| `mermaid-expert` | sonnet | 流程圖、序列圖、ERD 圖表 | 圖表生成 |
| `c4-component` | sonnet | C4 元件層架構文件 | 架構圖 |

### 商業與營運

| Agent | Model | 說明 | 推薦場景 |
| ----- | ----- | ---- | -------- |
| `business-analyst` | sonnet | 指標分析、報表、KPI 追蹤 | 商業分析 |
| `content-marketer` | sonnet | 部落格、社群媒體、Email 行銷 | 內容行銷 |
| `hr-pro` | opus | HR 營運、政策、員工關係 | HR 專案 |
| `legal-advisor` | opus | 隱私政策、服務條款、法律文件 | 法律文件 |

---

## anthropics/skills - 官方 Skills

### 可用 Skills

| Skill | 用途 | 說明 |
| ----- | ---- | ---- |
| `webapp-testing` | E2E 測試 | Playwright 網頁應用測試工具包 |
| `pdf` | 文件生成 | PDF 文件處理和生成 |
| `xlsx` | 資料匯出 | Excel 試算表處理 |
| `docx` | 文件編輯 | Word 文件建立和編輯 |
| `pptx` | 簡報製作 | PowerPoint 簡報建立 |
| `doc-coauthoring` | 文件協作 | 結構化文件協作功能 |
| `mcp-builder` | MCP 開發 | Model Context Protocol 建構工具 |
| `frontend-design` | 前端設計 | 前端 UI/UX 設計技能 |
| `brand-guidelines` | 品牌設計 | 品牌識別和設計指南 |
| `canvas-design` | 畫布設計 | Canvas-based 設計能力 |
| `algorithmic-art` | 演算藝術 | 演算法藝術生成 |
| `theme-factory` | 主題建立 | 主題建立和客製化 |
| `internal-comms` | 內部溝通 | 內部通訊工具 |
| `skill-creator` | Skill 開發 | 建立新 Skills 的工具 |
| `slack-gif-creator` | Slack GIF | Slack GIF 生成 |
| `web-artifacts-builder` | Web 元件 | Web 元件建立工具 |

### webapp-testing 詳細說明

基於 Python Playwright 的網頁應用測試工具包：

**核心功能**：

- 自動化瀏覽器互動
- UI 驗證
- 截圖捕獲
- 瀏覽器日誌審查

**輔助腳本**：

- `scripts/with_server.py` - 管理伺服器生命週期，支援單一或多個並行伺服器

**最佳實踐**：

- 動態應用需等待 `page.wait_for_load_state('networkidle')`
- 先偵察再行動：導航 → 等待穩定 → 截圖 → 識別選擇器 → 執行動作
- 使用同步 Playwright 模式

---

## 安裝指南

### 安裝 wshobson/agents

```bash
# 方法 1：複製單一 Agent
mkdir -p .claude/agents/reference

# 從 plugins 目錄下載
# 結構：plugins/<category>/agents/<agent-name>.md
curl -o .claude/agents/reference/golang-pro.md \
  "https://raw.githubusercontent.com/wshobson/agents/main/plugins/golang-development/agents/golang-pro.md"

# 方法 2：Clone 整個 repo 選擇需要的
git clone --depth 1 https://github.com/wshobson/agents.git /tmp/agents

# 複製需要的 plugins
cp -r /tmp/agents/plugins/golang-development/agents/* .claude/agents/reference/
cp -r /tmp/agents/plugins/testing-quality/agents/* .claude/agents/reviewers/
```

### 安裝 anthropics/skills

```bash
# Clone skills repo
git clone --depth 1 https://github.com/anthropics/skills.git /tmp/skills

# 複製需要的 skills
mkdir -p .claude/skills
cp -r /tmp/skills/skills/webapp-testing .claude/skills/
cp -r /tmp/skills/skills/pdf .claude/skills/
cp -r /tmp/skills/skills/xlsx .claude/skills/

# 清理
rm -rf /tmp/skills
```

---

## 依專案類型推薦

### Web App (Full-Stack)

```yaml
recommended:
  agents:
    - frontend-developer
    - backend-architect
    - database-architect
    - test-automator
    - code-reviewer
    - security-auditor
  skills:
    - webapp-testing
    - xlsx
```

### 純後端服務

```yaml
recommended:
  agents:
    - backend-architect
    - database-architect
    - devops-troubleshooter
    - test-automator
    - code-reviewer
    - security-auditor
  skills:
    - pdf  # 報表生成
```

### 純前端應用

```yaml
recommended:
  agents:
    - frontend-developer
    - ui-designer
    - accessibility-expert
    - design-system-architect
    - test-automator
  skills:
    - webapp-testing
    - frontend-design
```

### 資料工程專案

```yaml
recommended:
  agents:
    - data-engineer
    - data-scientist
    - database-architect
    - python-pro
  skills:
    - xlsx
    - pdf
```

### DevOps / 基礎設施

```yaml
recommended:
  agents:
    - cloud-architect
    - kubernetes-architect
    - terraform-specialist
    - devops-troubleshooter
    - incident-responder
    - observability-engineer
```

### AI / LLM 專案

```yaml
recommended:
  agents:
    - ai-engineer
    - ml-engineer
    - prompt-engineer
    - python-pro
  skills:
    - mcp-builder
```

---

## 在 project.yaml 中設定

```yaml
# .claude/project.yaml
external_resources:
  # 來自 wshobson/agents
  agents:
    - source: "wshobson/agents"
      plugins:
        - golang-development
        - testing-quality
        - cloud-infrastructure
      agents:
        - golang-pro
        - test-automator
        - code-reviewer
        - cloud-architect

  # 來自 anthropics/skills
  skills:
    - source: "anthropics/skills"
      selected:
        - webapp-testing
        - xlsx
        - pdf
```

---

## 相關連結

- [wshobson/agents 完整文件](https://github.com/wshobson/agents/blob/main/docs/agents.md)
- [anthropics/skills 官方 repo](https://github.com/anthropics/skills)
- [Skill 規格說明](https://github.com/anthropics/skills/tree/main/spec)
- [建立自訂 Skill](https://github.com/anthropics/skills/tree/main/template)
