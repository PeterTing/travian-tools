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

1. 安裝擴展後，登入 Travian 遊戲
2. 點擊瀏覽器工具列中的 Travian Tools 圖示
3. 使用 Travian Tools 帳號登入
4. 選擇要同步的遊戲帳號
5. 在村莊頁面點擊「同步當前頁面」按鈕

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
