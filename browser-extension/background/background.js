/**
 * Travian Tools - Background Service Worker
 *
 * 擴充沒有計時器、輪詢或自行發出的請求，背景程式只回應工具網站傳來的訊息。
 *
 * 這裡只處理工具網站的訊息：收下登入憑證（有到期時間）、網站切換帳號時
 * 更新「存到」的預設值（不換 token），或在網站登出時清掉憑證。
 * 上傳由 popup 在使用者按「上傳這一頁」時自己送出；這個檔案不呼叫
 * 任何 API、不讀任何分頁（合規測試會檢查）。
 */

import { TRUSTED_SITE_ORIGINS } from '../lib/config.js';
import {
  SITE_MESSAGE,
  clearCredential,
  isTrustedSender,
  saveCredential,
  saveSelectedAccount,
} from '../lib/credential.js';

const storage = chrome.storage.local;

async function handleSiteMessage(request) {
  switch (request?.type) {
    case SITE_MESSAGE.PING:
      return { success: true };
    case SITE_MESSAGE.SET: {
      const credential = await saveCredential(storage, request);
      return credential
        ? { success: true, expires_at: credential.expires_at }
        : { success: false, error: 'Invalid or expired credential' };
    }
    case SITE_MESSAGE.SELECT: {
      // 只改「存到」的預設值；token 和帳號清單不動
      const credential = await saveSelectedAccount(storage, request.selected_account_id);
      return credential
        ? { success: true, selected_account_id: credential.selected_account_id }
        : { success: false, error: 'Not signed in' };
    }
    case SITE_MESSAGE.CLEAR:
      await clearCredential(storage);
      return { success: true };
    default:
      return { success: false, error: 'Unknown message' };
  }
}

/**
 * 工具網站透過 externally_connectable 傳來的訊息。
 * manifest 只允許工具網站連進來；這裡再檢查一次 sender 的 origin。
 */
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (!isTrustedSender(sender, TRUSTED_SITE_ORIGINS)) {
    sendResponse({ success: false, error: 'Untrusted sender' });
    return false;
  }
  handleSiteMessage(request)
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true; // 非同步回覆
});
