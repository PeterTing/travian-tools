# Clean Architecture

> Clean Architecture 規範共用模板，供 CLAUDE.md 和 backend.md 引用

---

## 架構圖

```text
┌─────────────────────────────────────────────────────────────┐
│                    External (外層)                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                 Interface Adapters                     │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │              Application (Use Cases)             │  │ │
│  │  │  ┌─────────────────────────────────────────┐    │  │ │
│  │  │  │         Domain (Entities)               │    │  │ │
│  │  │  └─────────────────────────────────────────┘    │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 依賴規則

**內層不可依賴外層，依賴方向永遠向內。**

| 層級 | 職責 | 可依賴 | 禁止依賴 |
| ---- | ---- | ------ | -------- |
| Domain | 實體、商業規則 | 無 | Application, Interface, External |
| Application | Use Cases、Service | Domain | Interface, External |
| Interface | Handler、Repository 介面 | Application、Domain | External 實作細節 |
| External | DB、HTTP、外部服務 | Interface | 違反依賴方向 |

---

## Backend 結構對應

```text
backend/internal/<feature>/
├── domain.go          # Domain Layer: 實體、商業規則
├── service.go         # Application Layer: Use Cases
├── service_test.go    # Service 測試 ← 必須存在
├── repository.go      # Interface: Repository 介面定義
├── repository_gorm.go # External: GORM 實作
├── handler.go         # Interface: HTTP Handler
└── handler_test.go    # Handler 測試 ← 必須存在
```

---

## 關鍵原則

### 1. 依賴注入

透過 interface 注入依賴，不直接依賴實作。

```go
// ✅ 正確：Service 依賴 interface
type UserService struct {
    repo UserRepository  // interface
}

// ❌ 錯誤：Service 直接依賴實作
type UserService struct {
    db *sql.DB  // 直接依賴外部
}
```

### 2. Repository Pattern

資料存取透過 interface 抽象。

```go
// Repository 介面（repository.go）
type UserRepository interface {
    GetByEmail(ctx context.Context, email string) (*User, error)
    GetByID(ctx context.Context, id uuid.UUID) (*User, error)
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
}

var ErrUserNotFound = errors.New("user not found")
```

### 3. Service 不知道 HTTP

Service 層不應知道 gin.Context。

```go
// ✅ 正確：Service 接受標準 context
func (s *UserService) Register(ctx context.Context, email, password string) (*User, error) {
    // 商業邏輯
}

// ❌ 錯誤：Service 直接依賴 gin.Context
func (s *UserService) Register(c *gin.Context) {
    // 違反 Clean Architecture
}
```

### 4. Domain 純粹

Domain 只有商業邏輯，無外部依賴。

```go
// Domain Model（domain.go）
type User struct {
    ID             uuid.UUID
    OrganizationID uuid.UUID
    Email          string
    PasswordHash   string
    CreatedAt      time.Time
    UpdatedAt      time.Time
}

// Domain 方法（商業規則）
func (u *User) VerifyPassword(password string) bool {
    // 純粹的業務邏輯
}
```

---

## GORM 與 Domain 分離

→ 詳細範例參考 [gorm-patterns.md](./gorm-patterns.md)

### Model 分離原則

- **GORM Model** 定義在 `pkg/database/gorm.go`
- **Domain Model** 定義在 `internal/<feature>/domain.go`
- 使用 **Mapper 函數**（`toDomainUser()`, `toDBUser()`）進行轉換

---

## 錯誤處理規範

```go
// 使用 fmt.Errorf 包裝錯誤
if err != nil {
    return fmt.Errorf("create user failed: %w", err)
}

// Domain 錯誤定義
var (
    ErrUserNotFound     = errors.New("user not found")
    ErrDuplicateEmail   = errors.New("email already exists")
    ErrInvalidPassword  = errors.New("invalid password")
)
```

---

## 使用方式

在其他文件中引用：

```markdown
## Clean Architecture

→ 參考 [clean-architecture.md](../.claude/templates/clean-architecture.md)

## 依賴規則

→ 參考 [clean-architecture.md](../.claude/templates/clean-architecture.md#依賴規則)
```
