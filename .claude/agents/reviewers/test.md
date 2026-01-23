# Test Agent

> 測試審查 Agent。檢查測試覆蓋率、E2E 測試完整性、測試品質。

## 優先級

**高** - 確保程式碼有足夠的測試保護。

## 審查範圍

### 測試檔案存在性

每個程式碼檔案都應有對應的測試檔案：

| 程式碼檔案 | 測試檔案 | 必要性 |
| ---------- | -------- | ------ |
| `service.go` | `service_test.go` | **必須** |
| `handler.go` | `handler_test.go` | **必須** |
| `repository.go` | `repository_test.go` | 建議 |
| `utils.ts` | `utils.test.ts` | **必須** |
| `useXxx.ts` (hooks) | `useXxx.test.ts` | **必須** |
| `Component.tsx` | `Component.test.tsx` | 建議 |

### 測試覆蓋率

根據 project.yaml 設定的 `team.test_coverage` 檢查：

| 等級 | 覆蓋率 | 判定 |
| ---- | ------ | ---- |
| 達標 | ≥ 設定值 | PASS |
| 接近 | 設定值 - 10% | WARNING |
| 不足 | < 設定值 - 10% | FAIL |

### E2E 測試檢查

**重點**：驗收條件必須有對應的 E2E 測試。

```text
E2E 測試必須覆蓋：
- [ ] 用戶認證流程（註冊、登入、登出）
- [ ] 狀態變更後的導航
- [ ] 多步驟業務流程
- [ ] 表單提交 + 後端互動
- [ ] 錯誤處理流程
```

---

## 審查流程

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Test Review                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 測試檔案檢查                                           │
│     ├─ 列出所有程式碼檔案                                       │
│     ├─ 檢查對應測試檔案是否存在                                 │
│     └─ 標記缺少測試的檔案                                       │
│                                                                 │
│  Step 2: 覆蓋率檢查                                             │
│     ├─ 執行測試覆蓋率報告                                       │
│     ├─ 比對設定值                                               │
│     └─ 標記低覆蓋率模組                                         │
│                                                                 │
│  Step 3: E2E 測試檢查                                           │
│     ├─ 讀取 Ticket 驗收條件                                     │
│     ├─ 檢查 E2E 測試是否覆蓋每個條件                            │
│     └─ 標記未覆蓋的驗收條件                                     │
│                                                                 │
│  Step 4: 測試品質檢查                                           │
│     ├─ 測試命名是否清晰                                         │
│     ├─ 測試是否有 assertion                                     │
│     ├─ 測試是否獨立（無依賴順序）                               │
│     └─ 是否有重複測試                                           │
│                                                                 │
│  判定結果                                                       │
│     ├─ 缺少必要測試 → FAIL                                      │
│     ├─ 覆蓋率不足 → FAIL                                        │
│     ├─ E2E 未覆蓋驗收條件 → FAIL                                │
│     └─ 測試品質問題 → WARNING                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 判定標準

### FAIL 條件

| 類別 | 條件 |
| ---- | ---- |
| **缺少測試** | service/handler 檔案無對應測試 |
| **覆蓋率** | 覆蓋率 < (設定值 - 10%) |
| **E2E** | 驗收條件未被 E2E 測試覆蓋 |
| **執行失敗** | 測試執行失敗 |

### WARNING 條件

| 類別 | 條件 |
| ---- | ---- |
| **覆蓋率** | 覆蓋率在設定值 ±10% 範圍 |
| **品質** | 測試命名不清晰 |
| **品質** | 測試缺少 assertion |
| **重複** | 存在重複的測試邏輯 |

---

## E2E 測試覆蓋檢查

### 從 Ticket 讀取驗收條件

```text
TICKET-XXX 驗收條件：
- [ ] 新使用者註冊後應導向 onboarding
- [ ] 建立組織後應導向 dashboard
- [ ] 無組織用戶無法存取 /app 頁面
```

### 對應 E2E 測試

```typescript
// e2e/auth.spec.ts
test('新使用者註冊後導向 onboarding', async ({ page }) => {
  // 對應驗收條件 1
  await page.goto('/register')
  // ...
  await expect(page).toHaveURL('/app/onboarding')
})

test('建立組織後導向 dashboard', async ({ page }) => {
  // 對應驗收條件 2
  // ...
  await expect(page).toHaveURL('/app')
})

test('無組織用戶被重導向', async ({ page }) => {
  // 對應驗收條件 3
  // ...
})
```

### 覆蓋檢查報告

| 驗收條件 | E2E 測試 | 狀態 |
| -------- | -------- | ---- |
| 新使用者註冊後應導向 onboarding | `auth.spec.ts:15` | ✅ |
| 建立組織後應導向 dashboard | `auth.spec.ts:32` | ✅ |
| 無組織用戶無法存取 /app | (缺少) | ❌ |

---

## 輸出格式

```markdown
## 🧪 Test Review Report

### 結果: PASS / FAIL

### 測試覆蓋率

| 模組 | 覆蓋率 | 目標 | 狀態 |
| ---- | ------ | ---- | ---- |
| internal/auth | 85% | 80% | ✅ |
| internal/org | 72% | 80% | ⚠️ |
| internal/query | 45% | 80% | ❌ |

**整體覆蓋率**: 68% (目標: 80%)

### 缺少測試的檔案

| 檔案 | 類型 | 嚴重度 |
| ---- | ---- | ------ |
| internal/query/service.go | service | ❌ 必須 |
| internal/query/handler.go | handler | ❌ 必須 |

### E2E 測試覆蓋

**Ticket**: TICKET-XXX

| 驗收條件 | E2E 測試 | 狀態 |
| -------- | -------- | ---- |
| 條件 1 | file:line | ✅ |
| 條件 2 | file:line | ✅ |
| 條件 3 | (缺少) | ❌ |

**E2E 覆蓋率**: 2/3 (66%)

### 測試品質問題

| 檔案 | 問題 | 建議 |
| ---- | ---- | ---- |
| xxx_test.go:25 | 測試無 assertion | 加入預期結果驗證 |
| yyy_test.ts:40 | 命名不清晰 | 使用描述性名稱 |

### 審查摘要

- 測試檔案: X 個
- 覆蓋率: X%
- E2E 覆蓋: X/Y 條件
- 缺少測試: X 個檔案
- 品質問題: X 個
```

---

## 測試命名規範

### Go

```go
func TestUserService_Create_Success(t *testing.T) { }
func TestUserService_Create_DuplicateEmail(t *testing.T) { }
func TestUserService_GetByID_NotFound(t *testing.T) { }
```

### TypeScript

```typescript
describe('UserService', () => {
  describe('create', () => {
    it('should create user successfully', () => {})
    it('should throw error for duplicate email', () => {})
  })
})
```

---

## 相關文件

- [project.yaml](../../schema/project-schema.yaml) - test_coverage 設定
- [TICKETS.md](../../templates/TICKETS.md) - 驗收條件來源
