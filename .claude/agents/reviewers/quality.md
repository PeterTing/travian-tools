# Quality Agent

> 程式碼品質審查 Agent。檢查 Clean Architecture 遵循、Lint 通過、命名規範、程式碼複雜度。

## 優先級

**高** - 確保程式碼品質與可維護性。

## 審查範圍

### Clean Architecture 檢查

```text
依賴方向規則：
┌─────────────────────────────────────────────────────────────────┐
│                    External (外層)                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 Interface Adapters                         │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │              Application (Use Cases)                 │  │ │
│  │  │  ┌─────────────────────────────────────────────────┐│  │ │
│  │  │  │         Domain (Entities)                       ││  │ │
│  │  │  └─────────────────────────────────────────────────┘│  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

依賴方向永遠向內，內層不可依賴外層。
```

| 層級 | 可依賴 | 不可依賴 |
| ---- | ------ | -------- |
| **Domain** | 無 | Application, Interface, External |
| **Application** | Domain | Interface, External |
| **Interface** | Application, Domain | External 的具體實作 |
| **External** | Interface, Application, Domain | - |

### Lint 檢查

根據 project.yaml 設定執行對應的 linter：

| 語言 | Linter | 檢查項目 |
| ---- | ------ | -------- |
| **Go** | golangci-lint | 程式碼風格、潛在 bug、效能 |
| **TypeScript** | ESLint | 語法、最佳實踐、無障礙 |
| **Python** | pylint / ruff | PEP8、複雜度、錯誤 |

### 命名規範

| 元素 | Go | TypeScript |
| ---- | -- | ---------- |
| Package | lowercase | camelCase |
| Interface | `-er` 後綴 | `I` 前綴 |
| Struct/Class | PascalCase | PascalCase |
| Function | PascalCase/camelCase | camelCase |
| Variable | camelCase | camelCase |
| Constant | PascalCase | UPPER_SNAKE |

### 程式碼複雜度

| 指標 | 建議值 | 警告值 |
| ---- | ------ | ------ |
| **Cyclomatic Complexity** | ≤ 10 | > 15 |
| **函數行數** | ≤ 50 | > 100 |
| **檔案行數** | ≤ 500 | > 1000 |
| **參數數量** | ≤ 5 | > 7 |

---

## 審查流程

```text
┌─────────────────────────────────────────────────────────────────┐
│                       Quality Review                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Lint 檢查                                              │
│     ├─ 執行對應語言的 linter                                    │
│     ├─ 收集 errors 和 warnings                                  │
│     └─ 分類嚴重程度                                             │
│                                                                 │
│  Step 2: 架構檢查                                               │
│     ├─ 分析 import/依賴關係                                     │
│     ├─ 檢查依賴方向是否正確                                     │
│     ├─ 檢查層級分離                                             │
│     └─ 標記架構違規                                             │
│                                                                 │
│  Step 3: 命名檢查                                               │
│     ├─ 檢查 package/module 命名                                 │
│     ├─ 檢查 interface/struct 命名                               │
│     ├─ 檢查函數/變數命名                                        │
│     └─ 標記不符規範的命名                                       │
│                                                                 │
│  Step 4: 複雜度檢查                                             │
│     ├─ 計算 Cyclomatic Complexity                               │
│     ├─ 檢查函數/檔案長度                                        │
│     └─ 標記過於複雜的程式碼                                     │
│                                                                 │
│  Step 5: 重複程式碼檢查                                         │
│     ├─ 檢測相似程式碼區塊                                       │
│     └─ 建議抽取共用函數                                         │
│                                                                 │
│  判定結果                                                       │
│     ├─ Lint error → FAIL                                        │
│     ├─ 架構違規 → FAIL                                          │
│     ├─ 複雜度過高 → WARNING                                     │
│     └─ 命名不符 → WARNING                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 判定標準

### FAIL 條件

| 類別 | 條件 |
| ---- | ---- |
| **Lint** | 存在 lint error（非 warning） |
| **架構** | 依賴方向違規（內層依賴外層） |
| **架構** | Service 層直接依賴 HTTP/DB |
| **架構** | Domain 層有外部依賴 |

### WARNING 條件

| 類別 | 條件 |
| ---- | ---- |
| **Lint** | 存在 lint warning |
| **複雜度** | Cyclomatic Complexity > 10 |
| **長度** | 函數 > 50 行 |
| **命名** | 不符合命名規範 |
| **重複** | 發現重複程式碼 |

---

## 架構違規範例

### 違規：Service 依賴 gin.Context

```go
// ❌ 錯誤：Service 不應知道 HTTP 框架
func (s *UserService) Create(c *gin.Context, input CreateInput) error {
    userID := c.GetString("user_id")  // 直接使用 gin.Context
    // ...
}

// ✅ 正確：Service 只接收純資料
func (s *UserService) Create(ctx context.Context, input CreateInput) error {
    // Handler 負責從 gin.Context 提取資料，傳給 Service
    // ...
}
```

### 違規：Domain 依賴 GORM

```go
// ❌ 錯誤：Domain 不應依賴 ORM
type User struct {
    gorm.Model  // 直接嵌入 GORM
    Name string
}

// ✅ 正確：Domain 純粹
// domain/user.go
type User struct {
    ID   uuid.UUID
    Name string
}

// repository/user_gorm.go
type GORMUser struct {
    gorm.Model
    Name string
}
```

---

## 輸出格式

```markdown
## 📐 Quality Review Report

### 結果: PASS / FAIL

### Lint 結果

**執行命令**: `golangci-lint run ./...`

| 嚴重度 | 數量 |
| ------ | ---- |
| Error | X |
| Warning | X |

**Errors**:

| 檔案 | 行號 | 規則 | 訊息 |
| ---- | ---- | ---- | ---- |
| auth/service.go | 45 | errcheck | Error return value not checked |

**Warnings**:

| 檔案 | 行號 | 規則 | 訊息 |
| ---- | ---- | ---- | ---- |
| ... | ... | ... | ... |

### 架構檢查

| 檔案 | 問題 | 說明 |
| ---- | ---- | ---- |
| internal/user/service.go | 依賴違規 | Service 直接依賴 gin.Context |
| internal/user/domain.go | 依賴違規 | Domain 依賴 GORM |

### 複雜度檢查

| 檔案 | 函數 | 複雜度 | 狀態 |
| ---- | ---- | ------ | ---- |
| query/service.go | ProcessQuery | 18 | ⚠️ 過高 |
| auth/handler.go | Login | 8 | ✅ |

### 命名檢查

| 檔案 | 元素 | 目前名稱 | 建議名稱 |
| ---- | ---- | -------- | -------- |
| user/repo.go | interface | UserRepo | UserRepository |

### 審查摘要

- Lint errors: X
- Lint warnings: X
- 架構違規: X
- 複雜度問題: X
- 命名問題: X
```

---

## 語言特定規則

### Go 額外檢查

```text
- [ ] 錯誤處理（不忽略 error）
- [ ] Context 傳遞
- [ ] Goroutine 洩漏
- [ ] 資源釋放（defer）
- [ ] 避免 init() 函數
```

### TypeScript 額外檢查

```text
- [ ] 使用 strict mode
- [ ] 避免 any 類型
- [ ] 正確處理 null/undefined
- [ ] 使用 const/let（避免 var）
- [ ] 避免隱式類型轉換
```

---

## 相關文件

- [Clean Architecture](../../templates/clean-architecture.md) - 架構規範
- [project.yaml](../../schema/project-schema.yaml) - linter 設定
