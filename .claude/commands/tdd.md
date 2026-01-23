# TDD Development Command

使用 Test-Driven Development 開發新功能。

## Usage

```bash
/project:tdd <TICKET-XXX 或 feature description>
```

## 參考 Agents

| Agent | 檔案位置 | 用途 |
| ----- | -------- | ---- |
| **Test Automator** | `.claude/agents/workers/test-automator.md` | AI 自動生成測試案例（步驟 0 可選） |
| **Engineer Agent** | `.claude/agents/workers/engineer.md` | TDD 流程執行、參考 Expert 規範 |
| **對應的 Expert Agent** | `.claude/agents/experts/` | 根據開發檔案類型載入 |
| **UI Designer** | `.claude/agents/experts/ui-designer.md` | 有設計稿時參考 |

---

## Instructions

當收到此 command 時，請遵循以下 TDD 流程：

### 步驟 0: 檢查 TICKET 與設計稿

**如果 `$ARGUMENTS` 包含 TICKET 編號**：

```bash
# 讀取 TICKET 資訊
Read docs/TICKETS.md

# 檢查 TICKET 類型和設計稿
```

**判斷是否有設計稿**：

```markdown
### 🎫 TICKET-006: 組織成員管理

**類型**: Full-Stack  ← 如果是 Frontend 或 Full-Stack

**設計稿**:           ← 如有此欄位，必須讀取設計稿
- [MemberList.md](designs/components/MemberList.md)
```

**如果有設計稿**：

```bash
# 讀取設計稿
Read docs/designs/components/MemberList.md
Read docs/designs/design-system.md  # Design Tokens
```

**設計稿將用於**：

- 定義元件的 Props 介面
- 定義需要測試的狀態（Default, Hover, Disabled...）
- 定義樣式規格
- 定義無障礙要求

---

### 步驟 1: AI 輔助測試生成（可選）

**使用 Test Automator Agent** 自動生成初始測試：

參考：`.claude/agents/workers/test-automator.md`

```markdown
Task: 使用 test-automator agent 分析需求並生成初始測試案例
- 分析功能需求
- 如有設計稿，依設計稿的狀態矩陣生成測試案例
- 生成測試程式碼骨架（Go 或 TypeScript）
```

**優勢**：

- 自動識別邊界條件和錯誤情境
- 依設計稿生成狀態測試
- 生成符合專案規範的測試結構
- 加速 TDD 流程

---

### 步驟 2: 理解需求

1. 分析 `$ARGUMENTS` 中描述的功能需求
2. 確認功能屬於哪個 service (auth/query/permission/ai/dashboard)
3. **如有設計稿**：確認元件的 Props、狀態、無障礙要求
4. 列出需要的測試案例

**有設計稿時的測試案例來源**：

```markdown
## 從設計稿提取測試案例

根據 `docs/designs/components/MemberList.md`：

### 狀態測試
- [ ] 渲染 Default 狀態
- [ ] 渲染 Loading 狀態
- [ ] 渲染 Empty 狀態
- [ ] 渲染 Error 狀態

### Props 測試
- [ ] 接受 members 陣列
- [ ] 接受 onRemove callback
- [ ] 接受 onRoleChange callback

### 無障礙測試
- [ ] 有正確的 ARIA 屬性
- [ ] 支援鍵盤導航
```

---

### 步驟 3: RED - 撰寫測試

1. 先撰寫測試檔案 (xxx_test.go 或 xxx.test.ts)
2. 測試應涵蓋：
   - Happy path (正常流程)
   - Edge cases (邊界條件)
   - Error cases (錯誤處理)
   - **如有設計稿**：所有設計稿定義的狀態
3. 執行測試確認失敗

```bash
# Go
go test -v ./internal/<service>/... -run Test<Feature>

# TypeScript
pnpm run test -- --testNamePattern="<feature>"
```

**有設計稿時的測試範例**：

```typescript
// MemberList.test.tsx
import { render, screen } from '@testing-library/react'
import { MemberList } from './MemberList'

describe('MemberList', () => {
  // 狀態測試（來自設計稿）
  describe('狀態', () => {
    it('渲染 Default 狀態', () => {
      render(<MemberList members={mockMembers} />)
      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('渲染 Loading 狀態', () => {
      render(<MemberList members={[]} loading />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('渲染 Empty 狀態', () => {
      render(<MemberList members={[]} />)
      expect(screen.getByText('目前沒有成員')).toBeInTheDocument()
    })
  })

  // 無障礙測試（來自設計稿）
  describe('無障礙', () => {
    it('有正確的 ARIA 屬性', () => {
      render(<MemberList members={mockMembers} />)
      expect(screen.getByRole('list')).toHaveAttribute('aria-label', '成員列表')
    })
  })
})
```

---

### 步驟 4: GREEN - 實作功能

1. 撰寫最少量的程式碼讓測試通過
2. **如有設計稿**：依設計稿的 Props 介面和樣式實作
3. 不要過度設計，只實作測試所需的功能
4. 執行測試確認通過

**有設計稿時**：

```typescript
// MemberList.tsx - 依設計稿實作
import styles from './MemberList.module.css'

// Props 介面來自設計稿
interface IMemberListProps {
  members: IMember[]
  loading?: boolean
  onRemove?: (memberId: string) => void
  onRoleChange?: (memberId: string, role: string) => void
}

export function MemberList({ members, loading, onRemove, onRoleChange }: IMemberListProps) {
  // 狀態處理來自設計稿
  if (loading) {
    return <div role="progressbar">載入中...</div>
  }

  if (members.length === 0) {
    return <div>目前沒有成員</div>
  }

  return (
    <ul
      className={styles.list}
      role="list"
      aria-label="成員列表"  // 無障礙要求來自設計稿
    >
      {members.map(member => (
        <li key={member.id} className={styles.item}>
          {/* ... */}
        </li>
      ))}
    </ul>
  )
}
```

---

### 步驟 5: REFACTOR - 重構

1. 檢查程式碼品質
2. 消除重複
3. 改善命名
4. **如有設計稿**：確認樣式使用正確的 Design Tokens
5. 確保測試仍然通過

---

### 步驟 6: 完成

**執行 `/project:done` 完成開發流程**

`/project:done` 會自動：

- 執行所有測試
- 檢查覆蓋率
- 執行 Lint
- **驗證設計稿符合度**（如有設計稿）
- 產出完整報告

---

## Output Format

```markdown
## TDD 開發: <feature name>

### 0. TICKET 與設計稿

| 項目 | 內容 |
| ---- | ---- |
| TICKET | TICKET-XXX |
| 類型 | Backend / Frontend / Full-Stack |
| 設計稿 | ✅ 有 / ❌ 無 |

**設計稿參照**（如有）：
- [MemberList.md](docs/designs/components/MemberList.md)

### 1. 需求分析

- Service: <service name>
- 功能描述: <description>

### 2. 測試案例

**功能測試**：
- [ ] Test case 1
- [ ] Test case 2

**設計稿狀態測試**（如有設計稿）：
- [ ] Default 狀態
- [ ] Loading 狀態
- [ ] Error 狀態

**無障礙測試**（如有設計稿）：
- [ ] ARIA 屬性
- [ ] 鍵盤導航

### 3. 測試程式碼

[測試程式碼]

### 4. 執行測試 (RED)

[測試失敗結果]

### 5. 實作程式碼

[實作程式碼]

### 6. 執行測試 (GREEN)

[測試通過結果]

### 7. 重構 (如需要)

[重構後的程式碼]

### 8. 下一步

執行 `/project:done` 完成開發流程
```

---

## Examples

```bash
# 有 TICKET 和設計稿
/project:tdd TICKET-006 MemberList 元件

# 純 Backend（無設計稿）
/project:tdd 實作用戶登入功能，需要驗證 email 和密碼，成功時回傳 JWT token

# 直接描述功能
/project:tdd 實作組織成員邀請功能
```

---

## 相關檔案

- `docs/TICKETS.md` - Ticket 追蹤
- `docs/designs/` - 設計稿目錄
- `.claude/agents/workers/test-automator.md`
- `.claude/agents/workers/engineer.md`
- `.claude/agents/experts/ui-designer.md`
