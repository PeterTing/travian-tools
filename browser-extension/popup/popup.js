/**
 * Travian Tools - Popup Script
 *
 * popup 裡沒有任何輸入框。沒登入時只顯示「在工具網站登入」，按下去開新分頁
 * 到工具網站；登入後網站會把有到期時間、只能上傳的憑證交給擴充（background）。
 *
 * 這裡是擴充唯一會發出請求的地方：使用者按「上傳這一頁」時，把目前分頁讀到
 * 的資料送到 Travian Tools 的上傳 API。不會自動上傳其他頁面。
 */

import { ADD_ACCOUNT_PATH, API_BASE_URL, TOOL_SITE_URL } from '../lib/config.js';
import { clearCredential, describeExpiry, loadCredential } from '../lib/credential.js';
import { UPLOAD_ENDPOINTS, UPLOAD_HINTS, uploadState } from '../lib/pages.js';

const storage = chrome.storage.local;

// DOM 元素
const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const openSiteBtn = document.getElementById('open-site-btn');
const logoutBtn = document.getElementById('logout-btn');
const usernameEl = document.getElementById('username');
const expiryEl = document.getElementById('expiry');
const accountSelect = document.getElementById('account-select');
const pageLineEl = document.getElementById('page-line');
const pageTypeEl = document.getElementById('page-type');
const uploadHintEl = document.getElementById('upload-hint');
const syncBtn = document.getElementById('sync-btn');
const syncResultEl = document.getElementById('sync-result');
const errorMessageEl = document.getElementById('error-message');

// 只在 Travian 遊戲頁面上讀取（使用者點開 popup 時，activeTab 才授權目前分頁）
const TRAVIAN_PAGE = /^https:\/\/([a-z0-9-]+\.)*travian\.(com|tw|net)\//i;

// 狀態
let credential = null;
let currentPageType = null;
let detecting = true;

function showError(message) {
  errorMessageEl.textContent = message;
  errorMessageEl.classList.remove('hidden');
  setTimeout(() => {
    errorMessageEl.classList.add('hidden');
  }, 5000);
}

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

/** 依頁面類型組出上傳內容 */
function buildUploadBody(pageType, accountId, data) {
  switch (pageType) {
    case 'village_overview':
      return {
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
      };
    case 'village_center':
      return {
        account_id: accountId,
        village_id: data.village_id,
        village_name: data.village_name,
        coordinate_x: data.coordinate_x,
        coordinate_y: data.coordinate_y,
        population: data.population || 0,
        is_capital: data.is_capital || false,
        capital_village_id: data.capital_village_id || null,
        buildings: data.buildings || [],
        troops: data.troops || [],
      };
    case 'reports':
      return { account_id: accountId, reports: data.reports || [] };
    case 'troop_statistics':
      return { account_id: accountId, villages_troops: data.villages_troops || [] };
    default:
      return null;
  }
}

/** 把這一頁送到 Travian Tools 的上傳 API（擴充唯一的請求） */
async function uploadPage(pageType, body) {
  const endpoint = UPLOAD_ENDPOINTS[pageType];
  if (!endpoint || !body) throw new Error('這一頁不能上傳');
  const current = await loadCredential(storage);
  if (!current) throw new Error('尚未登入，請在工具網站登入');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${current.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    // 過期或網站已登出（後端撤銷）：清掉本地憑證
    await clearCredential(storage);
    throw new Error('登入已過期，請在工具網站重新登入');
  }
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      message = error.detail || error.message || message;
    } catch {
      // 忽略
    }
    throw new Error(message);
  }
  return response.json();
}

function updateUI() {
  if (credential) {
    loginSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    const user = credential.user || {};
    usernameEl.textContent = user.username || user.email || '已登入';
    expiryEl.textContent = describeExpiry(credential);
  } else {
    loginSection.classList.remove('hidden');
    mainSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
}

/** 「存到」的選項：網站交憑證時一併帶來的遊戲帳號 */
function renderAccounts() {
  const accounts = credential?.accounts || [];
  accountSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = accounts.length ? '選擇遊戲帳號' : '請先在工具網站新增遊戲帳號';
  accountSelect.appendChild(placeholder);
  for (const account of accounts) {
    const option = document.createElement('option');
    option.value = account.account_id;
    option.textContent = account.label;
    accountSelect.appendChild(option);
  }
  if (accounts.length === 1) {
    accountSelect.value = accounts[0].account_id;
  }
}

/** 依頁面與帳號狀態更新「目前頁面」、說明文字與按鈕；按鈕不能按時一定有說明 */
function refreshSyncButton() {
  const state = uploadState({
    pageType: currentPageType,
    detecting,
    hasAccounts: (credential?.accounts || []).length > 0,
    accountSelected: Boolean(accountSelect.value),
  });
  pageTypeEl.textContent = state.pageName;
  pageLineEl.classList.toggle('hidden', !state.pageName);
  if (state.hint === UPLOAD_HINTS.NO_ACCOUNTS) {
    renderAddAccountLink(state.hint);
  } else {
    uploadHintEl.textContent = state.hint;
  }
  uploadHintEl.classList.toggle('hidden', !state.hint);
  syncBtn.disabled = !state.canUpload;
}

/** 「請先在工具網站新增遊戲帳號」做成連結，點了開新分頁到工具網站的新增帳號頁 */
function renderAddAccountLink(text) {
  const link = document.createElement('a');
  link.id = 'add-account-link';
  link.href = `${TOOL_SITE_URL}${ADD_ACCOUNT_PATH}`;
  link.textContent = text;
  link.addEventListener('click', openAddAccountPage);
  uploadHintEl.replaceChildren(link);
}

function openAddAccountPage(event) {
  event.preventDefault();
  // 和「在工具網站登入」一樣：只開一個新分頁到工具網站，不碰任何遊戲分頁。
  window.open(`${TOOL_SITE_URL}${ADD_ACCOUNT_PATH}`, '_blank', 'noopener');
  window.close();
}

async function detectPage() {
  detecting = true;
  refreshSyncButton();
  const result = await sendToContent('get_page_type');
  currentPageType = result.success ? result.page_type : null;
  detecting = false;
  refreshSyncButton();
}

async function syncData() {
  if (!accountSelect.value) {
    showError('請先選擇遊戲帳號');
    return;
  }

  syncBtn.disabled = true;
  syncBtn.textContent = '上傳中…';
  uploadHintEl.textContent = UPLOAD_HINTS.UPLOADING;
  uploadHintEl.classList.remove('hidden');
  syncResultEl.textContent = '';
  syncResultEl.className = 'sync-result';

  try {
    const collectResult = await sendToContent('collect_data');
    if (!collectResult.success) {
      throw new Error(collectResult.error || '無法讀取這一頁');
    }
    const body = buildUploadBody(currentPageType, accountSelect.value, collectResult.data);
    const result = await uploadPage(currentPageType, body);

    let successMsg = '上傳成功！';
    if (currentPageType === 'reports') {
      successMsg = `上傳成功！共 ${result?.count || 0} 筆報告`;
    } else if (currentPageType === 'troop_statistics') {
      successMsg = `上傳成功！${result?.villages_synced || 0} 個村莊，${result?.troops_synced || 0} 筆部隊`;
    }
    syncResultEl.textContent = successMsg;
    syncResultEl.className = 'sync-result success';
  } catch (error) {
    syncResultEl.textContent = `錯誤: ${error.message}`;
    syncResultEl.className = 'sync-result error';
    if (!(await loadCredential(storage))) {
      credential = null;
      updateUI();
    }
  } finally {
    syncBtn.textContent = '上傳這一頁';
    refreshSyncButton();
  }
}

// 事件處理
openSiteBtn.addEventListener('click', () => {
  // 只開一個新分頁到「工具網站」的登入頁，不碰任何遊戲分頁。
  window.open(`${TOOL_SITE_URL}/login?from=extension`, '_blank', 'noopener');
  window.close();
});

logoutBtn.addEventListener('click', async () => {
  await clearCredential(storage);
  credential = null;
  syncResultEl.textContent = '';
  updateUI();
});

accountSelect.addEventListener('change', refreshSyncButton);
syncBtn.addEventListener('click', syncData);

// 初始化
(async () => {
  credential = await loadCredential(storage);
  updateUI();
  if (credential) {
    renderAccounts();
    // 沒登入就不用讀遊戲頁面
    await detectPage();
  }
})();
