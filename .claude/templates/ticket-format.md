# Ticket Format

> TICKET 格式規範共用模板，供 CLAUDE.md 和 plan.md 引用

---

## TICKET 類型

| TICKET 類型    | 需要 UX | 需要 UI | 說明                 |
| -------------- | ------- | ------- | -------------------- |
| **Backend**    | ❌      | ❌      | 純 API / 資料庫變更  |
| **Frontend**   | ✅      | ✅      | UI 元件 / 頁面開發   |
| **Full-Stack** | ✅      | ✅      | API + UI 都需要      |

---

## TICKET 格式

### Full-Stack / Frontend（有 UI）

```markdown
### 🎫 TICKET-XXX: [標題]

**類型**: Full-Stack | Frontend

**UX 設計**:
- [user-flow.md](designs/ux/flows/xxx-flow.md)
- [wireframe.md](designs/ux/wireframes/xxx-wireframe.md)

**UI 設計稿**:
- [ComponentA.md](designs/components/ComponentA.md)
- [PageB.md](designs/pages/PageB.md)

**描述**: [功能描述]

**Backend 驗收條件**: (如適用)
- [ ] `POST /api/v1/xxx` endpoint
- [ ] 單元測試覆蓋率 > 80%

**Frontend 驗收條件**:
- [ ] 依照設計稿實作元件
- [ ] 元件測試覆蓋
- [ ] E2E 測試覆蓋驗收條件

**相關 PRD**: F1.x.x
**依賴**: TICKET-XXX
```

### Backend（無 UI）

```markdown
### 🎫 TICKET-XXX: [標題]

**類型**: Backend

**描述**: [功能描述]

**Backend 驗收條件**:
- [ ] `POST /api/v1/xxx` endpoint
- [ ] 單元測試覆蓋率 > 80%

**相關 PRD**: F1.x.x
**依賴**: TICKET-XXX
```

---

## TICKET 原則

1. **最小可部署單位** - 完成後能獨立部署
2. **前後端完整** - Full-Stack TICKET 包含 BE + FE
3. **明確驗收條件** - 可驗證
4. **適當粒度** - 約 1-3 天工作量
5. **設計先行** - 有 UI 的 TICKET 必須先有 UX 和 UI 設計稿

---

## 驗收條件規範

### Backend 驗收條件範例

- [ ] `POST /api/v1/organizations` endpoint 實作
- [ ] `GET /api/v1/organizations/:id/members` endpoint 實作
- [ ] 單元測試覆蓋率 > 80%
- [ ] API 文件更新

### Frontend 驗收條件範例

- [ ] 依照設計稿實作 `MemberList` 元件
- [ ] 依照設計稿實作 `InviteMemberDialog` 元件
- [ ] 元件測試覆蓋（Props、狀態、互動）
- [ ] E2E 測試覆蓋所有用戶流程
- [ ] 響應式設計（Desktop、Tablet、Mobile）
- [ ] 無障礙要求滿足（ARIA、鍵盤導航）

---

## 進度追蹤格式

```markdown
| Ticket | 名稱 | 狀態 | 完成日期 | 備註 |
|--------|------|------|----------|------|
| 001 | 基礎專案架構與 CI/CD | ✅ | 2026-01-20 | 完成 |
| 002 | 用戶認證系統 | 🔵 | - | 開發中 |
| 003 | 組織管理 | ⚪ | - | 待開始 |
```

**狀態說明**：

| 符號 | 意義 |
|------|------|
| ⚪ | 待開始 |
| 🔵 | 開發中 |
| ✅ | 已完成 |
| ❌ | 已取消 |

---

## 使用方式

在其他文件中引用：

```markdown
## TICKET 格式

→ 參考 [ticket-format.md](../.claude/templates/ticket-format.md)

## 驗收條件規範

→ 參考 [ticket-format.md](../.claude/templates/ticket-format.md#驗收條件規範)
```
