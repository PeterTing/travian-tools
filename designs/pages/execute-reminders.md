# 提醒設定頁面

> 路由: `/execute/reminders`

## 相關 Tickets

- TICKET-405: 排程提醒系統

---

## 頁面結構

```
┌─────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: 首頁 > 執行 > 提醒設定                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  提醒設定                                         [+ 新增提醒規則]   │
│                                                                     │
│  遊戲帳號: [玩家一號 (ts1.travian.com)                         ▼]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  通知方式                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [✓] 瀏覽器通知                                                 ││
│  │  [ ] 電子郵件 (user@example.com)                                ││
│  │  [ ] LINE 通知 (未設定)  [設定]                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ 提醒規則 ──────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ 🏗️ 建造完成提醒                             [✓] 啟用   │ │    │
│  │  │                                                        │ │    │
│  │  │ 當建築建造完成時通知                                   │ │    │
│  │  │ 提前通知: 5 分鐘前                                     │ │    │
│  │  │ 適用村莊: 所有村莊                                     │ │    │
│  │  │                                                        │ │    │
│  │  │ [✏️ 編輯]                                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ ⚔️ 訓練完成提醒                             [✓] 啟用   │ │    │
│  │  │                                                        │ │    │
│  │  │ 當部隊訓練完成時通知                                   │ │    │
│  │  │ 提前通知: 10 分鐘前                                    │ │    │
│  │  │ 最小數量: 50 單位                                      │ │    │
│  │  │ 適用村莊: 主村, 軍事村                                 │ │    │
│  │  │                                                        │ │    │
│  │  │ [✏️ 編輯]                                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ 📦 資源滿倉提醒                             [✓] 啟用   │ │    │
│  │  │                                                        │ │    │
│  │  │ 當任一資源達到倉庫容量的指定比例時通知                 │ │    │
│  │  │ 觸發條件: 90% 容量                                     │ │    │
│  │  │ 冷卻時間: 30 分鐘                                      │ │    │
│  │  │ 適用村莊: 所有村莊                                     │ │    │
│  │  │                                                        │ │    │
│  │  │ [✏️ 編輯]                                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ 🦸 英雄可出冒險提醒                         [✓] 啟用   │ │    │
│  │  │                                                        │ │    │
│  │  │ 當英雄完成冒險並可再次出發時通知                       │ │    │
│  │  │ 檢查間隔: 每 15 分鐘                                   │ │    │
│  │  │                                                        │ │    │
│  │  │ [✏️ 編輯]                                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ ⚠️ 遭受攻擊提醒                             [✓] 啟用   │ │    │
│  │  │                                                        │ │    │
│  │  │ 當偵測到來襲攻擊時立即通知                             │ │    │
│  │  │ 通知優先級: 高 (即使其他通知靜音)                      │ │    │
│  │  │ 適用村莊: 所有村莊                                     │ │    │
│  │  │                                                        │ │    │
│  │  │ [✏️ 編輯]                                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ 🌾 糧食危機提醒                             [✓] 啟用   │ │    │
│  │  │                                                        │ │    │
│  │  │ 當糧食平衡轉為負值或糧食即將耗盡時通知                 │ │    │
│  │  │ 觸發條件: 結餘 < 0 或 存量 < 2小時消耗                 │ │    │
│  │  │ 冷卻時間: 1 小時                                       │ │    │
│  │  │                                                        │ │    │
│  │  │ [✏️ 編輯]                                              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ 提醒歷史 ──────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  最近 24 小時內的提醒:                                       │    │
│  │                                                              │    │
│  │  🔔 10:30 - 建造完成: 本部 Lv15 (主村)                      │    │
│  │  🔔 09:15 - 資源滿倉: 木材 90% (糧村一號)                   │    │
│  │  🔔 08:00 - 訓練完成: 帝國兵 ×50 (主村)                     │    │
│  │                                                              │    │
│  │  [查看全部歷史]                                              │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 編輯提醒規則 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  編輯提醒規則                                                   [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📦 資源滿倉提醒                                                    │
│                                                                     │
│  ┌─ 觸發條件 ──────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  容量閾值                                                    │    │
│  │  當任一資源達到倉庫容量的                                    │    │
│  │  ┌─────────────────────────────────────────────────────────┐│    │
│  │  │ [▼] 90%                                                 ││    │
│  │  └─────────────────────────────────────────────────────────┘│    │
│  │  時觸發提醒                                                  │    │
│  │                                                              │    │
│  │  資源類型                                                    │    │
│  │  [✓] 🪵 木材  [✓] 🧱 黏土  [✓] ⛏️ 鐵礦  [✓] 🌾 糧食        │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ 適用範圍 ──────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  (●) 所有村莊                                                │    │
│  │  ( ) 指定村莊:                                               │    │
│  │      [ ] 主村                                                │    │
│  │      [ ] 糧村一號                                            │    │
│  │      [ ] 軍事村                                              │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ 通知設定 ──────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  冷卻時間 (防止重複通知)                                     │    │
│  │  ┌─────────────────────────────────────────────────────────┐│    │
│  │  │ [▼] 30 分鐘                                             ││    │
│  │  └─────────────────────────────────────────────────────────┘│    │
│  │                                                              │    │
│  │  通知優先級                                                  │    │
│  │  (●) 一般                                                    │    │
│  │  ( ) 高 (勿擾模式下仍會通知)                                 │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                [取消]  [💾 儲存]  [🗑️ 刪除規則]     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 元件規格

### ReminderRuleCard

```typescript
interface ReminderRuleCardProps {
  rule: ReminderRule;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
}

interface ReminderRule {
  id: string;
  type: ReminderType;
  name: string;
  description: string;
  enabled: boolean;
  config: ReminderConfig;
  villages: string[] | 'all';
  lastTriggered?: Date;
}

type ReminderType =
  | 'build_complete'
  | 'train_complete'
  | 'resource_full'
  | 'hero_adventure'
  | 'under_attack'
  | 'crop_crisis';
```

### ReminderRuleForm

```typescript
interface ReminderRuleFormProps {
  rule: ReminderRule | null;
  villages: Village[];
  onSave: (rule: ReminderRule) => void;
  onDelete?: () => void;
  onCancel: () => void;
}
```

### NotificationSettings

```typescript
interface NotificationSettingsProps {
  settings: NotificationConfig;
  onChange: (settings: NotificationConfig) => void;
}

interface NotificationConfig {
  browser: boolean;
  email: boolean;
  emailAddress?: string;
  line: boolean;
  lineToken?: string;
}
```

### ReminderHistory

```typescript
interface ReminderHistoryProps {
  history: ReminderEvent[];
  onViewAll: () => void;
}

interface ReminderEvent {
  id: string;
  type: ReminderType;
  message: string;
  timestamp: Date;
  village?: Village;
  read: boolean;
}
```

---

## 狀態管理

```typescript
interface RemindersPageState {
  selectedAccountId: string | null;
  rules: ReminderRule[];
  notificationSettings: NotificationConfig;
  history: ReminderEvent[];
  isLoading: boolean;
  error: string | null;
  editingRule: ReminderRule | null;
}
```

---

## API 整合

```typescript
// 取得提醒規則
GET /api/v1/reminders/rules?account_id={id}
Response: ReminderRule[]

// 建立/更新提醒規則
POST /api/v1/reminders/rules
Request: ReminderRule
Response: ReminderRule

PUT /api/v1/reminders/rules/{id}
Request: Partial<ReminderRule>
Response: ReminderRule

// 刪除提醒規則
DELETE /api/v1/reminders/rules/{id}
Response: { success: true }

// 取得通知設定
GET /api/v1/reminders/settings
Response: NotificationConfig

// 更新通知設定
PUT /api/v1/reminders/settings
Request: NotificationConfig
Response: NotificationConfig

// 取得提醒歷史
GET /api/v1/reminders/history?limit={limit}
Response: ReminderEvent[]
```

---

## 瀏覽器通知

```typescript
// 請求通知權限
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// 發送通知
function sendNotification(title: string, options: NotificationOptions) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon.png',
      badge: '/badge.png',
      ...options,
    });
  }
}
```

---

## 響應式設計

### Desktop
- 規則卡片完整顯示
- 歷史記錄在側邊

### Tablet
- 規則卡片完整顯示
- 歷史記錄在底部

### Mobile
- 規則卡片簡化
- 歷史記錄可收起
- Modal 全螢幕
