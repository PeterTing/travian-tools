/**
 * 擴充設定（popup 與 background 共用）。
 *
 * TRUSTED_SITE_ORIGINS 必須和 manifest.json 的
 * externally_connectable.matches 一致（測試會檢查）。
 * 正式網域在 P0-12（Cloud Run 部署）定案後再加入兩邊。
 */
export const API_BASE_URL = 'http://localhost:8000/api/v1';

/** 「在工具網站登入」要開的網址。 */
export const TOOL_SITE_URL = 'http://localhost:5174';

/** 工具網站「新增帳號或世界」的頁面（「請先在工具網站新增遊戲帳號」連到這裡）。 */
export const ADD_ACCOUNT_PATH = '/game-accounts/new';

/** 只有這些網站可以把登入憑證交給擴充。 */
export const TRUSTED_SITE_ORIGINS = Object.freeze([
  'http://localhost:5173',
  'http://localhost:5174',
]);
