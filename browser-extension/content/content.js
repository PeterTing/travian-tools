/**
 * Travian Tools - Content Script
 *
 * 不會自動注入任何頁面：只有使用者點開擴充功能 popup 時，才透過
 * activeTab + chrome.scripting 注入到「目前分頁」，並且只在收到 popup
 * 的訊息時讀取該頁 DOM。不發出網路請求、不點擊、不導航、不使用計時器。
 *
 * P0-03：只負責判斷頁面類型，並把（去掉 script/style 的）HTML 交給後端
 * 共用解析器；不再在擴充端組上傳 JSON。
 */

const CONFIG = { DEBUG: true };

const log = (...args) => {
  if (CONFIG.DEBUG) console.log('[Travian Tools]', ...args);
};

/**
 * 判斷當前頁面類型（給 popup 顯示名稱／能不能上傳）
 */
function getPageType() {
  const url = window.location.href;
  if (url.includes('dorf1.php')) return 'village_overview';
  if (url.includes('dorf2.php')) return 'village_center';
  if (url.includes('build.php') && url.includes('gid=16')) return 'rally_point';
  if (url.includes('hero.php')) return 'hero';
  if (url.includes('reports.php') || url.includes('berichte.php')) return 'reports';
  if (url.includes('map.php')) return 'map';
  if (url.includes('village/statistics/troops') || url.includes('statistiken.php')) {
    return 'troop_statistics';
  }
  if (url.includes('village/statistics/overview')) return 'statistics_overview';
  if (url.includes('village/statistics/resources')) return 'statistics_resources';
  if (url.includes('village/statistics/culturepoints')) return 'statistics_culturepoints';
  return 'unknown';
}

/**
 * 讀 #servertime（後端算集結點抵達時間會用到）
 */
function getServerTime() {
  const el =
    document.querySelector('#servertime #tp1') ||
    document.querySelector('#servertime .timer') ||
    document.querySelector('#tp1');
  if (!el) return null;
  const text = (el.textContent || '').trim();
  return /^\d{1,2}:\d{2}:\d{2}/.test(text) ? text : null;
}

/**
 * 複製 DOM，去掉 script／style，回傳 outerHTML。不改動遊戲頁面。
 */
function collectPageHtml() {
  const root = document.documentElement;
  if (!root) return '';
  const clone = root.cloneNode(true);
  clone.querySelectorAll('script, style, link[rel="stylesheet"]').forEach((n) => n.remove());
  return '<!DOCTYPE html>\n' + clone.outerHTML;
}

/**
 * 給後端共用解析器用的資料包
 */
function collectPagePayload() {
  return {
    page_type: getPageType(),
    url: window.location.href,
    html: collectPageHtml(),
    server_time: getServerTime(),
    timestamp: new Date().toISOString(),
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Received message:', request);
  switch (request.action) {
    case 'collect_data':
      sendResponse({ success: true, data: collectPagePayload() });
      break;
    case 'get_page_type':
      sendResponse({ success: true, page_type: getPageType() });
      break;
    case 'ping':
      sendResponse({ success: true, message: 'pong' });
      break;
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return true;
});

log('Content script loaded on', window.location.href);
log('Page type:', getPageType());
