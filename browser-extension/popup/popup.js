/**
 * Travian Tools - Popup Script
 *
 * popup 裡沒有任何輸入框。沒登入時只顯示「在工具網站登入」，按下去開新分頁
 * 到工具網站；登入後網站會把有到期時間的憑證交給擴充（見 background）。
 */

import { TOOL_SITE_URL } from '../lib/config.js';
import { describeExpiry } from '../lib/credential.js';

// DOM 元素
const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const openSiteBtn = document.getElementById('open-site-btn');
const logoutBtn = document.getElementById('logout-btn');
const usernameEl = document.getElementById('username');
const expiryEl = document.getElementById('expiry');
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
    logoutBtn.classList.remove('hidden');
    const user = currentAuth.user || {};
    usernameEl.textContent = user.username || user.email || '已登入';
    expiryEl.textContent = describeExpiry(currentAuth);
  } else {
    loginSection.classList.remove('hidden');
    mainSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
}

/**
 * 載入帳號列表
 */
async function loadAccounts() {
  const result = await sendMessage('get_accounts');
  if (result.success && result.data?.accounts) {
    accountSelect.innerHTML = '<option value="">選擇遊戲帳號</option>';
    result.data.accounts.forEach((account) => {
      const option = document.createElement('option');
      option.value = account.account_id;
      option.textContent = `${account.player_name || '未命名'} · ${account.server_name || account.server_url}`;
      accountSelect.appendChild(option);
    });
    if (result.data.accounts.length === 1) {
      accountSelect.value = result.data.accounts[0].account_id;
    }
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

  } else {
    pageTypeEl.textContent = '不是 Travian 遊戲頁面';
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
  syncBtn.textContent = '上傳中…';
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
      let successMsg = '上傳成功！';
      if (currentPageType === 'reports') {
        successMsg = `上傳成功！共 ${syncResult.data?.count || 0} 筆報告`;
      } else if (currentPageType === 'troop_statistics') {
        successMsg = `上傳成功！${syncResult.data?.villages_synced || 0} 個村莊，${syncResult.data?.troops_synced || 0} 筆部隊`;
      }
      syncResultEl.textContent = successMsg;
      syncResultEl.className = 'sync-result success';
    } else {
      throw new Error(syncResult?.error || '上傳失敗');
    }
  } catch (error) {
    syncResultEl.textContent = `錯誤: ${error.message}`;
    syncResultEl.className = 'sync-result error';

    // 如果是認證錯誤，回到登入畫面
    if (
      error.message.includes('登入已過期') ||
      error.message.includes('尚未登入') ||
      error.message.includes('401')
    ) {
      currentAuth = null;
      updateUI();
    }
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = '上傳這一頁';
  }
}

// 事件處理
openSiteBtn.addEventListener('click', () => {
  // 只開一個新分頁到「工具網站」的登入頁，不碰任何遊戲分頁。
  window.open(`${TOOL_SITE_URL}/login?from=extension`, '_blank', 'noopener');
  window.close();
});

logoutBtn.addEventListener('click', async () => {
  await sendMessage('logout');
  currentAuth = null;
  syncResultEl.textContent = '';
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
  if (authResult?.success && authResult.data) {
    currentAuth = authResult.data;
    updateUI();
    await loadAccounts();
  } else {
    updateUI();
  }

  // 檢測當前頁面（沒登入就不用讀遊戲頁面）
  if (currentAuth) {
    await detectPage();
  }
})();
