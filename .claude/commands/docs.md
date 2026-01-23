# Documentation Command

更新專案文件。

## Usage

```
/project:docs <what to document>
```

## 參考 Skills

更新文件時可使用以下 Skills：

| Skill | 檔案位置 | 用途 |
|-------|---------|------|
| **doc-coauthoring** | `.claude/skills/doc-coauthoring/` | 結構化文件協作（PRD、技術文件）|

## 參考 Agents

根據文件類型參考對應規範：

| 文件類型 | 專家 Agent | 用途 |
|---------|-----------|------|
| API 文件 | Backend Expert (`.claude/agents/experts/backend.md`) | API 端點規範、命名規範 |
| CLAUDE.md / README.md | - | 專案說明、開發指引 |

## Instructions

### 文件類型

1. **API 文件** - OpenAPI/Swagger 格式
2. **README** - 專案說明
3. **CLAUDE.md** - Claude 協作指引
4. **PRD** - 產品需求文件
5. **程式碼註解** - 複雜邏輯說明

### API 文件

使用 OpenAPI 3.0 格式：

```yaml
openapi: 3.0.0
info:
  title: InsightHub API
  version: 1.0.0
paths:
  /api/v1/queries:
    post:
      summary: 執行自然語言查詢
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/QueryRequest'
      responses:
        '200':
          description: 查詢結果
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QueryResponse'
```

### Go 程式碼註解

```go
// UserService 處理用戶相關的業務邏輯。
// 包含用戶註冊、登入、資料更新等功能。
type UserService struct {
    repo   UserRepository
    hasher PasswordHasher
}

// Create 建立新用戶。
//
// 流程：
// 1. 驗證輸入資料
// 2. 檢查 email 是否已存在
// 3. 雜湊密碼
// 4. 儲存用戶資料
//
// 參數:
//   - ctx: 請求上下文，包含 tenant 資訊
//   - input: 用戶註冊資料
//
// 回傳:
//   - *User: 建立的用戶資料
//   - error: 如果建立失敗
func (s *UserService) Create(ctx context.Context, input CreateUserInput) (*User, error) {
    // ...
}
```

### TypeScript 程式碼註解

```typescript
/**
 * 執行自然語言查詢的 hook。
 *
 * @example
 * ```tsx
 * const { execute, isLoading, data, error } = useQuery()
 *
 * const handleSubmit = async (query: string) => {
 *   await execute({ connectionId: 'xxx', query })
 * }
 * ```
 */
export function useQuery() {
  // ...
}
```

## Output Format

```markdown
## Documentation Update: <what>

### 更新內容
[description of changes]

### 新增/修改的文件
1. `path/to/file.md`
2. `path/to/api.yaml`

### 文件內容
[actual documentation content]
```

## Example

```
/project:docs 更新 API 文件，加入 /api/v1/queries 端點
/project:docs 更新 CLAUDE.md，加入新的 command
```
