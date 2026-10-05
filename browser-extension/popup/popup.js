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

// 只在 Travian 遊戲頁面上讀取（使用者點開 popup 時，activeTab 才授權目前分頁）
const TRAVIAN_PAGE = /^https:\/\/([a-z0-9-]+\.)*travian\.(com|tw|net)\//i;

function messageTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false, error: 'No response' });
      }
    });
  });
}

/**
 * 發送消息到目前分頁的 content script。
 *
 * content script 不會自動注入任何頁面；只有使用者點開 popup（activeTab）時，
 * 才用 chrome.scripting 注入到「目前分頁」一次，然後只讀取該頁 DOM。
 */
async function sendToContent(action, data = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { success: false, error: 'No active tab' };
  }
  if (!tab.url || !TRAVIAN_PAGE.test(tab.url)) {
    return { success: false, error: '目前分頁不是 Travian 遊戲頁面' };
  }

  const ping = await messageTab(tab.id, { action: 'ping' });
  if (!ping.success) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js'],
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return messageTab(tab.id, { action, ...data });
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
});

syncBtn.addEventListener('click', syncData);

// 初始化
(async () => {
  // 檢查登入狀態
  const authResult = await sendMessage('get_auth');
  if (authResult.success && authResult.data) {
    currentAuth = authResult.data;
    updateUI();
    await loadAccounts();
  } else {
    updateUI();
  }

  // 檢測當前頁面
  await detectPage();
})();
