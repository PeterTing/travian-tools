# Fix Command

修復指定的 issue 或 bug。

## Usage

```text
/project:fix <issue description or number>
```

## 參考 Agents

修復 bug 時參考：

| Agent | 檔案位置 | 用途 |
|-------|---------|------|
| **Engineer Agent** | `.claude/agents/workers/engineer.md` | TDD 開發流程、參考 Expert 規範 |
| **對應的 Expert Agent** | `.claude/agents/experts/` | 根據修復的檔案類型載入（frontend/backend/database/cicd/terraform）|

## Instructions

### 步驟 1: 分析問題

1. 理解 `$ARGUMENTS` 描述的問題
2. 如果是 GitHub issue，使用 `gh issue view <number>` 取得詳細資訊
3. 找出相關程式碼

### 步驟 2: 撰寫失敗測試 (TDD - RED)

```go
func TestBugFix_IssueXxx(t *testing.T) {
    // 重現 bug 的測試
    // 這個測試應該失敗
}
```

### 步驟 3: 修復 (TDD - GREEN)

1. 修改程式碼修復問題
2. 確保新測試通過

### 步驟 4: 重構 (TDD - REFACTOR)

1. 重構程式碼（如需要）
2. 確保所有測試仍然通過

### 步驟 5: 完成

**執行 `/project:done` 完成開發流程**

## Output Format

```markdown
## Bug Fix: <issue title>

### 問題分析
- 問題描述: <description>
- 影響範圍: <scope>
- 根本原因: <root cause>

### 重現測試
```go
[測試程式碼]
```

### 修復方案
```go
[修復程式碼]
```

### 下一步
執行 `/project:done` 完成開發流程
```

## Example

```text
/project:fix 登入失敗時沒有顯示錯誤訊息
/project:fix #42
```
