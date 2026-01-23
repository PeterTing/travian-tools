# Refactor Command

重構指定的程式碼以改善品質。

## Usage

```
/project:refactor <file or module path> [goal]
```

## 參考 Agents

重構時參考：

| Agent | 檔案位置 | 用途 |
|-------|---------|------|
| **Quality Agent** | `.claude/agents/reviewers/quality.md` | Clean Architecture 檢查、程式碼品質標準 |
| **對應的 Expert Agent** | `.claude/agents/experts/` | 根據重構的檔案類型載入規範 |

## Instructions

### 重構原則

1. **保持行為不變**: 重構不應改變外部行為
2. **小步驟**: 每次只做一個小改變
3. **測試保護**: 確保測試在每步後都通過

### 常見重構模式

#### Extract Method/Function
```go
// Before
func Process(data []Item) {
    // 50 lines of code...
}

// After
func Process(data []Item) {
    validated := validate(data)
    transformed := transform(validated)
    save(transformed)
}
```

#### Rename
```go
// Before
func DoStuff(d Data) {}

// After
func ProcessUserData(userData UserData) {}
```

#### Extract Interface
```go
// Before
type UserService struct {
    db *sql.DB
}

// After
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id string) (*User, error)
}

type UserService struct {
    repo UserRepository
}
```

### 步驟

1. **確保測試存在且通過**
   ```bash
   go test -v ./path/to/package/...
   ```

2. **分析程式碼**
   - Code smells (重複、過長函數、過多參數等)
   - 違反 SOLID 原則
   - 命名不清楚

3. **執行重構**
   - 每次一個小改變
   - 每次改變後執行測試

4. **完成**

   **執行 `/project:done` 完成開發流程**

## Output Format

```markdown
## Refactor: <path>

### 分析
- 目前問題: <issues found>
- 重構目標: <goals>

### 重構計劃
1. [Step 1]
2. [Step 2]
3. [Step 3]

### 變更

#### Before
[原始程式碼]

#### After
[重構後程式碼]

### 下一步
執行 `/project:done` 完成開發流程

### 改善
- 可讀性: [improved/same]
- 可維護性: [improved/same]
- 測試性: [improved/same]
```

## Example

```
/project:refactor ./internal/auth/service.go "拆分過長的 CreateUser 函數"
/project:refactor ./internal/query/ "引入 Repository pattern"
```
