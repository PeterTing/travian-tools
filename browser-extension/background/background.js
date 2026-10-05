/**
 * Travian Tools - Background Service Worker
 * 只處理 API 通訊與登入狀態。登入憑證由工具網站交過來（有到期時間），
 * 擴充自己不收帳號密碼。
 *
 * 合規：沒有任何計時器、alarm 或背景輪詢；只有使用者在 popup 點擊
 * 「同步當前頁面」時，才會讀取「目前分頁」並送到 Travian Tools 後端。
 * 擴充功能本身不會對 Travian 發出任何請求。
 */

import { API_BASE_URL, TRUSTED_SITE_ORIGINS } from '../lib/config.js';
import {
  SITE_MESSAGE,
  clearCredential,
  isTrustedSender,
  loadCredential,
  saveCredential,
} from '../lib/credential.js';

const DEBUG = false;

const log = (...args) => {
  if (DEBUG) {
    console.log('[Travian Tools BG]', ...args);
  }
};

const storage = chrome.storage.local;

/**
 * API 請求封裝
 */
async function apiRequest(endpoint, options = {}) {
  const credential = await loadCredential(storage);
  if (!credential) {
    throw new Error('尚未登入，請在工具網站登入');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  headers['Authorization'] = `Bearer ${credential.access_token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.detail || error.message || errorMessage;
    } catch {
      try {
        errorMessage = await response.text() || errorMessage;
      } catch {
        // 忽略
      }
    }

    if (response.status === 401) {
      await clearCredential(storage);
      throw new Error('登入已過期，請在工具網站重新登入');
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 同步村莊總覽數據
 */
async function syncVillageOverview(accountId, data) {
  return apiRequest('/sync/village-overview', {
    method: 'POST',
    body: JSON.stringify({
      account_id: accountId,
      village_id: data.village_id,
      village_name: data.village_name,
      coordinate_x: data.coordinate_x,
      coordinate_y: data.coordinate_y,
      population: data.population || 0,
      is_capital: data.is_capital || false,
      village_type: data.village_type || null,
      capital_village_id: data.capital_village_id || null,
      resources: data.resources,
      production: data.production,
      resource_fields: data.resource_fields || [],
      troops: data.troops || [],
    }),
  });
}

/**
 * 同步村莊中心數據
 */
async function syncVillageCenter(accountId, villageId, data) {
  return apiRequest('/sync/village-center', {
    method: 'POST',
    body: JSON.stringify({
      account_id: accountId,
      village_id: villageId,
      village_name: data.village_name,
      coordinate_x: data.coordinate_x,
      coordinate_y: data.coordinate_y,
      population: data.population || 0,
      is_capital: data.is_capital || false,
      capital_village_id: data.capital_village_id || null,
      buildings: data.buildings || [],
      troops: data.troops || [],
    }),
  });
}

/**
 * 同步報告數據
 */
async function syncReports(accountId, reports) {
  return apiRequest('/sync/reports', {
    method: 'POST',
    body: JSON.stringify({
      account_id: accountId,
      reports: reports,
    }),
  });
}

/**
 * 同步軍隊統計數據
 */
async function syncTroopStatistics(accountId, villagesTroops) {
  return apiRequest('/sync/troop-statistics', {
    method: 'POST',
    body: JSON.stringify({
      account_id: accountId,
      villages_troops: villagesTroops,
    }),
  });
}

/**
 * 工具網站透過 externally_connectable 交登入憑證過來。
 *
 * manifest 只允許工具網站連進來；這裡再檢查一次 sender 的 origin。
 * 只接受「設定憑證」與「清除憑證」兩種訊息，不會因此去讀任何遊戲頁面。
 */
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (!isTrustedSender(sender, TRUSTED_SITE_ORIGINS)) {
    sendResponse({ success: false, error: 'Untrusted sender' });
    return false;
  }

  const handleAsync = async () => {
    switch (request?.type) {
      case SITE_MESSAGE.PING:
        return { success: true };
      case SITE_MESSAGE.SET: {
        const credential = await saveCredential(storage, request);
        return credential
          ? { success: true, expires_at: credential.expires_at }
          : { success: false, error: 'Invalid or expired credential' };
      }
      case SITE_MESSAGE.CLEAR:
        await clearCredential(storage);
        return { success: true };
      default:
        return { success: false, error: 'Unknown message' };
    }
  };

  handleAsync()
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true;
});

/**
 * 監聽來自 popup 或 content script 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Received message:', request);

  const handleAsync = async () => {
    try {
      switch (request.action) {
        case 'logout':
          await clearCredential(storage);
          return { success: true };

        case 'get_auth': {
          const credential = await loadCredential(storage);
          return {
            success: true,
            data: credential
              ? { user: credential.user, expires_at: credential.expires_at }
              : null,
          };
        }

        case 'sync_village_overview':
          const overviewResult = await syncVillageOverview(
            request.accountId,
            request.data
          );
          return { success: true, data: overviewResult };

        case 'sync_village_center':
          const centerResult = await syncVillageCenter(
            request.accountId,
            request.villageId,
            request.data
          );
          return { success: true, data: centerResult };

        case 'get_accounts':
          const accounts = await apiRequest('/game-accounts');
          return { success: true, data: accounts };

        case 'sync_reports':
          const reportsResult = await syncReports(
            request.accountId,
            request.reports
          );
          return { success: true, data: reportsResult };

        case 'sync_troop_statistics':
          const troopStatsResult = await syncTroopStatistics(
            request.accountId,
            request.villagesTroops
          );
          return { success: true, data: troopStatsResult };

        default:
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      log('Error:', error);
      return { success: false, error: error.message };
    }
  };

  handleAsync().then(sendResponse);
  return true; // 保持 message channel 開啟
});

log('Background service worker started');
