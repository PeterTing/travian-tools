# Test Command

執行測試並報告結果。

## Usage

```
/project:test [scope]
```

## 參考 Agents

執行測試時可參考以下 Agents：

| Agent | 檔案位置 | 用途 |
|-------|---------|------|
| **Test Agent** | `.claude/agents/reviewers/test.md` | 測試覆蓋率檢查、測試檔案結構驗證 |
| **Backend Expert** | `.claude/agents/experts/backend.md` | Go 測試規範（TDD、測試結構）|
| **Frontend Expert** | `.claude/agents/experts/frontend.md` | TypeScript 測試規範（Jest、React Testing Library）|

## Scopes

- `all` - 執行所有測試 (預設，包含 E2E)
- `backend` - 只執行後端測試
- `frontend` - 只執行前端單元測試
- `e2e` - 只執行前端 E2E 測試
- `unit` - 只執行單元測試
- `integration` - 只執行整合測試
- `<path>` - 執行特定路徑的測試

## Instructions

### Backend Tests (Go)

```bash
# All tests
cd backend && go test -v -race ./...

# With coverage
go test -v -race -coverprofile=coverage.out ./...
go tool cover -func=coverage.out

# Specific package
go test -v ./internal/auth/...

# Specific test
go test -v ./internal/auth/... -run TestUserService_Create
```

### Frontend Unit Tests (Vitest)

```bash
# All unit tests
cd frontend && pnpm run test

# With coverage
pnpm run test:coverage

# Watch mode
pnpm run test:watch

# Specific file
pnpm run test -- src/components/QueryInput.test.tsx
```

### Frontend E2E Tests (Playwright)

```bash
# All E2E tests
cd frontend && pnpm run test:e2e

# UI mode (推薦開發時使用)
pnpm run test:e2e:ui

# Debug mode
pnpm run test:e2e:debug

# Specific test file
npx playwright test e2e/auth.spec.ts

# Specific test case
npx playwright test -g "應該能成功註冊新使用者"
```

## Output Format

```markdown
## 測試報告

### Backend Tests
- Total: X tests
- Passed: X
- Failed: X
- Coverage: X%

[詳細失敗資訊（如果有）]

### Frontend Unit Tests
- Total: X tests
- Passed: X
- Failed: X
- Coverage: X%

[詳細失敗資訊（如果有）]

### Frontend E2E Tests
- Total: X tests
- Passed: X
- Failed: X
- Duration: Xs

[詳細失敗資訊（如果有）]

### Summary
[綜合評估和建議]
```

## Example

```
/project:test all          # 執行所有測試（包含 E2E）
/project:test backend      # 只執行 Backend 測試
/project:test frontend     # 只執行 Frontend 單元測試
/project:test e2e          # 只執行 E2E 測試
/project:test ./internal/auth/...  # 特定路徑
```
