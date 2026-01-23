# Test Requirements

> 測試規範共用模板，供 CLAUDE.md 和各 Agent 引用

---

## E2E 測試強制規範（最重要）

**所有涉及用戶流程的功能，必須撰寫 E2E 測試覆蓋驗收條件。**

### 為什麼 E2E 測試是強制性的？

單元測試只能驗證單一模組的行為，無法發現**跨模組的整合問題**。例如：

- 前端使用 `organizations.length > 0` 判斷是否有組織
- 後端使用 `user.organizationId` 判斷是否有組織
- 這種不一致導致無限迴圈，**只有 E2E 測試才能發現**

### E2E 測試撰寫時機

| 功能類型 | 需要 E2E 測試 | 說明 |
|---------|-------------|------|
| 用戶認證流程 | **強制** | 註冊、登入、登出、OAuth |
| 狀態變更後的導航 | **強制** | 例：建立組織後導向 /app |
| 多步驟業務流程 | **強制** | 例：onboarding 完整流程 |
| 表單提交 + 後端互動 | **強制** | 確保前後端契約正確 |
| 純前端展示 | 建議 | 可用單元測試替代 |

### E2E 測試必須覆蓋的驗收條件

每個 Ticket 的驗收條件，**至少要有一個對應的 E2E 測試案例**：

```typescript
// 範例：TICKET-005 組織管理
// 驗收條件 1：新使用者必須先建立或加入組織才能進入主頁面

test('新使用者完整 onboarding 流程', async ({ page }) => {
  // 1. 註冊新使用者
  const email = `test-${Date.now()}@example.com`
  await page.goto('/register')
  // ... 填寫表單 ...

  // 2. 應該導向 onboarding（驗收條件：沒有組織的使用者被導向 onboarding）
  await page.waitForURL('/app/onboarding')

  // 3. 建立組織
  await page.fill('input[name="name"]', 'My Organization')
  await page.fill('input[name="slug"]', 'my-org')
  await page.click('button[type="submit"]')

  // 4. 應該導向 /app 且不會再跳回 onboarding（驗收條件：建立組織後可進入主頁面）
  await page.waitForURL('/app')

  // 5. 重新整理確認不會無限迴圈
  await page.reload()
  await expect(page).toHaveURL('/app')
})
```

### E2E 測試檔案位置

```text
frontend/e2e/
├── auth.spec.ts           # 認證流程（登入、註冊、OAuth）
├── onboarding.spec.ts     # Onboarding 流程
├── organization.spec.ts   # 組織管理
└── [feature].spec.ts      # 其他功能模組
```

### E2E 測試 FAIL 條件

1. **Ticket 驗收條件未被 E2E 測試覆蓋**（最重要）
   - 每個驗收條件至少要有一個對應的 E2E 測試案例
   - 缺少任何一個 = FAIL
2. E2E 測試執行失敗
3. **缺少完整流程驗證**：
   - 用戶流程必須從頭到尾測試（例：註冊 → onboarding → 建立組織 → 進入主頁）
   - 缺少「重新整理後狀態保持」的驗證
4. E2E 測試缺少關鍵檢查:
   - 缺少 `waitForLoadState('networkidle')`
   - 缺少 `waitForURL()` 導航驗證
   - 錯誤情境沒有驗證錯誤訊息

### 必須存在的 E2E 測試

| 功能模組 | 測試檔案 | 關鍵流程 | 狀態 |
|---------|---------|---------|------|
| Authentication | `e2e/auth.spec.ts` | 登入、登出、Token refresh | 必須 |
| Registration | `e2e/auth.spec.ts` | 使用者註冊流程 | 必須 |
| Onboarding | `e2e/onboarding.spec.ts` | 新使用者 onboarding 完整流程 | 必須 |
| Organization | `e2e/organization.spec.ts` | 組織建立、管理 | 必須 |
| Query (Phase 2) | `e2e/query.spec.ts` | 執行查詢、顯示結果 | Phase 2 |
| Dashboard (Phase 2) | `e2e/dashboard.spec.ts` | 儀表板載入、資料顯示 | Phase 2 |

---

## 單元測試檔案清單

### Backend (Go)

| 檔案類型 | 需要測試 | 測試檔案命名 |
|---------|---------|------------|
| `service.go` | **必須** | `service_test.go` |
| `handler.go` | **必須** | `handler_test.go` |
| `repository.go` | **必須** | `repository_test.go` |
| `domain.go` | 如有邏輯 | `domain_test.go` |
| `middleware.go` | **必須** | `middleware_test.go` |

### Frontend (TypeScript)

| 檔案類型 | 需要測試 | 說明 |
|---------|---------|------|
| `hooks/use*.ts` | **必須** | Custom hooks |
| `utils/*.ts` | **必須** | Utility functions |
| `stores/*.ts` | **必須** | State management |
| `components/*.tsx` | 建議 | 至少測試互動邏輯 |
| `app/**/page.tsx` | 可選 | Page components |

### 豁免清單

以下檔案類型可以不需要測試：

- `**/main.go` - 程式進入點
- `**/*_mock.go` - Mock 檔案
- `**/*.pb.go` - Protocol buffer 生成檔
- `**/types.ts` - 純型別定義
- `**/*.d.ts` - TypeScript 宣告檔
- `**/index.ts` - 純 re-export 檔案

---

## 測試覆蓋率要求

**目標**: > 80%

```bash
# Backend 覆蓋率
cd backend && go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total

# Frontend 覆蓋率
cd frontend && pnpm run test:coverage
```

---

## TDD 流程

```text
1. RED      → 先寫測試，確認測試失敗
2. GREEN    → 寫最少的程式碼讓測試通過
3. REFACTOR → 重構，保持測試通過
```

### 測試命名規範

```go
// Go: Test<Function>_<Scenario>
func TestUserService_Create_Success(t *testing.T) {}
func TestUserService_Create_DuplicateEmail(t *testing.T) {}
func TestUserService_Create_InvalidInput(t *testing.T) {}
```

```typescript
// TypeScript: describe + it
describe('useAuth', () => {
  it('should return user when authenticated', () => {});
  it('should return null when not authenticated', () => {});
});
```

### 測試涵蓋範圍

- [ ] Happy path (正常流程)
- [ ] Edge cases (邊界條件)
- [ ] Error handling (錯誤處理)
- [ ] Input validation (輸入驗證)

---

## 使用方式

在其他文件中引用：

```markdown
## E2E 測試規範

→ 參考 [test-requirements.md](../.claude/templates/test-requirements.md#e2e-測試強制規範最重要)

## 單元測試清單

→ 參考 [test-requirements.md](../.claude/templates/test-requirements.md#單元測試檔案清單)
```
