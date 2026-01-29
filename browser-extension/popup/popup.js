/**
 * Travian Tools - Popup Script
 */

// DOM 元素
const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const usernameEl = document.getElementById('username');
const accountSelect = document.getElementById('account-select');
const pageTypeEl = document.getElementById('page-type');
const syncBtn = document.getElementById('sync-btn');
const syncResultEl = document.getElementById('sync-result');
const errorMessageEl = document.getElementById('error-message');

// 自動同步相關元素
const autoSyncCheckbox = document.getElementById('auto-sync-checkbox');
const autoSyncLabel = document.getElementById('auto-sync-label');
const autoSyncStatus = document.getElementById('auto-sync-status');
const syncIntervalEl = document.getElementById('sync-interval');
const lastSyncTimeEl = document.getElementById('last-sync-time');
const triggerSyncBtn = document.getElementById('trigger-sync-btn');

// 狀態
let currentAuth = null;
let currentPageType = null;
let currentPageData = null;

/**
 * 顯示錯誤訊息
 */
function showError(message) {
  errorMessageEl.textContent = message;
  errorMessageEl.classList.remove('hidden');
  setTimeout(() => {
    errorMessageEl.classList.add('hidden');
  }, 5000);
}

/**
 * 發送消息到 background script
 */
async function sendMessage(action, data = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, ...data }, resolve);
  });
}

/**
 * 發送消息到 content script
 */
async function sendToContent(action, data = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { success: false, error: 'No active tab' };
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false, error: 'No response' });
      }
    });
  });
}

/**
 * 更新 UI 狀態
 */
function updateUI() {
  if (currentAuth) {
    loginSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
    usernameEl.textContent = currentAuth.username || currentAuth.email || '使用者';
  } else {
    loginSection.classList.remove('hidden');
    mainSection.classList.add('hidden');
  }
}

/**
 * 載入帳號列表
 */
async function loadAccounts() {
  const result = await sendMessage('get_accounts');
  if (result.success && result.data?.accounts) {
    accountSelect.innerHTML = '<option value="">-- 選擇帳號 --</option>';
    result.data.accounts.forEach((account) => {
      const option = document.createElement('option');
      option.value = account.account_id;
      option.textContent = `${account.server_name || account.server_url} (${account.player_name || '未知'})`;
      accountSelect.appendChild(option);
    });
  }
}

/**
 * 檢測當前頁面
 */
async function detectPage() {
  const result = await sendToContent('get_page_type');
  if (result.success) {
    currentPageType = result.page_type;

    const pageTypeNames = {
      village_overview: '村莊總覽 (dorf1)',
      village_center: '村莊中心 (dorf2)',
      rally_point: '集結點',
      hero: '英雄',
      reports: '報告列表',
      troop_statistics: '軍隊統計',
      map: '地圖',
      unknown: '未知頁面',
    };

    pageTypeEl.textContent = pageTypeNames[currentPageType] || currentPageType;

    // 村莊頁面、報告頁面、軍隊統計頁面都能同步
    const canSync =
      accountSelect.value &&
      (currentPageType === 'village_overview' ||
       currentPageType === 'village_center' ||
       currentPageType === 'reports' ||
       currentPageType === 'troop_statistics');
    syncBtn.disabled = !canSync;

    // 更新按鈕文字
    if (currentPageType === 'reports') {
      syncBtn.textContent = '同步報告';
    } else if (currentPageType === 'troop_statistics') {
      syncBtn.textContent = '同步軍隊統計';
    } else {
      syncBtn.textContent = '同步當前頁面';
    }
  } else {
    pageTypeEl.textContent = '無法檢測 (非 Travian 頁面)';
    syncBtn.disabled = true;
  }
}

/**
 * 同步數據
 */
async function syncData() {
  if (!accountSelect.value) {
    showError('請先選擇遊戲帳號');
    return;
  }

  syncBtn.disabled = true;
  syncBtn.textContent = '同步中...';
  syncResultEl.textContent = '';
  syncResultEl.className = 'sync-result';

  try {
    // 收集頁面數據
    const collectResult = await sendToContent('collect_data');
    if (!collectResult.success) {
      throw new Error(collectResult.error || '無法收集頁面數據');
    }

    currentPageData = collectResult.data;

    // 根據頁面類型同步
    let syncResult;
    if (currentPageType === 'village_overview') {
      syncResult = await sendMessage('sync_village_overview', {
        accountId: accountSelect.value,
        data: currentPageData,
      });
    } else if (currentPageType === 'village_center') {
      syncResult = await sendMessage('sync_village_center', {
        accountId: accountSelect.value,
        villageId: currentPageData.village_id,
        data: currentPageData,
      });
    } else if (currentPageType === 'reports') {
      syncResult = await sendMessage('sync_reports', {
        accountId: accountSelect.value,
        reports: currentPageData.reports || [],
      });
    } else if (currentPageType === 'troop_statistics') {
      syncResult = await sendMessage('sync_troop_statistics', {
        accountId: accountSelect.value,
        villagesTroops: currentPageData.villages_troops || [],
      });
    }

    if (syncResult?.success) {
      let successMsg = '同步成功！';
      if (currentPageType === 'reports') {
        successMsg = `同步成功！共 ${syncResult.data?.count || 0} 筆報告`;
      } else if (currentPageType === 'troop_statistics') {
        successMsg = `同步成功！${syncResult.data?.villages_synced || 0} 個村莊，${syncResult.data?.troops_synced || 0} 筆部隊`;
      }
      syncResultEl.textContent = successMsg;
      syncResultEl.className = 'sync-result success';
    } else {
      throw new Error(syncResult?.error || '同步失敗');
    }
  } catch (error) {
    syncResultEl.textContent = `錯誤: ${error.message}`;
    syncResultEl.className = 'sync-result error';

    // 如果是認證錯誤，回到登入畫面
    if (error.message.includes('登入已過期') || error.message.includes('401')) {
      currentAuth = null;
      updateUI();
    }
  } finally {
    syncBtn.disabled = false;
    if (currentPageType === 'reports') {
      syncBtn.textContent = '同步報告';
    } else if (currentPageType === 'troop_statistics') {
      syncBtn.textContent = '同步軍隊統計';
    } else {
      syncBtn.textContent = '同步當前頁面';
    }
  }
}

// 事件處理
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const result = await sendMessage('login', {
    credentials: { email, password },
  });

  if (result.success) {
    currentAuth = result.data;
    updateUI();
    await loadAccounts();
    await detectPage();
  } else {
    showError(result.error || '登入失敗');
  }
});

logoutBtn.addEventListener('click', async () => {
  await sendMessage('logout');
  currentAuth = null;
  updateUI();
});

accountSelect.addEventListener('change', () => {
  detectPage();
  updateAutoSyncUI();
});

syncBtn.addEventListener('click', syncData);

// 自動同步相關事件
autoSyncCheckbox.addEventListener('change', async () => {
  const enabled = autoSyncCheckbox.checked;
  const accountId = accountSelect.value;

  if (enabled && !accountId) {
    showError('請先選擇遊戲帳號');
    autoSyncCheckbox.checked = false;
    return;
  }

  autoSyncCheckbox.disabled = true;

  try {
    const result = await sendMessage('set_auto_sync', {
      enabled,
      accountId,
    });

    if (!result.success) {
      throw new Error(result.error || '設定失敗');
    }

    updateAutoSyncUI();
  } catch (error) {
    showError(error.message);
    autoSyncCheckbox.checked = !enabled;
  } finally {
    autoSyncCheckbox.disabled = false;
  }
});

triggerSyncBtn.addEventListener('click', async () => {
  triggerSyncBtn.disabled = true;
  triggerSyncBtn.textContent = '同步中...';

  try {
    const result = await sendMessage('trigger_auto_sync');
    if (result.success) {
      const data = result.data;
      if (data.success) {
        syncResultEl.textContent = `同步完成！成功 ${data.syncedCount} 個，失敗 ${data.errorCount} 個`;
        syncResultEl.className = 'sync-result success';
      } else {
        const reasons = {
          not_logged_in: '尚未登入',
          no_account: '未選擇帳號',
          no_tabs: '未找到 Travian 分頁',
        };
        syncResultEl.textContent = `同步跳過：${reasons[data.reason] || data.reason}`;
        syncResultEl.className = 'sync-result';
      }
      await updateAutoSyncUI();
    } else {
      throw new Error(result.error || '同步失敗');
    }
  } catch (error) {
    syncResultEl.textContent = `錯誤: ${error.message}`;
    syncResultEl.className = 'sync-result error';
  } finally {
    triggerSyncBtn.disabled = false;
    triggerSyncBtn.textContent = '立即同步所有分頁';
  }
});

/**
 * 更新自動同步 UI 狀態
 */
async function updateAutoSyncUI() {
  const result = await sendMessage('get_auto_sync_status');
  if (!result.success) return;

  const { enabled, lastSync, intervalMinutes } = result.data;

  autoSyncCheckbox.checked = enabled;
  autoSyncLabel.textContent = enabled ? '已啟用' : '已停用';

  // 只有選擇了帳號才能啟用自動同步
  autoSyncCheckbox.disabled = !accountSelect.value;

  if (enabled) {
    autoSyncStatus.classList.remove('hidden');
    triggerSyncBtn.classList.remove('hidden');
    syncIntervalEl.textContent = `${intervalMinutes} 分鐘 (隨機)`;
    lastSyncTimeEl.textContent = lastSync
      ? new Date(lastSync).toLocaleString()
      : '從未';
  } else {
    autoSyncStatus.classList.add('hidden');
    triggerSyncBtn.classList.add('hidden');
  }
}

// 初始化
(async () => {
  // 檢查登入狀態
  const authResult = await sendMessage('get_auth');
  if (authResult.success && authResult.data) {
    currentAuth = authResult.data;
    updateUI();
    await loadAccounts();
    await updateAutoSyncUI();
  } else {
    updateUI();
  }

  // 檢測當前頁面
  await detectPage();
})();
