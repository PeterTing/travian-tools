# Database Migration Command

執行資料庫遷移。

## Usage

```
/project:db-migrate <action> [name]
```

## 參考 Agents

執行資料庫遷移時參考以下 Agent：

| Agent | 檔案位置 | 用途 |
|-------|---------|------|
| **Database Expert** | `.claude/agents/experts/database.md` | PostgreSQL Schema 設計規範、GORM Migration 策略、Index 最佳實踐 |

## Actions

- `create <name>` - 建立新的 migration 檔案
- `up` - 執行所有待執行的 migrations
- `down` - 回滾最後一個 migration
- `status` - 顯示 migration 狀態

## Instructions

### Migration 檔案結構

```
backend/
├── migrations/
│   ├── 000001_create_users_table.up.sql
│   ├── 000001_create_users_table.down.sql
│   ├── 000002_create_organizations_table.up.sql
│   ├── 000002_create_organizations_table.down.sql
│   └── ...
```

### 建立 Migration

```bash
# 使用 golang-migrate
migrate create -ext sql -dir backend/migrations -seq <name>
```

### Migration 範例

```sql
-- 000001_create_users_table.up.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- 000001_create_users_table.down.sql
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

### 執行 Migration

```bash
# 連接到 Cloud SQL
export DATABASE_URL="postgresql://user:pass@localhost:5432/insighthub?sslmode=disable"

# 使用 Cloud SQL Proxy
cloud_sql_proxy -instances=artogo-v2:asia-east1:insighthub-db=tcp:5432

# 執行 migration
migrate -database $DATABASE_URL -path backend/migrations up
```

### Migration 最佳實踐

1. **永遠有 down migration**: 每個 up 都要有對應的 down
2. **小步驟**: 每個 migration 只做一件事
3. **向後相容**: 考慮 rollback 的可能性
4. **測試**: 在本地先測試 migration
5. **備份**: 在 production 執行前備份

### 危險操作提醒

以下操作需要特別小心：

```sql
-- 危險: 直接刪除 column
ALTER TABLE users DROP COLUMN old_field;

-- 安全: 先標記為 deprecated，之後再刪除
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);
-- 部署後確認沒問題再刪除 old_field
```

## Output Format

```markdown
## Database Migration: <action>

### Migration Files
```
[list of migration files]
```

### Current Status
- Latest version: <version>
- Pending migrations: <count>

### Execution
```
[migration output]
```

### Verification
- Schema updated: [YES/NO]
- Data integrity: [OK/ISSUES]
```

## Example

```
/project:db-migrate create add_queries_table
/project:db-migrate up
/project:db-migrate down
/project:db-migrate status
```
