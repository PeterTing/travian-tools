# 自動化設定頁面

> 路由: `/automation/settings`

## 相關 Tickets

- TICKET-503: 自動化設定功能

---

## 頁面結構

```
┌─────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: 首頁 > 自動化 > 設定                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  自動化設定                                                          │
│  配置遊戲自動化行為與輔助功能                                        │
│                                                                     │
│  遊戲帳號: [玩家一號 (ts1.travian.com)                         ▼]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Keep-alive 防登出 ────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  防止長時間不操作被系統登出                                  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  啟用 Keep-alive          [========○==]  開啟          │ │  │
│  │  │                                                        │ │  │
│  │  │  模擬活動間隔                                          │ │  │
│  │  │  ┌─────────────────────────────────────────────────┐  │ │  │
│  │  │  │  每  [ 5 ]  分鐘模擬一次活動                     │  │ │  │
│  │  │  │  (建議: 3-10 分鐘，避免過於頻繁)                │  │ │  │
│  │  │  └─────────────────────────────────────────────────┘  │ │  │
│  │  │                                                        │ │  │
│  │  │  活動類型                                              │ │  │
│  │  │  [ ✓ ] 刷新村莊概覽頁面                               │ │  │
│  │  │  [ ✓ ] 檢查訊息中心                                   │ │  │
│  │  │  [ ] 隨機點擊資源田                                   │ │  │
│  │  │  [ ] 檢查建築佇列                                     │ │  │
│  │  │                                                        │ │  │
│  │  │  狀態: ✅ 運作中 - 上次活動: 2 分鐘前                 │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 彈窗自動關閉 ─────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  自動關閉遊戲內的各種彈窗和提示                              │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  啟用自動關閉彈窗        [========○==]  開啟          │ │  │
│  │  │                                                        │ │  │
│  │  │  等待時間                                              │ │  │
│  │  │  ┌─────────────────────────────────────────────────┐  │ │  │
│  │  │  │  彈窗出現後等待  [ 2 ]  秒後自動關閉             │  │ │  │
│  │  │  │  (建議: 1-5 秒，讓用戶有時間閱讀)               │  │ │  │
│  │  │  └─────────────────────────────────────────────────┘  │ │  │
│  │  │                                                        │ │  │
│  │  │  關閉的彈窗類型                                        │ │  │
│  │  │  [ ✓ ] 每日登入獎勵彈窗                               │ │  │
│  │  │  [ ✓ ] 活動公告彈窗                                   │ │  │
│  │  │  [ ✓ ] 促銷廣告彈窗                                   │ │  │
│  │  │  [ ✓ ] 成就解鎖通知                                   │ │  │
│  │  │  [ ] 系統維護公告 (建議保留)                          │ │  │
│  │  │  [ ] 攻擊警告 (建議保留)                              │ │  │
│  │  │                                                        │ │  │
│  │  │  今日已自動關閉: 5 個彈窗                              │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ MH 公告自動繼續 ──────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  自動點擊 Multihunter 公告的繼續按鈕                        │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  啟用 MH 公告自動繼續    [========○==]  開啟          │ │  │
│  │  │                                                        │ │  │
│  │  │  等待時間                                              │ │  │
│  │  │  ┌─────────────────────────────────────────────────┐  │ │  │
│  │  │  │  MH 公告出現後等待  [ 3 ]  秒後自動繼續          │  │ │  │
│  │  │  │  (建議: 2-5 秒，確保公告內容載入完成)           │  │ │  │
│  │  │  └─────────────────────────────────────────────────┘  │ │  │
│  │  │                                                        │ │  │
│  │  │  [ ✓ ] 記錄 MH 公告內容供日後查閱                     │ │  │
│  │  │                                                        │ │  │
│  │  │  最近 MH 公告:                                         │ │  │
│  │  │  • 2026-01-30 15:20 - 機器人偵測警告 (Lv1)            │ │  │
│  │  │  • 2026-01-28 10:45 - 伺服器規則提醒                  │ │  │
│  │  │  [查看所有記錄]                                        │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 攻擊警告音效 ─────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  當偵測到來襲攻擊時播放警告音效                              │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  啟用攻擊警告音效        [========○==]  開啟          │ │  │
│  │  │                                                        │ │  │
│  │  │  警告音效                                              │ │  │
│  │  │  ┌─────────────────────────────────────────────────┐  │ │  │
│  │  │  │  [ 警報音 1 (緊急)                          ▼ ] │  │ │  │
│  │  │  └─────────────────────────────────────────────────┘  │ │  │
│  │  │  [▶️ 試聽]                                             │ │  │
│  │  │                                                        │ │  │
│  │  │  音效選項:                                             │ │  │
│  │  │  • 警報音 1 (緊急)                                    │ │  │
│  │  │  • 警報音 2 (中等)                                    │ │  │
│  │  │  • 鈴聲提示                                           │ │  │
│  │  │  • 語音提示 "有攻擊來襲"                              │ │  │
│  │  │  • 自訂音效...                                        │ │  │
│  │  │                                                        │ │  │
│  │  │  音量                                                  │ │  │
│  │  │  ○───────────────●───────────○                        │ │  │
│  │  │  靜音          70%          最大                       │ │  │
│  │  │                                                        │ │  │
│  │  │  觸發條件                                              │ │  │
│  │  │  [ ✓ ] 所有攻擊                                       │ │  │
│  │  │  [ ] 僅大型攻擊 (> 1000 單位)                         │ │  │
│  │  │  [ ] 僅對主村的攻擊                                   │ │  │
│  │  │                                                        │ │  │
│  │  │  [ ✓ ] 同時發送瀏覽器通知                             │ │  │
│  │  │  [ ] 重複播放直到確認                                 │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 快速掃描建築 ─────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  掃描村莊建築狀態並快取結果                                  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  啟用快速掃描            [========○==]  開啟          │ │  │
│  │  │                                                        │ │  │
│  │  │  掃描間隔                                              │ │  │
│  │  │  ┌─────────────────────────────────────────────────┐  │ │  │
│  │  │  │  每  [ 15 ]  分鐘自動掃描一次                    │  │ │  │
│  │  │  │  (建議: 10-30 分鐘)                             │  │ │  │
│  │  │  └─────────────────────────────────────────────────┘  │ │  │
│  │  │                                                        │ │  │
│  │  │  掃描範圍                                              │ │  │
│  │  │  [ ✓ ] 建築等級                                       │ │  │
│  │  │  [ ✓ ] 資源田等級                                     │ │  │
│  │  │  [ ✓ ] 建築佇列狀態                                   │ │  │
│  │  │  [ ✓ ] 部隊數量                                       │ │  │
│  │  │  [ ] 英雄狀態 (較耗時)                                │ │  │
│  │  │                                                        │ │  │
│  │  │  最後掃描: 3 分鐘前                                    │ │  │
│  │  │  [▶️ 立即掃描]                                         │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ URL 快取 ─────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  快取常用頁面以加速載入                                      │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  啟用 URL 快取            [========○==]  開啟         │ │  │
│  │  │                                                        │ │  │
│  │  │  快取時間                                              │ │  │
│  │  │  ┌─────────────────────────────────────────────────┐  │ │  │
│  │  │  │  頁面快取保留  [ 5 ]  分鐘                       │  │ │  │
│  │  │  │  (建議: 3-10 分鐘)                              │  │ │  │
│  │  │  └─────────────────────────────────────────────────┘  │ │  │
│  │  │                                                        │ │  │
│  │  │  快取頁面類型                                          │ │  │
│  │  │  [ ✓ ] 村莊概覽                                       │ │  │
│  │  │  [ ✓ ] 資源田頁面                                     │ │  │
│  │  │  [ ✓ ] 建築頁面                                       │ │  │
│  │  │  [ ✓ ] 兵營/馬廄訓練頁面                              │ │  │
│  │  │  [ ] 地圖頁面 (資料變化快)                            │ │  │
│  │  │  [ ] 報告頁面 (資料變化快)                            │ │  │
│  │  │                                                        │ │  │
│  │  │  快取狀態: 12 個頁面已快取 (約 2.4 MB)                │ │  │
│  │  │  [🗑️ 清除快取]                                        │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 人性化延遲設定 ───────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  為自動化操作加入隨機延遲，模擬人工操作                      │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  啟用人性化延遲          [========○==]  開啟          │ │  │
│  │  │                                                        │ │  │
│  │  │  延遲範圍                                              │ │  │
│  │  │  最小延遲: [ 1.0 ] 秒    最大延遲: [ 3.0 ] 秒         │ │  │
│  │  │                                                        │ │  │
│  │  │  ○─────────●─────────────●─────────○                   │ │  │
│  │  │  0s       1s            3s        5s                   │ │  │
│  │  │                                                        │ │  │
│  │  │  [ ✓ ] 連續操作時逐漸減少延遲                         │ │  │
│  │  │  [ ✓ ] 隨機暫停模擬閱讀行為                           │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [儲存所有設定]                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## MH 公告記錄 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  MH 公告記錄                                                   [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  篩選: [全部 ▼]  日期: [最近 30 天 ▼]                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 日期            │ 類型          │ 內容摘要          │ 等級   │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ 2026-01-30 15:20│ 機器人偵測    │ 偵測到可疑行為... │ Lv1    │ │
│  │ 2026-01-28 10:45│ 規則提醒      │ 請遵守遊戲規則... │ -      │ │
│  │ 2026-01-25 08:30│ 機器人偵測    │ 偵測到可疑行為... │ Lv1    │ │
│  │ 2026-01-20 14:15│ 警告          │ 第一次警告...     │ Lv2    │ │
│  │ ...             │               │                   │        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ⚠️ 重要提示:                                                       │
│  • Lv1: 一般偵測提醒，無需特別處理                                 │
│  • Lv2: 正式警告，建議減少自動化操作頻率                           │
│  • Lv3: 嚴重警告，可能導致帳號停權                                 │
│                                                                     │
│  共 8 筆記錄                              [< 上一頁] 1/1 [下一頁 >] │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 自訂音效 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  自訂攻擊警告音效                                              [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ 上傳音效檔案 ─────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │                                                         │││
│  │  │              拖曳音效檔案到此處                         │││
│  │  │                                                         │││
│  │  │              或 [選擇檔案]                              │││
│  │  │                                                         │││
│  │  │              支援格式: MP3, WAV, OGG                    │││
│  │  │              檔案大小上限: 1 MB                         │││
│  │  │                                                         │││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ 已上傳的自訂音效 ─────────────────────────────────────────────┐│
│  │                                                              ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │  my-alarm.mp3                    [▶️ 試聽] [🗑️ 刪除]  │ ││
│  │  │  大小: 245 KB  時長: 5 秒                              │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │  warning-sound.wav               [▶️ 試聽] [🗑️ 刪除]  │ ││
│  │  │  大小: 512 KB  時長: 3 秒                              │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                     [關閉]         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 元件規格

### SettingSection

```typescript
interface SettingSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}
```

### SettingToggle

```typescript
interface SettingToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}
```

### SettingSlider

```typescript
interface SettingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  hint?: string;
}
```

### SettingRangeSlider

```typescript
interface SettingRangeSliderProps {
  label: string;
  minValue: number;
  maxValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (min: number, max: number) => void;
}
```

### SettingSelect

```typescript
interface SettingSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}
```

### SettingCheckboxGroup

```typescript
interface SettingCheckboxGroupProps {
  label: string;
  options: { id: string; label: string; description?: string }[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}
```

### SoundSelector

```typescript
interface SoundSelectorProps {
  value: string;
  onChange: (soundId: string) => void;
  onPreview: (soundId: string) => void;
  onCustomUpload: () => void;
  sounds: SoundOption[];
}

interface SoundOption {
  id: string;
  name: string;
  type: 'builtin' | 'custom';
  url?: string;
}
```

### VolumeSlider

```typescript
interface VolumeSliderProps {
  value: number;
  onChange: (volume: number) => void;
  onMute: () => void;
  isMuted: boolean;
}
```

### MhLogModal

```typescript
interface MhLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: MhLogEntry[];
}

interface MhLogEntry {
  id: string;
  timestamp: Date;
  type: 'bot_detection' | 'rule_reminder' | 'warning' | 'other';
  content: string;
  level?: 'lv1' | 'lv2' | 'lv3';
}
```

### CustomSoundModal

```typescript
interface CustomSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  customSounds: CustomSound[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (soundId: string) => void;
  onPreview: (soundId: string) => void;
}

interface CustomSound {
  id: string;
  filename: string;
  size: number;
  duration: number;
  url: string;
}
```

---

## 狀態管理

```typescript
interface AutomationSettingsPageState {
  // 基本狀態
  selectedAccountId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;

  // Keep-alive 設定
  keepAlive: {
    enabled: boolean;
    intervalMinutes: number;
    activityTypes: string[];
    status: 'running' | 'stopped' | 'error';
    lastActivity?: Date;
  };

  // 彈窗自動關閉設定
  popupAutoClose: {
    enabled: boolean;
    delaySeconds: number;
    popupTypes: string[];
    closedTodayCount: number;
  };

  // MH 公告設定
  mhAnnouncement: {
    enabled: boolean;
    delaySeconds: number;
    saveHistory: boolean;
    recentLogs: MhLogEntry[];
  };

  // 攻擊警告音效設定
  attackAlert: {
    enabled: boolean;
    soundId: string;
    volume: number;
    triggerCondition: 'all' | 'large' | 'capital';
    largeSizeThreshold: number;
    sendBrowserNotification: boolean;
    repeatUntilConfirmed: boolean;
  };

  // 快速掃描設定
  quickScan: {
    enabled: boolean;
    intervalMinutes: number;
    scanTypes: string[];
    lastScan?: Date;
  };

  // URL 快取設定
  urlCache: {
    enabled: boolean;
    cacheMinutes: number;
    cacheTypes: string[];
    cachedCount: number;
    cachedSize: number;
  };

  // 人性化延遲設定
  humanDelay: {
    enabled: boolean;
    minSeconds: number;
    maxSeconds: number;
    decreaseOnContinuous: boolean;
    randomPause: boolean;
  };

  // Modal 狀態
  showMhLogs: boolean;
  showCustomSound: boolean;
}
```

---

## API 整合

```typescript
// 取得自動化設定
GET /api/v1/automation/settings?account_id={id}
Response: AutomationSettings

// 更新自動化設定
PUT /api/v1/automation/settings
Request: AutomationSettings
Response: AutomationSettings

// 取得 MH 公告記錄
GET /api/v1/automation/mh-logs?account_id={id}&page={page}&limit={limit}
Response: {
  logs: MhLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

// 清除 URL 快取
DELETE /api/v1/automation/url-cache?account_id={id}
Response: { success: true }

// 上傳自訂音效
POST /api/v1/automation/custom-sounds
Request: FormData (file)
Response: CustomSound

// 刪除自訂音效
DELETE /api/v1/automation/custom-sounds/{soundId}
Response: { success: true }

// 取得自訂音效列表
GET /api/v1/automation/custom-sounds
Response: CustomSound[]

// 立即執行掃描
POST /api/v1/automation/quick-scan?account_id={id}
Response: {
  success: boolean;
  scannedAt: Date;
  results: ScanResult;
}

// Keep-alive 狀態
GET /api/v1/automation/keep-alive/status?account_id={id}
Response: {
  status: 'running' | 'stopped' | 'error';
  lastActivity?: Date;
  errorMessage?: string;
}
```

---

## i18n 支援

```typescript
// zh-TW
const zhTW = {
  automationSettings: {
    title: '自動化設定',
    subtitle: '配置遊戲自動化行為與輔助功能',
    saveAll: '儲存所有設定',

    keepAlive: {
      title: 'Keep-alive 防登出',
      description: '防止長時間不操作被系統登出',
      enable: '啟用 Keep-alive',
      interval: '模擬活動間隔',
      intervalHint: '每 {minutes} 分鐘模擬一次活動',
      intervalRecommend: '建議: 3-10 分鐘，避免過於頻繁',
      activityTypes: '活動類型',
      activities: {
        refreshOverview: '刷新村莊概覽頁面',
        checkMessages: '檢查訊息中心',
        clickFields: '隨機點擊資源田',
        checkQueue: '檢查建築佇列',
      },
      status: {
        running: '運作中',
        stopped: '已停止',
        error: '錯誤',
      },
      lastActivity: '上次活動',
    },

    popupAutoClose: {
      title: '彈窗自動關閉',
      description: '自動關閉遊戲內的各種彈窗和提示',
      enable: '啟用自動關閉彈窗',
      delay: '等待時間',
      delayHint: '彈窗出現後等待 {seconds} 秒後自動關閉',
      delayRecommend: '建議: 1-5 秒，讓用戶有時間閱讀',
      popupTypes: '關閉的彈窗類型',
      popups: {
        dailyReward: '每日登入獎勵彈窗',
        eventAnnouncement: '活動公告彈窗',
        promotion: '促銷廣告彈窗',
        achievement: '成就解鎖通知',
        maintenance: '系統維護公告 (建議保留)',
        attackWarning: '攻擊警告 (建議保留)',
      },
      closedToday: '今日已自動關閉: {count} 個彈窗',
    },

    mhAnnouncement: {
      title: 'MH 公告自動繼續',
      description: '自動點擊 Multihunter 公告的繼續按鈕',
      enable: '啟用 MH 公告自動繼續',
      delay: '等待時間',
      delayHint: 'MH 公告出現後等待 {seconds} 秒後自動繼續',
      delayRecommend: '建議: 2-5 秒，確保公告內容載入完成',
      saveHistory: '記錄 MH 公告內容供日後查閱',
      recentLogs: '最近 MH 公告',
      viewAll: '查看所有記錄',
    },

    attackAlert: {
      title: '攻擊警告音效',
      description: '當偵測到來襲攻擊時播放警告音效',
      enable: '啟用攻擊警告音效',
      sound: '警告音效',
      preview: '試聽',
      sounds: {
        alarm1: '警報音 1 (緊急)',
        alarm2: '警報音 2 (中等)',
        bell: '鈴聲提示',
        voice: '語音提示 "有攻擊來襲"',
        custom: '自訂音效...',
      },
      volume: '音量',
      triggerCondition: '觸發條件',
      conditions: {
        all: '所有攻擊',
        large: '僅大型攻擊 (> {threshold} 單位)',
        capital: '僅對主村的攻擊',
      },
      browserNotification: '同時發送瀏覽器通知',
      repeatUntilConfirmed: '重複播放直到確認',
    },

    quickScan: {
      title: '快速掃描建築',
      description: '掃描村莊建築狀態並快取結果',
      enable: '啟用快速掃描',
      interval: '掃描間隔',
      intervalHint: '每 {minutes} 分鐘自動掃描一次',
      intervalRecommend: '建議: 10-30 分鐘',
      scanTypes: '掃描範圍',
      types: {
        buildingLevel: '建築等級',
        fieldLevel: '資源田等級',
        queueStatus: '建築佇列狀態',
        troopCount: '部隊數量',
        heroStatus: '英雄狀態 (較耗時)',
      },
      lastScan: '最後掃描',
      scanNow: '立即掃描',
    },

    urlCache: {
      title: 'URL 快取',
      description: '快取常用頁面以加速載入',
      enable: '啟用 URL 快取',
      cacheTime: '快取時間',
      cacheTimeHint: '頁面快取保留 {minutes} 分鐘',
      cacheTimeRecommend: '建議: 3-10 分鐘',
      cacheTypes: '快取頁面類型',
      types: {
        overview: '村莊概覽',
        fields: '資源田頁面',
        buildings: '建築頁面',
        barracks: '兵營/馬廄訓練頁面',
        map: '地圖頁面 (資料變化快)',
        reports: '報告頁面 (資料變化快)',
      },
      cacheStatus: '快取狀態: {count} 個頁面已快取 (約 {size})',
      clearCache: '清除快取',
    },

    humanDelay: {
      title: '人性化延遲設定',
      description: '為自動化操作加入隨機延遲，模擬人工操作',
      enable: '啟用人性化延遲',
      range: '延遲範圍',
      minDelay: '最小延遲',
      maxDelay: '最大延遲',
      seconds: '秒',
      decreaseOnContinuous: '連續操作時逐漸減少延遲',
      randomPause: '隨機暫停模擬閱讀行為',
    },
  },
};

// en
const en = {
  automationSettings: {
    title: 'Automation Settings',
    subtitle: 'Configure game automation and helper functions',
    saveAll: 'Save All Settings',

    keepAlive: {
      title: 'Keep-alive Anti-Logout',
      description: 'Prevent being logged out due to inactivity',
      enable: 'Enable Keep-alive',
      interval: 'Activity Simulation Interval',
      intervalHint: 'Simulate activity every {minutes} minutes',
      intervalRecommend: 'Recommended: 3-10 minutes to avoid being too frequent',
      activityTypes: 'Activity Types',
      activities: {
        refreshOverview: 'Refresh village overview page',
        checkMessages: 'Check message center',
        clickFields: 'Randomly click resource fields',
        checkQueue: 'Check building queue',
      },
      status: {
        running: 'Running',
        stopped: 'Stopped',
        error: 'Error',
      },
      lastActivity: 'Last Activity',
    },

    popupAutoClose: {
      title: 'Auto-Close Popups',
      description: 'Automatically close various in-game popups and prompts',
      enable: 'Enable Auto-Close Popups',
      delay: 'Wait Time',
      delayHint: 'Wait {seconds} seconds after popup appears',
      delayRecommend: 'Recommended: 1-5 seconds for reading time',
      popupTypes: 'Popup Types to Close',
      popups: {
        dailyReward: 'Daily login reward popup',
        eventAnnouncement: 'Event announcement popup',
        promotion: 'Promotional ad popup',
        achievement: 'Achievement unlock notification',
        maintenance: 'System maintenance notice (recommended to keep)',
        attackWarning: 'Attack warning (recommended to keep)',
      },
      closedToday: 'Auto-closed today: {count} popups',
    },

    mhAnnouncement: {
      title: 'MH Announcement Auto-Continue',
      description: 'Automatically click continue button on Multihunter announcements',
      enable: 'Enable MH Announcement Auto-Continue',
      delay: 'Wait Time',
      delayHint: 'Wait {seconds} seconds after MH announcement appears',
      delayRecommend: 'Recommended: 2-5 seconds to ensure content loads',
      saveHistory: 'Save MH announcement history for later review',
      recentLogs: 'Recent MH Announcements',
      viewAll: 'View All Records',
    },

    attackAlert: {
      title: 'Attack Warning Sound',
      description: 'Play warning sound when incoming attack is detected',
      enable: 'Enable Attack Warning Sound',
      sound: 'Warning Sound',
      preview: 'Preview',
      sounds: {
        alarm1: 'Alarm 1 (Urgent)',
        alarm2: 'Alarm 2 (Moderate)',
        bell: 'Bell Notification',
        voice: 'Voice Alert "Incoming Attack"',
        custom: 'Custom Sound...',
      },
      volume: 'Volume',
      triggerCondition: 'Trigger Condition',
      conditions: {
        all: 'All attacks',
        large: 'Large attacks only (> {threshold} units)',
        capital: 'Capital village attacks only',
      },
      browserNotification: 'Also send browser notification',
      repeatUntilConfirmed: 'Repeat until confirmed',
    },

    quickScan: {
      title: 'Quick Building Scan',
      description: 'Scan village building status and cache results',
      enable: 'Enable Quick Scan',
      interval: 'Scan Interval',
      intervalHint: 'Auto-scan every {minutes} minutes',
      intervalRecommend: 'Recommended: 10-30 minutes',
      scanTypes: 'Scan Scope',
      types: {
        buildingLevel: 'Building levels',
        fieldLevel: 'Resource field levels',
        queueStatus: 'Building queue status',
        troopCount: 'Troop counts',
        heroStatus: 'Hero status (time-consuming)',
      },
      lastScan: 'Last Scan',
      scanNow: 'Scan Now',
    },

    urlCache: {
      title: 'URL Cache',
      description: 'Cache frequently used pages for faster loading',
      enable: 'Enable URL Cache',
      cacheTime: 'Cache Duration',
      cacheTimeHint: 'Keep page cache for {minutes} minutes',
      cacheTimeRecommend: 'Recommended: 3-10 minutes',
      cacheTypes: 'Pages to Cache',
      types: {
        overview: 'Village overview',
        fields: 'Resource fields page',
        buildings: 'Buildings page',
        barracks: 'Barracks/Stable training page',
        map: 'Map page (data changes frequently)',
        reports: 'Reports page (data changes frequently)',
      },
      cacheStatus: 'Cache Status: {count} pages cached (approx. {size})',
      clearCache: 'Clear Cache',
    },

    humanDelay: {
      title: 'Human-like Delay Settings',
      description: 'Add random delays to automation to simulate human behavior',
      enable: 'Enable Human-like Delay',
      range: 'Delay Range',
      minDelay: 'Minimum Delay',
      maxDelay: 'Maximum Delay',
      seconds: 'seconds',
      decreaseOnContinuous: 'Decrease delay on continuous operations',
      randomPause: 'Random pause to simulate reading behavior',
    },
  },
};
```

---

## 錯誤處理

```typescript
interface AutomationSettingsError {
  code: string;
  message: string;
  details?: object;
}

// 錯誤代碼
const ERROR_CODES = {
  SAVE_FAILED: 'save_failed',                     // 儲存失敗
  INVALID_INTERVAL: 'invalid_interval',           // 無效的間隔時間
  SOUND_UPLOAD_FAILED: 'sound_upload_failed',     // 音效上傳失敗
  SOUND_TOO_LARGE: 'sound_too_large',             // 音效檔案過大
  INVALID_SOUND_FORMAT: 'invalid_sound_format',   // 無效的音效格式
  SCAN_FAILED: 'scan_failed',                     // 掃描失敗
  CACHE_CLEAR_FAILED: 'cache_clear_failed',       // 清除快取失敗
  NETWORK_ERROR: 'network_error',                 // 網路錯誤
};

// 錯誤訊息顯示
const errorMessages = {
  save_failed: '儲存設定失敗，請稍後重試',
  invalid_interval: '間隔時間必須在有效範圍內',
  sound_upload_failed: '音效上傳失敗，請稍後重試',
  sound_too_large: '音效檔案超過大小限制 (最大 1 MB)',
  invalid_sound_format: '不支援的音效格式，請使用 MP3, WAV 或 OGG',
  scan_failed: '掃描失敗，請檢查遊戲連線狀態',
  cache_clear_failed: '清除快取失敗',
  network_error: '網路連線錯誤，請檢查網路後重試',
};
```

---

## 響應式設計

### Desktop (>= 1024px)
- 設定區塊完整顯示
- 滑桿有足夠空間操作
- Modal 寬度 600px

### Tablet (768px - 1023px)
- 設定區塊完整顯示
- Modal 寬度 90%

### Mobile (< 768px)
- 設定區塊垂直堆疊
- 滑桿改為數字輸入 + 步進按鈕
- Modal 全螢幕
- 多選項改為可展開列表
