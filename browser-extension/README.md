# Travian Tools Browser Extension

瀏覽器擴展，用於從 Travian: Legends 遊戲頁面同步數據到 Travian Tools 系統。

## 功能

- 只在你點擊時讀取「目前分頁」：點開工具列圖示（activeTab）後按「同步當前頁面」
- 沒有背景自動同步、計時器、輪詢，也不會讀取其他分頁或對 Travian 發出任何請求
  （由 `backend/tests/unit/test_compliance.py` 在 CI 中檢查）
- 支援村莊總覽 (dorf1.php) 和村莊中心 (dorf2.php) 頁面
- 與 Travian Tools 後端 API 整合

## 安裝方式

### Chrome / Edge

1. 開啟瀏覽器，前往 `chrome://extensions/` (Chrome) 或 `edge://extensions/` (Edge)
2. 開啟「開發者模式」
3. 點擊「載入未封裝項目」
4. 選擇此 `browser-extension` 資料夾

### Firefox

1. 開啟 Firefox，前往 `about:debugging#/runtime/this-firefox`
2. 點擊「載入臨時附加元件」
3. 選擇此資料夾中的 `manifest.json` 檔案

## 使用方式

1. 安裝擴展後，到 `chrome://extensions/` 複製擴充 ID，設定到網站的 `VITE_EXTENSION_ID`（`.env`），重開前端
2. 點擊瀏覽器工具列中的 Travian Tools 圖示
3. 沒登入時 popup 只有一顆「在工具網站登入」，會開新分頁到工具網站；在網站登入後，網站會把有到期時間的登入憑證交給擴充（popup 裡沒有任何輸入框，也不會問遊戲密碼）
4. 回到遊戲分頁，再點一次圖示，選擇要存到哪個遊戲帳號
5. 按「上傳這一頁」；不會自動上傳其他頁面

### 登入憑證

- 由工具網站在登入時（以及每次打開網站時）呼叫 `POST /api/v1/auth/extension-token` 換發，預設 8 小時到期（後端 `JWT_EXTENSION_TOKEN_EXPIRE_MINUTES`）
- 只有 `manifest.json` 的 `externally_connectable.matches` 列出的網站能交憑證；background 還會再檢查一次來源（`lib/config.js` 的 `TRUSTED_SITE_ORIGINS`，兩邊要一致）
- 過期就視為登出，讀取時自動清掉；擴充「登出擴充」與網站登出都會清掉
- 正式網域在 P0-12 部署定案後，加到 `externally_connectable.matches` 與 `TRUSTED_SITE_ORIGINS`

### 測試

```bash
cd browser-extension && node --test tests/
```

## 開發

### 目錄結構

```
browser-extension/
├── manifest.json          # 擴展設定檔
├── icons/                 # 擴展圖示
├── background/            # 背景服務腳本（只負責呼叫 Travian Tools API）
│   └── background.js
├── content/               # 內容腳本（點擊時才注入目前分頁）
│   └── content.js
├── lib/                   # 共用設定與登入憑證邏輯（純函式，有測試）
│   ├── config.js
│   └── credential.js
├── tests/                 # node --test
├── popup/                 # 彈出視窗 UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── README.md
```

### 圖示

需要準備以下尺寸的圖示：
- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

可使用任何圖示生成工具建立，或暫時使用佔位圖片。

## 注意事項

- 此擴展僅供個人使用
- 請遵守 Travian 遊戲使用條款
- 不支援自動化操作，僅提供手動同步功能
