/**
 * Travian Tools - Background Service Worker
 * 只處理 API 通訊與登入狀態。
 *
 * 合規：沒有任何計時器、alarm 或背景輪詢；只有使用者在 popup 點擊
 * 「同步當前頁面」時，才會讀取「目前分頁」並送到 Travian Tools 後端。
 * 擴充功能本身不會對 Travian 發出任何請求。
 */

// 配置
const CONFIG = {
  API_BASE_URL: 'http://localhost:8000/api/v1',
  DEBUG: true,
};

// 工具函數
const log = (...args) => {
  if (CONFIG.DEBUG) {
    console.log('[Travian Tools BG]', ...args);
  }
};

/**
 * 儲存管理
 */
const Storage = {
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },

  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  async getAuth() {
    return await this.get('auth');
  },

  async setAuth(auth) {
    await this.set('auth', auth);
  },

  async clearAuth() {
    await chrome.storage.local.remove('auth');
  },
};

/**
 * API 請求封裝
 */
async function apiRequest(endpoint, options = {}) {
  const auth = await Storage.getAuth();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (auth?.access_token) {
    headers['Authorization'] = `Bearer ${auth.access_token}`;
  }

  const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
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
      await Storage.clearAuth();
      throw new Error('登入已過期，請重新登入');
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
 * 監聽來自 popup 或 content script 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Received message:', request);

  const handleAsync = async () => {
    try {
      switch (request.action) {
        case 'login':
          const loginResult = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(request.credentials),
          });
          await Storage.setAuth(loginResult);
          return { success: true, data: loginResult };

        case 'logout':
          await Storage.clearAuth();
          return { success: true };

        case 'get_auth':
          const auth = await Storage.getAuth();
          return { success: true, data: auth };

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
