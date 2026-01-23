# GORM Patterns

> GORM 使用模式共用模板，供 CLAUDE.md、backend.md、clean-architecture.md 引用

---

## 核心原則：Domain 與 GORM Model 分離

**GORM Model** 與 **Domain Model** 必須分開定義，透過 Mapper 函數轉換。

| 層級 | 位置 | 職責 |
| ---- | ---- | ---- |
| GORM Model | `pkg/database/gorm.go` | 資料庫映射、GORM tags |
| Domain Model | `internal/<feature>/domain.go` | 業務邏輯、無外部依賴 |
| Mapper | `internal/<feature>/repository_gorm.go` | 轉換函數 |

---

## GORM Model 定義

**位置**：`backend/pkg/database/gorm.go`

```go
package database

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

// User GORM Model - 資料庫映射
type User struct {
    ID             uuid.UUID `gorm:"type:uuid;primaryKey"`
    OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
    Email          string    `gorm:"size:255;not null;uniqueIndex"`
    PasswordHash   string    `gorm:"size:255;not null"`
    CreatedAt      time.Time
    UpdatedAt      time.Time
    DeletedAt      gorm.DeletedAt `gorm:"index"`
}

func (User) TableName() string {
    return "users"
}
```

**GORM Tag 常用設定**：

| Tag | 說明 | 範例 |
| --- | ---- | ---- |
| `type:uuid` | UUID 類型 | `gorm:"type:uuid"` |
| `primaryKey` | 主鍵 | `gorm:"primaryKey"` |
| `not null` | 非空約束 | `gorm:"not null"` |
| `uniqueIndex` | 唯一索引 | `gorm:"uniqueIndex"` |
| `index` | 一般索引 | `gorm:"index"` |
| `size:255` | 欄位長度 | `gorm:"size:255"` |

---

## Domain Model 定義

**位置**：`backend/internal/<feature>/domain.go`

```go
package auth

import (
    "time"

    "github.com/google/uuid"
)

// User Domain Model - 純業務邏輯，無 GORM 依賴
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
    // 純粹的業務邏輯，不依賴外部套件
    return checkPassword(u.PasswordHash, password)
}

func (u *User) HasOrganization() bool {
    return u.OrganizationID != uuid.Nil
}
```

---

## Mapper 函數

**位置**：`backend/internal/<feature>/repository_gorm.go`

```go
package auth

import (
    "insighthub/backend/pkg/database"
)

// toDomainUser 將 GORM Model 轉換為 Domain Model
func toDomainUser(dbUser *database.User) *User {
    if dbUser == nil {
        return nil
    }
    return &User{
        ID:             dbUser.ID,
        OrganizationID: dbUser.OrganizationID,
        Email:          dbUser.Email,
        PasswordHash:   dbUser.PasswordHash,
        CreatedAt:      dbUser.CreatedAt,
        UpdatedAt:      dbUser.UpdatedAt,
    }
}

// toDBUser 將 Domain Model 轉換為 GORM Model
func toDBUser(domainUser *User) *database.User {
    if domainUser == nil {
        return nil
    }
    return &database.User{
        ID:             domainUser.ID,
        OrganizationID: domainUser.OrganizationID,
        Email:          domainUser.Email,
        PasswordHash:   domainUser.PasswordHash,
    }
}

// toDomainUsers 批量轉換
func toDomainUsers(dbUsers []database.User) []*User {
    users := make([]*User, len(dbUsers))
    for i, dbUser := range dbUsers {
        users[i] = toDomainUser(&dbUser)
    }
    return users
}
```

---

## Repository Pattern（GORM 實作）

### Repository 介面

**位置**：`backend/internal/<feature>/repository.go`

```go
package auth

import (
    "context"
    "errors"

    "github.com/google/uuid"
)

// UserRepository 定義資料存取介面（Domain 層）
type UserRepository interface {
    GetByEmail(ctx context.Context, email string) (*User, error)
    GetByID(ctx context.Context, id uuid.UUID) (*User, error)
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id uuid.UUID) error
}

// Domain 錯誤定義
var (
    ErrUserNotFound   = errors.New("user not found")
    ErrDuplicateEmail = errors.New("email already exists")
)
```

### GORM 實作

**位置**：`backend/internal/<feature>/repository_gorm.go`

```go
package auth

import (
    "context"
    "errors"
    "fmt"

    "github.com/google/uuid"
    "gorm.io/gorm"

    "insighthub/backend/pkg/database"
)

// GORMUserRepository GORM 實作
type GORMUserRepository struct {
    db *gorm.DB
}

// NewGORMUserRepository 建構子
func NewGORMUserRepository(db *gorm.DB) UserRepository {
    return &GORMUserRepository{db: db}
}

func (r *GORMUserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
    var dbUser database.User
    if err := r.db.WithContext(ctx).First(&dbUser, "email = ?", email).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("get user by email failed: %w", err)
    }
    return toDomainUser(&dbUser), nil
}

func (r *GORMUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*User, error) {
    var dbUser database.User
    if err := r.db.WithContext(ctx).First(&dbUser, "id = ?", id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("get user by id failed: %w", err)
    }
    return toDomainUser(&dbUser), nil
}

func (r *GORMUserRepository) Create(ctx context.Context, user *User) error {
    dbUser := toDBUser(user)
    if err := r.db.WithContext(ctx).Create(dbUser).Error; err != nil {
        return fmt.Errorf("create user failed: %w", err)
    }
    // 回填自動生成的欄位
    user.ID = dbUser.ID
    user.CreatedAt = dbUser.CreatedAt
    user.UpdatedAt = dbUser.UpdatedAt
    return nil
}

func (r *GORMUserRepository) Update(ctx context.Context, user *User) error {
    dbUser := toDBUser(user)
    if err := r.db.WithContext(ctx).Save(dbUser).Error; err != nil {
        return fmt.Errorf("update user failed: %w", err)
    }
    user.UpdatedAt = dbUser.UpdatedAt
    return nil
}

func (r *GORMUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
    if err := r.db.WithContext(ctx).Delete(&database.User{}, "id = ?", id).Error; err != nil {
        return fmt.Errorf("delete user failed: %w", err)
    }
    return nil
}
```

---

## 常見查詢模式

### 條件查詢

```go
func (r *GORMUserRepository) FindByOrganization(ctx context.Context, orgID uuid.UUID) ([]*User, error) {
    var dbUsers []database.User
    if err := r.db.WithContext(ctx).
        Where("organization_id = ?", orgID).
        Order("created_at DESC").
        Find(&dbUsers).Error; err != nil {
        return nil, fmt.Errorf("find users by organization failed: %w", err)
    }
    return toDomainUsers(dbUsers), nil
}
```

### 分頁查詢

```go
func (r *GORMUserRepository) FindWithPagination(ctx context.Context, page, pageSize int) ([]*User, int64, error) {
    var dbUsers []database.User
    var total int64

    // 計算總數
    if err := r.db.WithContext(ctx).Model(&database.User{}).Count(&total).Error; err != nil {
        return nil, 0, fmt.Errorf("count users failed: %w", err)
    }

    // 分頁查詢
    offset := (page - 1) * pageSize
    if err := r.db.WithContext(ctx).
        Offset(offset).
        Limit(pageSize).
        Find(&dbUsers).Error; err != nil {
        return nil, 0, fmt.Errorf("find users with pagination failed: %w", err)
    }

    return toDomainUsers(dbUsers), total, nil
}
```

### 關聯查詢（Preload）

```go
func (r *GORMUserRepository) GetWithOrganization(ctx context.Context, id uuid.UUID) (*User, error) {
    var dbUser database.User
    if err := r.db.WithContext(ctx).
        Preload("Organization").
        First(&dbUser, "id = ?", id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("get user with organization failed: %w", err)
    }
    return toDomainUser(&dbUser), nil
}
```

### Transaction

```go
func (r *GORMUserRepository) CreateWithProfile(ctx context.Context, user *User, profile *Profile) error {
    return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        dbUser := toDBUser(user)
        if err := tx.Create(dbUser).Error; err != nil {
            return fmt.Errorf("create user failed: %w", err)
        }

        dbProfile := toDBProfile(profile)
        dbProfile.UserID = dbUser.ID
        if err := tx.Create(dbProfile).Error; err != nil {
            return fmt.Errorf("create profile failed: %w", err)
        }

        user.ID = dbUser.ID
        return nil
    })
}
```

---

## AutoMigrate 設定

**位置**：`backend/pkg/database/migrate.go`

```go
package database

import (
    "gorm.io/gorm"
)

// AutoMigrate 自動遷移所有 Model（僅限開發環境）
func AutoMigrate(db *gorm.DB) error {
    return db.AutoMigrate(
        &User{},
        &Organization{},
        &Connection{},
        // 新增其他 Model...
    )
}
```

**使用時機**：

| 環境 | AutoMigrate | 說明 |
| ---- | ----------- | ---- |
| 開發 | ✅ 自動執行 | 快速迭代 |
| 測試 | ✅ 自動執行 | 確保 Schema 一致 |
| 生產 | ❌ 禁止 | 使用手動 Migration |

---

## 使用方式

在其他文件中引用：

```markdown
## GORM 使用規範

→ 參考 [gorm-patterns.md](../.claude/templates/gorm-patterns.md)

## Repository Pattern

→ 參考 [gorm-patterns.md](../.claude/templates/gorm-patterns.md#repository-patterngorm-實作)
```
