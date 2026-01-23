# Debug Command

除錯問題並找出根本原因。

## Usage

```
/project:debug <problem description>
```

## 參考 Agents

在執行除錯時，可參考以下專家 Agents 的知識：

| Agent | 檔案位置 | 用途 |
|-------|---------|------|
| **DevOps Troubleshooter** | `.claude/agents/workers/devops-troubleshooter.md` | Cloud Run 除錯、Kubernetes 除錯、系統可靠性 |
| **CI/CD Expert** | `.claude/agents/experts/cicd.md` | GitHub Actions 除錯、部署問題排查 |

## Instructions

### 除錯流程

1. **收集資訊**
   - 錯誤訊息
   - Stack trace
   - 相關 logs
   - 重現步驟

2. **縮小範圍**
   - 確認問題發生的位置
   - 找出相關程式碼

3. **假設與驗證**
   - 提出可能的原因
   - 逐一驗證排除

4. **修復與驗證**
   - 撰寫測試重現問題
   - 修復問題
   - 確認測試通過

### 除錯工具

#### Go Backend

```bash
# 執行特定測試並顯示詳細輸出
go test -v -run TestXxx ./... 2>&1

# 使用 delve debugger
dlv debug ./cmd/server/main.go

# 檢查 race condition
go test -race ./...

# Profile CPU
go test -cpuprofile=cpu.out -run TestXxx ./...
go tool pprof cpu.out
```

#### Frontend

```bash
# 執行特定測試
pnpm run test -- --testNamePattern="TestName" --verbose

# Debug in browser
# 加入 debugger; 語句，然後在瀏覽器開發者工具中除錯
```

#### Logs

```bash
# 查看 Cloud Run logs
gcloud logs read --service=insighthub-backend --limit=100

# 查看 local logs
docker-compose logs -f backend
```

### 常見問題檢查

- [ ] 環境變數是否正確設定？
- [ ] 資料庫連線是否正常？
- [ ] API 請求/回應格式是否正確？
- [ ] 權限是否足夠？
- [ ] 是否有 race condition？
- [ ] 記憶體是否洩漏？

## Output Format

```markdown
## Debug Report: <problem>

### 問題描述
<detailed problem description>

### 錯誤資訊
```
[error message / stack trace]
```

### 調查過程
1. [Investigation step 1]
   - 發現: <finding>
2. [Investigation step 2]
   - 發現: <finding>

### 根本原因
<root cause explanation>

### 解決方案
[code fix]

### 驗證
- 測試: [PASS/FAIL]
- 問題已解決: [YES/NO]

### 預防措施
- <suggestion to prevent similar issues>
```

## Example

```
/project:debug 查詢執行後沒有回傳結果
/project:debug JWT token 驗證失敗
```
