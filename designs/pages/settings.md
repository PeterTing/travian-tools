# 系統設定頁面

> 路由: `/settings`

## 相關 Tickets

- TICKET-504: 系統設定功能

---

## 頁面結構

```
┌─────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: 首頁 > 設定                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  系統設定                                                            │
│  管理應用程式設定與偏好                                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Tab: [一般] [遊戲帳號] [外觀] [通知] [關於]                         │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  一般設定                                                            │
│                                                                     │
│  ┌─ 版本更新 ─────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  當前版本: v1.2.3                                            │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  [ ✓ ] 自動檢查更新                                    │ │  │
│  │  │        每次啟動時檢查是否有新版本                      │ │  │
│  │  │                                                        │ │  │
│  │  │  更新頻道                                              │ │  │
│  │  │  (●) 穩定版 (推薦)                                     │ │  │
│  │  │  ( ) Beta 測試版                                       │ │  │
│  │  │  ( ) Alpha 開發版                                      │ │  │
│  │  │                                                        │ │  │
│  │  │  最後檢查: 2026-01-31 14:30                            │ │  │
│  │  │  狀態: ✅ 已是最新版本                                 │ │  │
│  │  │                                                        │ │  │
│  │  │  [🔄 檢查更新]                                         │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 自訂 Travian 網址 ────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  設定自訂的 Travian 伺服器網址                               │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  [ ✓ ] 使用自訂伺服器列表                              │ │  │
│  │  │                                                        │ │  │
│  │  │  自訂伺服器網址                                        │ │  │
│  │  │  ┌──────────────────────────────────────────────────┐ │ │  │
│  │  │  │ ts1.travian.com                          [🗑️]   │ │ │  │
│  │  │  │ ts2.travian.com                          [🗑️]   │ │ │  │
│  │  │  │ ts5.travian.com                          [🗑️]   │ │ │  │
│  │  │  │ tw1.travian.com                          [🗑️]   │ │ │  │
│  │  │  │ ──────────────────────────────────────────────── │ │ │  │
│  │  │  │ [新增伺服器...]                                   │ │ │  │
│  │  │  └──────────────────────────────────────────────────┘ │ │  │
│  │  │                                                        │ │  │
│  │  │  ⚠️ 注意: 僅支援 Travian: Legends 官方伺服器            │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 語言設定 ─────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  選擇介面語言                                                │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  介面語言                                              │ │  │
│  │  │  ┌──────────────────────────────────────────────────┐ │ │  │
│  │  │  │  [繁體中文                                   ▼]  │ │ │  │
│  │  │  └──────────────────────────────────────────────────┘ │ │  │
│  │  │                                                        │ │  │
│  │  │  可用語言:                                             │ │  │
│  │  │  • 繁體中文 (Traditional Chinese)                      │ │  │
│  │  │  • English                                            │ │  │
│  │  │  • 简体中文 (Simplified Chinese)                       │ │  │
│  │  │                                                        │ │  │
│  │  │  [ ] 自動偵測瀏覽器語言                                │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 資料管理 ─────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  管理本機儲存的資料                                          │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  本機快取                                              │ │  │
│  │  │  使用空間: 15.2 MB                                     │ │  │
│  │  │  [🗑️ 清除快取]                                        │ │  │
│  │  │                                                        │ │  │
│  │  │  ─────────────────────────────────────────────────    │ │  │
│  │  │                                                        │ │  │
│  │  │  匯出資料                                              │ │  │
│  │  │  將所有設定和遊戲資料匯出為 JSON 檔案                  │ │  │
│  │  │  [📤 匯出資料]                                         │ │  │
│  │  │                                                        │ │  │
│  │  │  ─────────────────────────────────────────────────    │ │  │
│  │  │                                                        │ │  │
│  │  │  匯入資料                                              │ │  │
│  │  │  從 JSON 檔案匯入設定和資料                            │ │  │
│  │  │  [📥 匯入資料]                                         │ │  │
│  │  │                                                        │ │  │
│  │  │  ─────────────────────────────────────────────────    │ │  │
│  │  │                                                        │ │  │
│  │  │  重設所有設定                                          │ │  │
│  │  │  ⚠️ 此操作將重設所有設定為預設值，資料不會被刪除       │ │  │
│  │  │  [🔄 重設設定]                                         │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [儲存設定]                                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 外觀設定 Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  外觀設定                                                            │
│                                                                     │
│  ┌─ 主題 ─────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  選擇介面主題                                                │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐          │ │  │
│  │  │  │  ☀️ 淺色  │  │  🌙 深色  │  │  💻 系統  │          │ │  │
│  │  │  │           │  │           │  │           │          │ │  │
│  │  │  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌───────┐ │          │ │  │
│  │  │  │ │  ▓▓▓  │ │  │ │  ░░░  │ │  │ │  ▒▒▒  │ │          │ │  │
│  │  │  │ │  ▓▓▓  │ │  │ │  ░░░  │ │  │ │  ▒▒▒  │ │          │ │  │
│  │  │  │ └───────┘ │  │ └───────┘ │  │ └───────┘ │          │ │  │
│  │  │  │           │  │           │  │           │          │ │  │
│  │  │  │    ●      │  │    ○      │  │    ○      │          │ │  │
│  │  │  └───────────┘  └───────────┘  └───────────┘          │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 強調色 ───────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  選擇介面強調色                                              │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  [🟠] [🔵] [🟢] [🟣] [🔴] [🟡]                          │ │  │
│  │  │                                                        │ │  │
│  │  │  當前: 橙色 (Travian 預設)                             │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 字型大小 ─────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  調整介面字型大小                                            │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  A─────────────────●─────────────────A                 │ │  │
│  │  │  小              預設              大                   │ │  │
│  │  │                                                        │ │  │
│  │  │  預覽: 這是範例文字                                    │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Sidebar ──────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  側邊欄設定                                                  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  [ ✓ ] 預設展開側邊欄                                  │ │  │
│  │  │  [ ✓ ] 顯示選單項目文字標籤                            │ │  │
│  │  │  [ ] 緊湊模式                                          │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 通知設定 Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  通知設定                                                            │
│                                                                     │
│  ┌─ 瀏覽器通知 ───────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  設定瀏覽器推播通知                                          │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  通知權限狀態: ✅ 已授權                               │ │  │
│  │  │  [重新請求權限]                                        │ │  │
│  │  │                                                        │ │  │
│  │  │  ─────────────────────────────────────────────────    │ │  │
│  │  │                                                        │ │  │
│  │  │  通知類型                                              │ │  │
│  │  │  [ ✓ ] 攻擊警告                                       │ │  │
│  │  │  [ ✓ ] 建築完成                                       │ │  │
│  │  │  [ ✓ ] 訓練完成                                       │ │  │
│  │  │  [ ] 資源滿倉警告                                     │ │  │
│  │  │  [ ] 提醒事項                                         │ │  │
│  │  │  [ ✓ ] 系統更新                                       │ │  │
│  │  │                                                        │ │  │
│  │  │  [🔔 發送測試通知]                                     │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 音效 ─────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  設定通知音效                                                │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  [ ✓ ] 啟用通知音效                                    │ │  │
│  │  │                                                        │ │  │
│  │  │  音量                                                  │ │  │
│  │  │  ○───────────────●───────────○                         │ │  │
│  │  │  靜音          70%          最大                        │ │  │
│  │  │                                                        │ │  │
│  │  │  [ ] 勿擾時段                                          │ │  │
│  │  │      從 [22:00] 至 [08:00] 不播放音效                  │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Email 通知 ───────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  設定 Email 通知 (需登入)                                    │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  [ ] 啟用 Email 通知                                   │ │  │
│  │  │                                                        │ │  │
│  │  │  通知 Email                                            │ │  │
│  │  │  ┌──────────────────────────────────────────────────┐ │ │  │
│  │  │  │ user@example.com                                  │ │ │  │
│  │  │  └──────────────────────────────────────────────────┘ │ │  │
│  │  │                                                        │ │  │
│  │  │  僅發送以下通知                                        │ │  │
│  │  │  [ ✓ ] 重要攻擊警告                                   │ │  │
│  │  │  [ ] 每日摘要報告                                     │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 關於 Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  關於                                                                │
│                                                                     │
│  ┌─ 應用程式資訊 ─────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │         ╔═══════════════════════════════════╗          │ │  │
│  │  │         ║                                   ║          │ │  │
│  │  │         ║    🏛️ Travian Tools              ║          │ │  │
│  │  │         ║                                   ║          │ │  │
│  │  │         ║    版本: v1.2.3                   ║          │ │  │
│  │  │         ║    建置日期: 2026-01-30           ║          │ │  │
│  │  │         ║                                   ║          │ │  │
│  │  │         ╚═══════════════════════════════════╝          │ │  │
│  │  │                                                        │ │  │
│  │  │  Travian: Legends 遊戲輔助工具                         │ │  │
│  │  │                                                        │ │  │
│  │  │  功能特色:                                             │ │  │
│  │  │  • 資料庫查詢 (建築、兵種、資源)                       │ │  │
│  │  │  • 多種遊戲計算機                                      │ │  │
│  │  │  • AI 策略顧問                                         │ │  │
│  │  │  • 村莊管理與自動化                                    │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 更新日誌 ─────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  v1.2.3 (2026-01-30)                                   │ │  │
│  │  │  • 新增資源運送管理功能                                │ │  │
│  │  │  • 新增自動升級管理功能                                │ │  │
│  │  │  • 修復 AI 顧問回應延遲問題                            │ │  │
│  │  │                                                        │ │  │
│  │  │  v1.2.2 (2026-01-25)                                   │ │  │
│  │  │  • 改善建築計算機精確度                                │ │  │
│  │  │  • 新增羅馬雙建築支援                                  │ │  │
│  │  │  • 修復村莊同步問題                                    │ │  │
│  │  │                                                        │ │  │
│  │  │  v1.2.1 (2026-01-20)                                   │ │  │
│  │  │  • 新增攻擊警告音效                                    │ │  │
│  │  │  • 改善響應式設計                                      │ │  │
│  │  │  • 效能最佳化                                          │ │  │
│  │  │                                                        │ │  │
│  │  │  [查看完整更新日誌]                                    │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 開發者資訊 ───────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  GitHub: https://github.com/user/travian-tools         │ │  │
│  │  │  回報問題: https://github.com/user/travian-tools/issues│ │  │
│  │  │                                                        │ │  │
│  │  │  [⭐ GitHub Star]  [🐛 回報問題]  [💬 討論區]          │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 法律聲明 ─────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │                                                        │ │  │
│  │  │  ⚠️ 免責聲明                                           │ │  │
│  │  │                                                        │ │  │
│  │  │  本工具為非官方輔助工具，與 Travian Games GmbH         │ │  │
│  │  │  無任何關聯。使用本工具所產生的任何後果，開發者不      │ │  │
│  │  │  承擔任何責任。                                        │ │  │
│  │  │                                                        │ │  │
│  │  │  請遵守遊戲規則，合理使用本工具。                      │ │  │
│  │  │                                                        │ │  │
│  │  │  [隱私權政策]  [使用條款]                              │ │  │
│  │  │                                                        │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 新增伺服器 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  新增自訂伺服器                                                [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  伺服器網址                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ https://                                                       ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  範例: ts1.travian.com, tw1.travian.com                            │
│                                                                     │
│  ⚠️ 注意:                                                           │
│  • 僅支援 Travian: Legends 官方伺服器                              │
│  • 請輸入完整的伺服器域名                                          │
│  • 不需要包含 https:// 前綴                                        │
│                                                                     │
│  [驗證伺服器] → ✅ 伺服器有效                                      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                        [取消]  [新增]               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 更新可用 Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  🎉 發現新版本!                                                [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  新版本 v1.3.0 已可用                                               │
│                                                                     │
│  當前版本: v1.2.3                                                   │
│  新版本: v1.3.0                                                     │
│                                                                     │
│  ┌─ 更新內容 ─────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  新功能:                                                     ││
│  │  • 全新的資源運送自動化系統                                  ││
│  │  • 支援羅馬雙建築自動升級                                    ││
│  │  • 新增 MH 公告自動繼續功能                                  ││
│  │                                                              ││
│  │  改進:                                                       ││
│  │  • 大幅提升 AI 顧問回應速度                                  ││
│  │  • 改善村莊同步穩定性                                        ││
│  │                                                              ││
│  │  修復:                                                       ││
│  │  • 修復建築計算機在特定情況下的計算錯誤                      ││
│  │  • 修復深色模式下的顯示問題                                  ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                     │
│  [ ] 下次啟動時提醒                                                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                              [稍後再說]  [立即更新]                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 元件規格

### SettingsPage

```typescript
interface SettingsPageProps {
  initialTab?: SettingsTab;
}

type SettingsTab = 'general' | 'game-accounts' | 'appearance' | 'notifications' | 'about';
```

### VersionUpdateSection

```typescript
interface VersionUpdateSectionProps {
  currentVersion: string;
  onCheckUpdate: () => Promise<UpdateCheckResult>;
  isChecking: boolean;
}

interface UpdateCheckResult {
  updateAvailable: boolean;
  latestVersion?: string;
  releaseNotes?: string[];
  downloadUrl?: string;
}
```

### ServerListManager

```typescript
interface ServerListManagerProps {
  servers: string[];
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onAdd: (server: string) => Promise<void>;
  onRemove: (server: string) => void;
  onValidate: (server: string) => Promise<boolean>;
}
```

### ThemeSelector

```typescript
interface ThemeSelectorProps {
  theme: 'light' | 'dark' | 'system';
  onChange: (theme: 'light' | 'dark' | 'system') => void;
}
```

### AccentColorSelector

```typescript
interface AccentColorSelectorProps {
  color: string;
  onChange: (color: string) => void;
  colors: { value: string; label: string }[];
}
```

### FontSizeSlider

```typescript
interface FontSizeSliderProps {
  size: 'small' | 'default' | 'large';
  onChange: (size: 'small' | 'default' | 'large') => void;
}
```

### NotificationSettings

```typescript
interface NotificationSettingsProps {
  permission: NotificationPermission;
  settings: NotificationPreferences;
  onRequestPermission: () => Promise<void>;
  onChange: (settings: NotificationPreferences) => void;
  onTestNotification: () => void;
}

interface NotificationPreferences {
  attackWarning: boolean;
  buildComplete: boolean;
  trainComplete: boolean;
  resourceFull: boolean;
  reminders: boolean;
  systemUpdates: boolean;
}
```

### DataManagement

```typescript
interface DataManagementProps {
  cacheSize: number;
  onClearCache: () => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onReset: () => Promise<void>;
}
```

### UpdateAvailableModal

```typescript
interface UpdateAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  newVersion: string;
  releaseNotes: ReleaseNote[];
  onUpdate: () => void;
  onRemindLater: () => void;
}

interface ReleaseNote {
  type: 'feature' | 'improvement' | 'bugfix';
  content: string;
}
```

---

## 狀態管理

```typescript
interface SettingsPageState {
  // 基本狀態
  activeTab: SettingsTab;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;

  // 一般設定
  general: {
    autoCheckUpdate: boolean;
    updateChannel: 'stable' | 'beta' | 'alpha';
    lastUpdateCheck?: Date;
    updateStatus: 'up-to-date' | 'available' | 'checking' | 'error';
    latestVersion?: string;
    customServers: string[];
    useCustomServers: boolean;
    language: string;
    autoDetectLanguage: boolean;
  };

  // 外觀設定
  appearance: {
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    fontSize: 'small' | 'default' | 'large';
    sidebarExpanded: boolean;
    sidebarShowLabels: boolean;
    sidebarCompact: boolean;
  };

  // 通知設定
  notifications: {
    permission: NotificationPermission;
    types: NotificationPreferences;
    soundEnabled: boolean;
    soundVolume: number;
    doNotDisturb: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
    emailEnabled: boolean;
    emailAddress: string;
    emailTypes: {
      attackWarning: boolean;
      dailySummary: boolean;
    };
  };

  // 資料管理
  data: {
    cacheSize: number;
  };

  // Modal 狀態
  showUpdateModal: boolean;
  showAddServerModal: boolean;
}
```

---

## API 整合

```typescript
// 取得系統設定
GET /api/v1/settings
Response: SystemSettings

// 更新系統設定
PUT /api/v1/settings
Request: Partial<SystemSettings>
Response: SystemSettings

// 檢查更新
GET /api/v1/settings/check-update
Response: UpdateCheckResult

// 驗證伺服器
POST /api/v1/settings/validate-server
Request: { server: string }
Response: { valid: boolean; name?: string }

// 清除快取
DELETE /api/v1/settings/cache
Response: { success: true; freedSpace: number }

// 匯出資料
GET /api/v1/settings/export
Response: Blob (JSON file)

// 匯入資料
POST /api/v1/settings/import
Request: FormData (JSON file)
Response: { success: true; imported: ImportSummary }

// 重設設定
POST /api/v1/settings/reset
Response: SystemSettings

// 請求通知權限
POST /api/v1/settings/notifications/request-permission
Response: { permission: NotificationPermission }

// 發送測試通知
POST /api/v1/settings/notifications/test
Response: { success: true }

// 取得更新日誌
GET /api/v1/settings/changelog
Response: ChangelogEntry[]
```

---

## i18n 支援

```typescript
// zh-TW
const zhTW = {
  settings: {
    title: '系統設定',
    subtitle: '管理應用程式設定與偏好',
    save: '儲存設定',

    tabs: {
      general: '一般',
      gameAccounts: '遊戲帳號',
      appearance: '外觀',
      notifications: '通知',
      about: '關於',
    },

    general: {
      version: {
        title: '版本更新',
        currentVersion: '當前版本',
        autoCheck: '自動檢查更新',
        autoCheckDesc: '每次啟動時檢查是否有新版本',
        channel: '更新頻道',
        channels: {
          stable: '穩定版 (推薦)',
          beta: 'Beta 測試版',
          alpha: 'Alpha 開發版',
        },
        lastCheck: '最後檢查',
        status: {
          upToDate: '已是最新版本',
          available: '有新版本可用',
          checking: '檢查中...',
          error: '檢查失敗',
        },
        checkNow: '檢查更新',
      },

      customServer: {
        title: '自訂 Travian 網址',
        description: '設定自訂的 Travian 伺服器網址',
        enable: '使用自訂伺服器列表',
        addServer: '新增伺服器...',
        warning: '注意: 僅支援 Travian: Legends 官方伺服器',
      },

      language: {
        title: '語言設定',
        description: '選擇介面語言',
        selectLanguage: '介面語言',
        autoDetect: '自動偵測瀏覽器語言',
      },

      data: {
        title: '資料管理',
        description: '管理本機儲存的資料',
        cache: '本機快取',
        cacheSize: '使用空間',
        clearCache: '清除快取',
        export: '匯出資料',
        exportDesc: '將所有設定和遊戲資料匯出為 JSON 檔案',
        import: '匯入資料',
        importDesc: '從 JSON 檔案匯入設定和資料',
        reset: '重設所有設定',
        resetWarning: '此操作將重設所有設定為預設值，資料不會被刪除',
      },
    },

    appearance: {
      theme: {
        title: '主題',
        description: '選擇介面主題',
        light: '淺色',
        dark: '深色',
        system: '系統',
      },

      accentColor: {
        title: '強調色',
        description: '選擇介面強調色',
        current: '當前',
        default: 'Travian 預設',
      },

      fontSize: {
        title: '字型大小',
        description: '調整介面字型大小',
        small: '小',
        default: '預設',
        large: '大',
        preview: '預覽',
      },

      sidebar: {
        title: 'Sidebar',
        description: '側邊欄設定',
        defaultExpanded: '預設展開側邊欄',
        showLabels: '顯示選單項目文字標籤',
        compact: '緊湊模式',
      },
    },

    notifications: {
      browser: {
        title: '瀏覽器通知',
        description: '設定瀏覽器推播通知',
        permissionStatus: '通知權限狀態',
        granted: '已授權',
        denied: '已拒絕',
        default: '未設定',
        requestPermission: '重新請求權限',
        types: '通知類型',
        attackWarning: '攻擊警告',
        buildComplete: '建築完成',
        trainComplete: '訓練完成',
        resourceFull: '資源滿倉警告',
        reminders: '提醒事項',
        systemUpdates: '系統更新',
        testNotification: '發送測試通知',
      },

      sound: {
        title: '音效',
        description: '設定通知音效',
        enable: '啟用通知音效',
        volume: '音量',
        doNotDisturb: '勿擾時段',
        doNotDisturbDesc: '從 {start} 至 {end} 不播放音效',
      },

      email: {
        title: 'Email 通知',
        description: '設定 Email 通知 (需登入)',
        enable: '啟用 Email 通知',
        address: '通知 Email',
        types: '僅發送以下通知',
        attackWarning: '重要攻擊警告',
        dailySummary: '每日摘要報告',
      },
    },

    about: {
      appInfo: {
        title: '應用程式資訊',
        version: '版本',
        buildDate: '建置日期',
        description: 'Travian: Legends 遊戲輔助工具',
        features: '功能特色',
      },

      changelog: {
        title: '更新日誌',
        viewAll: '查看完整更新日誌',
      },

      developer: {
        title: '開發者資訊',
        github: 'GitHub',
        issues: '回報問題',
        star: 'GitHub Star',
        reportBug: '回報問題',
        discussions: '討論區',
      },

      legal: {
        title: '法律聲明',
        disclaimer: '免責聲明',
        disclaimerText: '本工具為非官方輔助工具，與 Travian Games GmbH 無任何關聯。使用本工具所產生的任何後果，開發者不承擔任何責任。',
        useResponsibly: '請遵守遊戲規則，合理使用本工具。',
        privacyPolicy: '隱私權政策',
        termsOfService: '使用條款',
      },
    },
  },
};

// en
const en = {
  settings: {
    title: 'System Settings',
    subtitle: 'Manage application settings and preferences',
    save: 'Save Settings',

    tabs: {
      general: 'General',
      gameAccounts: 'Game Accounts',
      appearance: 'Appearance',
      notifications: 'Notifications',
      about: 'About',
    },

    general: {
      version: {
        title: 'Version Update',
        currentVersion: 'Current Version',
        autoCheck: 'Auto-check for updates',
        autoCheckDesc: 'Check for new versions on startup',
        channel: 'Update Channel',
        channels: {
          stable: 'Stable (Recommended)',
          beta: 'Beta',
          alpha: 'Alpha',
        },
        lastCheck: 'Last Check',
        status: {
          upToDate: 'Up to date',
          available: 'Update available',
          checking: 'Checking...',
          error: 'Check failed',
        },
        checkNow: 'Check for Updates',
      },

      customServer: {
        title: 'Custom Travian URLs',
        description: 'Configure custom Travian server URLs',
        enable: 'Use custom server list',
        addServer: 'Add server...',
        warning: 'Note: Only official Travian: Legends servers are supported',
      },

      language: {
        title: 'Language Settings',
        description: 'Select interface language',
        selectLanguage: 'Interface Language',
        autoDetect: 'Auto-detect browser language',
      },

      data: {
        title: 'Data Management',
        description: 'Manage locally stored data',
        cache: 'Local Cache',
        cacheSize: 'Used Space',
        clearCache: 'Clear Cache',
        export: 'Export Data',
        exportDesc: 'Export all settings and game data as JSON file',
        import: 'Import Data',
        importDesc: 'Import settings and data from JSON file',
        reset: 'Reset All Settings',
        resetWarning: 'This will reset all settings to default values. Data will not be deleted.',
      },
    },

    appearance: {
      theme: {
        title: 'Theme',
        description: 'Select interface theme',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
      },

      accentColor: {
        title: 'Accent Color',
        description: 'Select interface accent color',
        current: 'Current',
        default: 'Travian Default',
      },

      fontSize: {
        title: 'Font Size',
        description: 'Adjust interface font size',
        small: 'Small',
        default: 'Default',
        large: 'Large',
        preview: 'Preview',
      },

      sidebar: {
        title: 'Sidebar',
        description: 'Sidebar settings',
        defaultExpanded: 'Default expanded sidebar',
        showLabels: 'Show menu item labels',
        compact: 'Compact mode',
      },
    },

    notifications: {
      browser: {
        title: 'Browser Notifications',
        description: 'Configure browser push notifications',
        permissionStatus: 'Notification Permission Status',
        granted: 'Granted',
        denied: 'Denied',
        default: 'Not set',
        requestPermission: 'Request Permission',
        types: 'Notification Types',
        attackWarning: 'Attack Warning',
        buildComplete: 'Build Complete',
        trainComplete: 'Training Complete',
        resourceFull: 'Resource Full Warning',
        reminders: 'Reminders',
        systemUpdates: 'System Updates',
        testNotification: 'Send Test Notification',
      },

      sound: {
        title: 'Sound',
        description: 'Configure notification sounds',
        enable: 'Enable notification sounds',
        volume: 'Volume',
        doNotDisturb: 'Do Not Disturb',
        doNotDisturbDesc: 'Mute sounds from {start} to {end}',
      },

      email: {
        title: 'Email Notifications',
        description: 'Configure email notifications (requires login)',
        enable: 'Enable email notifications',
        address: 'Notification Email',
        types: 'Only send these notifications',
        attackWarning: 'Critical attack warnings',
        dailySummary: 'Daily summary report',
      },
    },

    about: {
      appInfo: {
        title: 'Application Info',
        version: 'Version',
        buildDate: 'Build Date',
        description: 'Travian: Legends Game Assistant Tool',
        features: 'Features',
      },

      changelog: {
        title: 'Changelog',
        viewAll: 'View Full Changelog',
      },

      developer: {
        title: 'Developer Info',
        github: 'GitHub',
        issues: 'Report Issues',
        star: 'GitHub Star',
        reportBug: 'Report Bug',
        discussions: 'Discussions',
      },

      legal: {
        title: 'Legal Notice',
        disclaimer: 'Disclaimer',
        disclaimerText: 'This tool is an unofficial assistant tool and is not affiliated with Travian Games GmbH. The developer assumes no responsibility for any consequences arising from the use of this tool.',
        useResponsibly: 'Please follow game rules and use this tool responsibly.',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',
      },
    },
  },
};
```

---

## 錯誤處理

```typescript
interface SettingsError {
  code: string;
  message: string;
  details?: object;
}

// 錯誤代碼
const ERROR_CODES = {
  SAVE_FAILED: 'save_failed',                     // 儲存失敗
  UPDATE_CHECK_FAILED: 'update_check_failed',     // 更新檢查失敗
  INVALID_SERVER: 'invalid_server',               // 無效的伺服器
  IMPORT_FAILED: 'import_failed',                 // 匯入失敗
  EXPORT_FAILED: 'export_failed',                 // 匯出失敗
  CACHE_CLEAR_FAILED: 'cache_clear_failed',       // 清除快取失敗
  RESET_FAILED: 'reset_failed',                   // 重設失敗
  PERMISSION_DENIED: 'permission_denied',         // 權限被拒
  NETWORK_ERROR: 'network_error',                 // 網路錯誤
};

// 錯誤訊息顯示
const errorMessages = {
  save_failed: '儲存設定失敗，請稍後重試',
  update_check_failed: '檢查更新失敗，請檢查網路連線',
  invalid_server: '無效的伺服器網址，請確認輸入正確',
  import_failed: '匯入資料失敗，請確認檔案格式正確',
  export_failed: '匯出資料失敗，請稍後重試',
  cache_clear_failed: '清除快取失敗，請稍後重試',
  reset_failed: '重設設定失敗，請稍後重試',
  permission_denied: '通知權限被拒絕，請在瀏覽器設定中開啟',
  network_error: '網路連線錯誤，請檢查網路後重試',
};
```

---

## 響應式設計

### Desktop (>= 1024px)
- Tab 水平排列
- 設定區塊完整顯示
- 主題選擇器水平排列
- Modal 寬度 500px

### Tablet (768px - 1023px)
- Tab 水平排列 (可滑動)
- 設定區塊完整顯示
- Modal 寬度 90%

### Mobile (< 768px)
- Tab 改為下拉選單或垂直列表
- 設定區塊垂直堆疊
- Modal 全螢幕
- 主題選擇器改為垂直堆疊
- 強調色選擇器改為兩行
