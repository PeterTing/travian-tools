# Plan Command

> 需求規劃命令。分析需求、檢查/更新 PRD、產出 Tickets。

## 使用方式

```bash
/project:plan <需求描述>

# 範例
/project:plan 實作用戶認證功能
/project:plan 新增組織成員管理
```

## 執行流程

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           /project:plan <需求描述>                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Phase 1: PRD 檢查與更新                                                        │
│     │                                                                           │
│     ├─ 讀取 docs/PRD.md（路徑從 project.yaml 取得）                             │
│     │                                                                           │
│     └─ 需求是否在 PRD？                                                         │
│        │                                                                        │
│        ├─ ✅ 已在 PRD                                                           │
│        │     └─ 引用 PRD 編號，進入 Phase 2                                     │
│        │                                                                        │
│        ├─ ⚠️ 部分在 PRD                                                         │
│        │     └─ 詢問用戶是否補充細節                                            │
│        │         │                                                              │
│        │         ├─ Yes → 更新 PRD → 進入 Phase 2                               │
│        │         └─ No → 使用現有定義 → 進入 Phase 2                            │
│        │                                                                        │
│        └─ ❌ 不在 PRD                                                           │
│              └─ 詢問用戶是否新增功能                                            │
│                  │                                                              │
│                  ├─ Yes → 新增到 PRD → 進入 Phase 2                             │
│                  └─ No → 結束                                                   │
│                                                                                 │
│  Phase 2: 需求拆解                                                               │
│     ├─ 分析功能範圍                                                              │
│     ├─ 識別前後端需求                                                            │
│     │     ├─ Backend-only（純 API）                                             │
│     │     ├─ Frontend-only（純 UI）                                             │
│     │     └─ Full-Stack（API + UI）                                             │
│     └─ 定義驗收條件（具體、可驗證）                                              │
│                                                                                 │
│  Phase 3: 產出 Tickets                                                          │
│     ├─ 建立 TICKET-XXX                                                          │
│     │     ├─ 標題                                                               │
│     │     ├─ 類型                                                               │
│     │     ├─ 描述                                                               │
│     │     ├─ Backend 驗收條件（如適用）                                         │
│     │     ├─ Frontend 驗收條件（如適用）                                        │
│     │     ├─ 相關 PRD                                                           │
│     │     └─ 依賴關係                                                           │
│     └─ 更新 TICKETS.md                                                          │
│                                                                                 │
│  Phase 4: 判斷是否需要設計                                                       │
│     │                                                                           │
│     └─ 有 UI 需求？                                                              │
│        │                                                                        │
│        ├─ Yes                                                                   │
│        │     ├─ 有 Figma 設計？                                                  │
│        │     │     ├─ Yes → 執行 /project:sync-design-system                    │
│        │     │     └─ No → 執行 /project:design                                 │
│        │     └─ 設計稿連結寫入 Ticket                                            │
│        │                                                                        │
│        └─ No → 直接完成                                                         │
│                                                                                 │
│  輸出摘要                                                                       │
│     - 產出的 Tickets 清單                                                       │
│     - PRD 更新內容（如有）                                                      │
│     - 設計稿連結（如有）                                                        │
│     - 下一步建議                                                                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Ticket 格式

### 標準 Ticket 模板

```markdown
### 🎫 TICKET-XXX: [標題]

**類型**: Full-Stack | Frontend | Backend

**設計稿**: (僅 Full-Stack / Frontend 需要)
- [ComponentA.md](designs/components/ComponentA.md)
- [PageB.md](designs/pages/PageB.md)

**描述**:
[功能詳細描述]

**Backend 驗收條件**: (如適用)
- [ ] `POST /api/v1/xxx` endpoint
- [ ] 請求/回應格式正確
- [ ] 錯誤處理完整
- [ ] 單元測試覆蓋率 > 80%

**Frontend 驗收條件**: (如適用)
- [ ] 依照設計稿實作元件
- [ ] 所有狀態（loading/error/empty）處理
- [ ] 響應式設計（mobile/tablet/desktop）
- [ ] 元件測試覆蓋
- [ ] E2E 測試覆蓋用戶流程

**相關 PRD**: F1.x.x

**依賴**: TICKET-XXX (如有)
```

### Ticket 類型說明

| 類型 | 需要設計稿 | 說明 |
| ---- | ---------- | ---- |
| **Backend** | ❌ 不需要 | 純 API / 資料庫 / 後端邏輯 |
| **Frontend** | ✅ 必須 | 純 UI 元件 / 頁面 |
| **Full-Stack** | ✅ 必須 | API + UI 整合 |

---

## PRD 更新格式

### 新增功能到 PRD

```markdown
## F1.X.X [功能名稱]

### 功能描述
[詳細描述]

### 用戶故事
作為 [角色]，我希望 [功能]，以便 [價值]

### 功能需求
1. [需求 1]
2. [需求 2]

### 介面需求
- [UI 需求]

### 技術需求
- [技術考量]

### 驗收標準
- [ ] 標準 1
- [ ] 標準 2
```

---

## 輸出範例

```markdown
## /project:plan 執行結果

### PRD 狀態
✅ 需求已在 PRD (F1.2.1 用戶認證)

### 產出 Tickets

#### 🎫 TICKET-012: 用戶登入 API

**類型**: Backend

**Backend 驗收條件**:
- [ ] `POST /api/v1/auth/login` endpoint
- [ ] 接受 email + password
- [ ] 驗證成功回傳 JWT token
- [ ] 驗證失敗回傳適當錯誤
- [ ] 單元測試覆蓋率 > 80%

**相關 PRD**: F1.2.1

---

#### 🎫 TICKET-013: 登入頁面

**類型**: Frontend

**設計稿**:
- [LoginForm.md](designs/components/LoginForm.md)
- [login.md](designs/pages/login.md)

**Frontend 驗收條件**:
- [ ] 依照設計稿實作登入表單
- [ ] Email 格式驗證
- [ ] 密碼長度驗證
- [ ] Loading 狀態處理
- [ ] 錯誤訊息顯示
- [ ] 登入成功導向 /app
- [ ] E2E 測試覆蓋登入流程

**相關 PRD**: F1.2.1
**依賴**: TICKET-012

---

### 設計稿產出
- [LoginForm.md](designs/components/LoginForm.md) ✅
- [login.md](designs/pages/login.md) ✅

### 下一步

1. 執行 `/project:start-dev TICKET-012` 開始後端開發
2. 後端完成後執行 `/project:start-dev TICKET-013` 開始前端開發
3. 或執行 `/project:start-dev TICKET-012,TICKET-013` 並行開發
```

---

## 相關文件

- [WORKFLOWS.md](../WORKFLOWS.md) - 完整開發流程
- [design.md](./design.md) - 設計命令
- [start-dev.md](./start-dev.md) - 開發命令
