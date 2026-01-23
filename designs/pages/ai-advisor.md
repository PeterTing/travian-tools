# AI 策略諮詢頁面

> 路由: `/ai/advisor`

## 相關 Tickets

- TICKET-305: AI 諮詢前端頁面

---

## 頁面結構

```
┌─────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: 首頁 > AI 助手 > 策略諮詢                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AI 策略諮詢                                                        │
│                                                                     │
│  遊戲帳號: [玩家一號 (ts1.travian.com)                         ▼]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ 對話區域 ──────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ 🤖 AI 助手                                   10:30 AM  │ │    │
│  │  │                                                        │ │    │
│  │  │ 您好！我是 Travian 策略顧問。根據您的帳號數據：         │ │    │
│  │  │                                                        │ │    │
│  │  │ 📊 帳號狀態                                            │ │    │
│  │  │ • 遊戲天數: Day 15                                     │ │    │
│  │  │ • 村莊數: 2                                            │ │    │
│  │  │ • 總人口: 1,280                                        │ │    │
│  │  │ • 遊戲階段: 早期發展期                                 │ │    │
│  │  │ • 進度評估: 正常                                       │ │    │
│  │  │                                                        │ │    │
│  │  │ 有什麼我可以幫助您的嗎？                               │ │    │
│  │  │                                                        │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ 👤 你                                        10:32 AM  │ │    │
│  │  │                                                        │ │    │
│  │  │ 我想開第三村，應該選擇什麼位置和類型？                 │ │    │
│  │  │                                                        │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ 🤖 AI 助手                                   10:32 AM  │ │    │
│  │  │                                                        │ │    │
│  │  │ 根據您的發展階段和帳號數據，我建議：                   │ │    │
│  │  │                                                        │ │    │
│  │  │ 🎯 第三村建議                                          │ │    │
│  │  │                                                        │ │    │
│  │  │ **位置選擇**                                           │ │    │
│  │  │ • 距離主村 5-10 格內                                   │ │    │
│  │  │ • 優先選擇有 +25% 糧食綠洲的位置                       │ │    │
│  │  │ • 避開活躍敵對玩家的附近                               │ │    │
│  │  │                                                        │ │    │
│  │  │ **村莊類型建議**                                       │ │    │
│  │  │ 推薦: 🌾 15田糧村                                      │ │    │
│  │  │                                                        │ │    │
│  │  │ 原因:                                                  │ │    │
│  │  │ 1. 您目前糧食產量不足以支撐大量軍隊                    │ │    │
│  │  │ 2. 15田可提供高糧食產出                                │ │    │
│  │  │ 3. 後期可改建為軍隊餵養村                              │ │    │
│  │  │                                                        │ │    │
│  │  │ 📋 下一步行動                                          │ │    │
│  │  │ 1. 檢查地圖尋找合適的 15田位置                         │ │    │
│  │  │ 2. 確保有 3 名移民或 3 名酋長                          │ │    │
│  │  │ 3. 儲備 750 文化點                                     │ │    │
│  │  │                                                        │ │    │
│  │  │ 需要我幫您計算開村成本嗎？                             │ │    │
│  │  │                                                        │ │    │
│  │  │ [📊 計算開村成本]  [🗺️ 查看地圖建議]                   │ │    │
│  │  │                                                        │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │  ⏳ AI 正在思考...                                          │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  快速問題                                                            │
│  [📈 發展建議] [⚔️ 軍事策略] [🏘️ 開村指南] [🛡️ 防守建議]          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 輸入您的問題...                                         [發送] ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 元件規格

### ChatMessage

```typescript
interface ChatMessageProps {
  message: Message;
  isUser: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: MessageAction[];
  accountSummary?: AccountSummary;
}

interface MessageAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}
```

### ChatInput

```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
}
```

### QuickQuestions

```typescript
interface QuickQuestionsProps {
  questions: QuickQuestion[];
  onSelect: (question: QuickQuestion) => void;
}

interface QuickQuestion {
  label: string;
  icon: LucideIcon;
  prompt: string;
}
```

### AccountSummaryCard

```typescript
interface AccountSummaryCardProps {
  summary: AccountSummary;
}

interface AccountSummary {
  dayNumber: number;
  villageCount: number;
  totalPopulation: number;
  gamePhase: string;
  progressAssessment: 'ahead' | 'normal' | 'behind';
}
```

---

## AI 回應格式

AI 回應支援以下格式：

### 1. 標題區塊
```markdown
🎯 第三村建議
```

### 2. 列表
```markdown
**位置選擇**
• 距離主村 5-10 格內
• 優先選擇有 +25% 糧食綠洲的位置
```

### 3. 行動按鈕
```markdown
[📊 計算開村成本]  [🗺️ 查看地圖建議]
```

### 4. 警告提示
```markdown
⚠️ 注意：您的糧食平衡即將轉負
```

### 5. 數據表格
```markdown
| 項目 | 數值 |
|------|------|
| 文化點需求 | 750 |
| 移民成本 | 5,800 |
```

---

## 對話歷史

### HistorySidebar

```
┌────────────────────────────────────┐
│  對話歷史                    [X]   │
├────────────────────────────────────┤
│                                    │
│  今天                              │
│  ┌────────────────────────────────┐│
│  │ 開村策略諮詢                   ││
│  │ 10:30 AM                       ││
│  └────────────────────────────────┘│
│                                    │
│  昨天                              │
│  ┌────────────────────────────────┐│
│  │ 資源田升級順序                 ││
│  │ 3:15 PM                        ││
│  └────────────────────────────────┘│
│  ┌────────────────────────────────┐│
│  │ 軍隊配置建議                   ││
│  │ 10:00 AM                       ││
│  └────────────────────────────────┘│
│                                    │
│  [+ 新對話]                        │
│                                    │
└────────────────────────────────────┘
```

---

## 狀態管理

```typescript
interface AIAdvisorState {
  selectedAccountId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  history: Conversation[];
  showHistory: boolean;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: Date;
  messageCount: number;
}
```

---

## API 整合

```typescript
// 發送訊息
POST /api/v1/strategy/advice
Request: {
  message: string;
  account_id?: string;
  conversation_id?: string;
}
Response: {
  message: Message;
  conversation_id: string;
  account_summary?: AccountSummary;
}

// 取得對話歷史
GET /api/v1/strategy/conversations
Response: Conversation[]

// 取得特定對話
GET /api/v1/strategy/conversations/{id}
Response: {
  conversation: Conversation;
  messages: Message[];
}
```

---

## 快速問題預設

```typescript
const quickQuestions: QuickQuestion[] = [
  {
    label: '發展建議',
    icon: TrendingUp,
    prompt: '根據我目前的帳號狀態，給我發展建議'
  },
  {
    label: '軍事策略',
    icon: Sword,
    prompt: '我應該訓練什麼部隊？給我軍事發展建議'
  },
  {
    label: '開村指南',
    icon: Home,
    prompt: '我想開新村，應該選擇什麼位置和類型？'
  },
  {
    label: '防守建議',
    icon: Shield,
    prompt: '如何提升我的防守能力？'
  }
];
```

---

## 響應式設計

### Desktop
- 對話區域置中，最大寬度 800px
- 歷史記錄在右側 Sidebar
- 快速問題水平排列

### Tablet
- 對話區域全寬
- 歷史記錄改為 Drawer
- 快速問題可滑動

### Mobile
- 對話區域全螢幕
- 輸入框固定在底部
- 快速問題改為下拉選單
