/**
 * Travian Tools - Background Service Worker
 * 處理 API 通訊、狀態管理和定期同步
 */

// 配置
const CONFIG = {
  API_BASE_URL: 'http://localhost:8000/api/v1',
  DEBUG: true,
  AUTO_SYNC_MIN_INTERVAL: 12, // 最小同步間隔（分鐘）
  AUTO_SYNC_MAX_INTERVAL: 18, // 最大同步間隔（分鐘）
  AUTO_SYNC_ALARM_NAME: 'travian-auto-sync',
};

/**
 * 產生隨機同步間隔（分鐘）
 */
function getRandomInterval() {
  const min = CONFIG.AUTO_SYNC_MIN_INTERVAL;
  const max = CONFIG.AUTO_SYNC_MAX_INTERVAL;
  return min + Math.random() * (max - min);
}

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

  async getAutoSyncEnabled() {
    return (await this.get('autoSyncEnabled')) ?? false;
  },

  async setAutoSyncEnabled(enabled) {
    await this.set('autoSyncEnabled', enabled);
  },

  async getSelectedAccountId() {
    return await this.get('selectedAccountId');
  },

  async setSelectedAccountId(accountId) {
    await this.set('selectedAccountId', accountId);
  },

  async getLastAutoSync() {
    return await this.get('lastAutoSync');
  },

  async setLastAutoSync(timestamp) {
    await this.set('lastAutoSync', timestamp);
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
 * 自動同步管理
 */
const AutoSync = {
  /**
   * 啟動自動同步（使用隨機間隔）
   */
  async start() {
    log('Starting auto-sync alarm...');
    const interval = getRandomInterval();
    await chrome.alarms.create(CONFIG.AUTO_SYNC_ALARM_NAME, {
      delayInMinutes: interval,
    });
    await Storage.setAutoSyncEnabled(true);
    log(`Auto-sync enabled, next sync in ${interval.toFixed(1)} minutes`);
  },

  /**
   * 停止自動同步
   */
  async stop() {
    log('Stopping auto-sync alarm...');
    await chrome.alarms.clear(CONFIG.AUTO_SYNC_ALARM_NAME);
    await Storage.setAutoSyncEnabled(false);
    log('Auto-sync disabled');
  },

  /**
   * 檢查並恢復自動同步狀態
   */
  async restore() {
    const enabled = await Storage.getAutoSyncEnabled();
    if (enabled) {
      log('Restoring auto-sync from previous state...');
      await this.start();
    }
  },

  /**
   * 執行自動同步
   */
  async execute() {
    log('Executing auto-sync...');

    const auth = await Storage.getAuth();
    if (!auth) {
      log('Auto-sync skipped: not logged in');
      return { success: false, reason: 'not_logged_in' };
    }

    const accountId = await Storage.getSelectedAccountId();
    if (!accountId) {
      log('Auto-sync skipped: no account selected');
      return { success: false, reason: 'no_account' };
    }

    // 找到所有 Travian 標籤頁
    const travianTabs = await this.findTravianTabs();
    if (travianTabs.length === 0) {
      log('Auto-sync skipped: no Travian tabs open');
      return { success: false, reason: 'no_tabs' };
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const tab of travianTabs) {
      try {
        const result = await this.syncTab(tab, accountId);
        if (result.success) {
          syncedCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        log('Error syncing tab:', tab.id, error);
        errorCount++;
      }
    }

    await Storage.setLastAutoSync(Date.now());

    log(`Auto-sync complete: ${syncedCount} synced, ${errorCount} errors`);
    return { success: true, syncedCount, errorCount };
  },

  /**
   * 找到所有 Travian 標籤頁
   */
  async findTravianTabs() {
    const patterns = [
      '*://*.travian.com/*',
      '*://*.travian.tw/*',
      '*://*.travian.net/*',
      '*://*.x1.asia.travian.com/*',
    ];

    const allTabs = [];
    for (const pattern of patterns) {
      try {
        const tabs = await chrome.tabs.query({ url: pattern });
        allTabs.push(...tabs);
      } catch {
        // 忽略查詢錯誤
      }
    }

    // 過濾重複的標籤頁
    const uniqueTabs = allTabs.filter((tab, index, self) =>
      index === self.findIndex(t => t.id === tab.id)
    );

    // 只保留 dorf1.php 或 dorf2.php 頁面
    const villageTabs = uniqueTabs.filter(tab =>
      tab.url?.includes('dorf1.php') || tab.url?.includes('dorf2.php')
    );

    log(`Found ${villageTabs.length} Travian village tabs`);
    return villageTabs;
  },

  /**
   * 同步單個標籤頁
   */
  async syncTab(tab, accountId) {
    log(`Syncing tab ${tab.id}: ${tab.url}`);

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: 'collect_data' }, async (response) => {
        if (chrome.runtime.lastError) {
          log('Content script error:', chrome.runtime.lastError.message);
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        if (!response?.success) {
          resolve({ success: false, error: response?.error || 'No response' });
          return;
        }

        const data = response.data;
        try {
          if (data.page_type === 'village_overview') {
            await syncVillageOverview(accountId, data);
          } else if (data.page_type === 'village_center') {
            await syncVillageCenter(accountId, data.village_id, data);
          }
          log(`Tab ${tab.id} synced successfully`);
          resolve({ success: true });
        } catch (error) {
          log(`Tab ${tab.id} sync failed:`, error);
          resolve({ success: false, error: error.message });
        }
      });
    });
  },
};

/**
 * 監聽 alarm 事件
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CONFIG.AUTO_SYNC_ALARM_NAME) {
    log('Auto-sync alarm triggered');
    await AutoSync.execute();

    // 執行完後設定下一次的隨機間隔
    const enabled = await Storage.getAutoSyncEnabled();
    if (enabled) {
      const nextInterval = getRandomInterval();
      await chrome.alarms.create(CONFIG.AUTO_SYNC_ALARM_NAME, {
        delayInMinutes: nextInterval,
      });
      log(`Next auto-sync in ${nextInterval.toFixed(1)} minutes`);
    }
  }
});

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
          await AutoSync.stop();
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

        // 自動同步相關
        case 'get_auto_sync_status':
          const autoSyncEnabled = await Storage.getAutoSyncEnabled();
          const lastAutoSync = await Storage.getLastAutoSync();
          const selectedAccountId = await Storage.getSelectedAccountId();
          return {
            success: true,
            data: {
              enabled: autoSyncEnabled,
              lastSync: lastAutoSync,
              accountId: selectedAccountId,
              intervalMinutes: `${CONFIG.AUTO_SYNC_MIN_INTERVAL}-${CONFIG.AUTO_SYNC_MAX_INTERVAL}`,
            },
          };

        case 'set_auto_sync':
          if (request.enabled) {
            await Storage.setSelectedAccountId(request.accountId);
            await AutoSync.start();
          } else {
            await AutoSync.stop();
          }
          return { success: true };

        case 'trigger_auto_sync':
          const syncResult = await AutoSync.execute();
          return { success: true, data: syncResult };

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

// 初始化 - 恢復自動同步狀態
AutoSync.restore();
log('Background service worker started');
