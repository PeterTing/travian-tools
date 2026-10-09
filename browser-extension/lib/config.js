/**
 * 擴充設定（popup 與 background 共用）。
 *
 * TRUSTED_SITE_ORIGINS 必須和 manifest.json 的
 * externally_connectable.matches 一致（測試會檢查）。
 * P0-12：指向 Cloud Run 上的正式後端與工具網站（不再接受 localhost）。
 * 工具網站有兩個網址：run.app 原網址與自訂網域 tr.tingcloud.tw，兩個都能交憑證。
 */
export const API_BASE_URL = 'https://tt-api-138672009807.asia-east1.run.app/api/v1';

/** 「在工具網站登入」要開的網址。 */
export const TOOL_SITE_URL = 'https://tt-web-138672009807.asia-east1.run.app';

/** 工具網站「新增帳號或世界」的頁面（「請先在工具網站新增遊戲帳號」連到這裡）。 */
export const ADD_ACCOUNT_PATH = '/game-accounts/new';

/** 只有這些網站可以把登入憑證交給擴充。 */
export const TRUSTED_SITE_ORIGINS = Object.freeze([
  'https://tt-web-138672009807.asia-east1.run.app',
  'https://tr.tingcloud.tw',
]);
