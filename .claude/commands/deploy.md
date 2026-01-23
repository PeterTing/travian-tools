# Deploy Command

部署到指定環境。部署前會執行 Deploy Review 確保安全性和可回滾性。

## Usage

```bash
/project:deploy <environment>
```

## Environments

- `dev` - 開發環境
- `staging` - 測試環境
- `prod` - 正式環境

## 參考 Agents

### Expert Agents（規範參考）

| Agent | 檔案位置 | 用途 |
| ----- | -------- | ---- |
| **CI/CD Expert** | `.claude/agents/experts/cicd.md` | GitHub Actions Workflow、Cloud Run 部署流程 |
| **Terraform Expert** | `.claude/agents/experts/terraform.md` | 基礎建設部署（如需更新 IaC） |

### Reviewer Agents（部署審查）

| Agent | 檔案位置 | 優先級 | 審查項目 |
| ----- | -------- | ------ | -------- |
| **Security Scanner** | `.claude/agents/reviewers/security-scanner.md` | critical | Secrets 曝露、IaC 安全、容器安全 |
| **Infra Validator** | `.claude/agents/reviewers/infra-validator.md` | critical | Terraform plan、破壞性變更、資源限制 |
| **Rollback Checker** | `.claude/agents/reviewers/rollback.md` | high | 回滾計畫、Health Check、監控告警 |

## Instructions

### 部署前檢查

1. **測試通過**
   ```bash
   go test -v -race ./...
   pnpm run test
   ```

2. **Lint 通過**
   ```bash
   golangci-lint run
   pnpm run lint
   ```

3. **Build 成功**
   ```bash
   docker build -t insighthub-backend ./backend
   docker build -t insighthub-frontend ./frontend
   ```

### 部署流程

#### 1. Build Images

```bash
# Backend
docker build -t asia-east1-docker.pkg.dev/artogo-v2/insighthub/backend:$SHA ./backend

# Frontend
docker build -t asia-east1-docker.pkg.dev/artogo-v2/insighthub/frontend:$SHA ./frontend
```

#### 2. Push to Artifact Registry

```bash
docker push asia-east1-docker.pkg.dev/artogo-v2/insighthub/backend:$SHA
docker push asia-east1-docker.pkg.dev/artogo-v2/insighthub/frontend:$SHA
```

#### 3. Deploy to Cloud Run

```bash
# Backend
gcloud run deploy insighthub-backend-$ENV \
  --image asia-east1-docker.pkg.dev/artogo-v2/insighthub/backend:$SHA \
  --region asia-east1 \
  --platform managed \
  --set-env-vars "ENV=$ENV"

# Frontend
gcloud run deploy insighthub-frontend-$ENV \
  --image asia-east1-docker.pkg.dev/artogo-v2/insighthub/frontend:$SHA \
  --region asia-east1 \
  --platform managed
```

#### 4. Verify Deployment

```bash
# Check service status
gcloud run services describe insighthub-backend-$ENV --region asia-east1

# Health check
curl https://insighthub-backend-$ENV-xxx.asia-east1.run.app/health
```

### Database Migrations

```bash
# 在部署前執行 migration
gcloud run jobs execute insighthub-migrate --region asia-east1
```

## Output Format

```markdown
## Deployment Report: <environment>

### Pre-deployment Checks
- [x] Tests passed
- [x] Lint passed
- [x] Build successful

### Deployment Steps
1. [x] Built images
2. [x] Pushed to registry
3. [x] Deployed backend
4. [x] Deployed frontend
5. [x] Health check passed

### Deployment Info
- Backend URL: <url>
- Frontend URL: <url>
- Commit: <sha>
- Time: <timestamp>

### Post-deployment Verification
- Health: OK
- Basic functionality: OK
```

## Example

```bash
/project:deploy staging
/project:deploy prod
```

---

## Deploy Review（部署前審查）

部署前會執行 Deploy Review，確保安全性和可回滾性。

### Deploy Review Agents（並行）

使用 Task tool **單一訊息**同時啟動 3 個 Reviewer Agents：

| Agent | 優先級 | 審查項目 |
| ----- | ------ | -------- |
| 🔐 Security Scanner | critical | Secrets 曝露、IaC 安全掃描、容器安全 |
| 🏗️ Infra Validator | critical | Terraform plan、破壞性變更、資源限制 |
| 🔄 Rollback Checker | high | 回滾計畫、Health Check、監控告警 |

### Deploy Review 流程

```text
部署指令
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  Deploy Review（並行審查，不執行回饋迴圈）            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│  │ Security    │ │ Infra       │ │ Rollback    │    │
│  │ Scanner     │ │ Validator   │ │ Checker     │    │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘    │
│         └───────────────┼───────────────┘           │
│                         ▼                            │
│                  Consensus Check                     │
│                         │                            │
│         ┌───────────────┼───────────────┐           │
│         ▼               ▼               ▼           │
│     APPROVED      NEEDS_CHANGES      BLOCKED        │
│     → 執行部署    → 停止並修復       → 立即停止    │
└──────────────────────────────────────────────────────┘
```

### Consensus 規則（嚴格模式）

```text
1. 任何 critical Agent (Security Scanner, Infra Validator) 為 BLOCKED → 整體 BLOCKED
2. 任何 Agent 為 NEEDS_CHANGES → 整體 NEEDS_CHANGES → 停止部署
3. 全部 APPROVED → 整體 APPROVED → 可執行部署
4. Deploy Review 不執行回饋迴圈 - 必須全部通過才能部署
```

### Deploy Review 輸出

```markdown
## Deploy Review Report

**環境**: staging
**Commit**: abc1234

| Agent | 狀態 | 問題數 |
| ----- | ---- | ------ |
| Security Scanner | ✅ APPROVED | 0 |
| Infra Validator | ✅ APPROVED | 0 |
| Rollback Checker | ⚠️ NEEDS_CHANGES | 1 |

### Findings

1. [Rollback/major] 缺少 availability 告警設定

### 整體結果: ⚠️ NEEDS_CHANGES

### 必須修復後才能部署
1. 在 Cloud Monitoring 設定 availability < 99.9% 告警
```

### 生產環境額外檢查

對於 `prod` 環境，額外執行：

- [ ] 確認 staging 部署已通過
- [ ] 確認所有 E2E 測試通過
- [ ] 確認回滾指令已準備
- [ ] 確認監控告警已設定
- [ ] 確認 on-call 人員已通知

---

## 相關檔案

- `terraform/` - Terraform 配置
- `.github/workflows/` - CI/CD 配置
- `.claude/agents/experts/cicd.md` - CI/CD 規範
- `.claude/agents/experts/terraform.md` - Terraform 規範
- `.claude/agents/reviewers/security-scanner.md`
- `.claude/agents/reviewers/infra-validator.md`
- `.claude/agents/reviewers/rollback.md`
- `.claude/patterns/multi-agent-review.md` - Review Pattern 規範
