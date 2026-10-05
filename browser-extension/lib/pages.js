/**
 * 頁面類型（content script 判斷）→ popup 顯示名稱與上傳 API。
 */

/** 頁面類型 → 給人看的名稱（不顯示 dorf1 之類的遊戲內部代號） */
export const PAGE_NAMES = Object.freeze({
  village_overview: '村莊總覽',
  village_center: '村莊中心',
  rally_point: '集結點',
  hero: '英雄',
  reports: '報告',
  troop_statistics: '軍隊統計',
  map: '地圖',
});

/** 可上傳的頁面類型 → 上傳 API（後端只讓擴充 Token 用這幾個） */
export const UPLOAD_ENDPOINTS = Object.freeze({
  village_overview: '/sync/village-overview',
  village_center: '/sync/village-center',
  reports: '/sync/reports',
  troop_statistics: '/sync/troop-statistics',
});

/**
 * popup「目前頁面」要顯示的文字：只給好懂的名稱，不顯示 dorf1 之類的
 * 遊戲內部代號；不認得的頁面回傳空字串（不多顯示任何東西）。
 * 世界名（例如「村莊總覽 · ts3」）等 P0-03/P0-05 再加。
 */
export function pageLabel(pageType) {
  return Object.hasOwn(PAGE_NAMES, pageType ?? '') ? PAGE_NAMES[pageType] : '';
}

/** 上傳按鈕不能按時，按鈕上方一定要有的說明（不讓使用者看到沒有理由的灰色按鈕） */
export const UPLOAD_HINTS = Object.freeze({
  // 認不出的頁面（含非 Travian 分頁），以及認得但還不能上傳的頁面（英雄、地圖）
  UNSUPPORTED_PAGE: '這一頁還不支援，請到村莊總覽再按',
  // 集結點：認得，但上傳還在做（P0-03/P0-05 完成後拿掉這句，兩句都改回提到集結點）
  RALLY_POINT_PENDING: '集結點的上傳還在做，目前請到村莊總覽再按',
  DETECTING: '正在讀取這一頁…',
  UPLOADING: '正在上傳這一頁…',
  NO_ACCOUNTS: '請先在工具網站新增遊戲帳號',
  CHOOSE_ACCOUNT: '請在下方選擇要存到哪個遊戲帳號',
});

/**
 * popup 上傳區的狀態（純函式）。
 * @param {{pageType?: string|null, detecting?: boolean, hasAccounts?: boolean, accountSelected?: boolean}} input
 * @returns {{pageName: string, canUpload: boolean, hint: string}}
 *   canUpload 為 false 時 hint 一定不是空字串。
 */
export function uploadState({
  pageType = null,
  detecting = false,
  hasAccounts = false,
  accountSelected = false,
} = {}) {
  const pageName = detecting ? '' : pageLabel(pageType);
  let hint = '';
  if (detecting) {
    hint = UPLOAD_HINTS.DETECTING;
  } else if (pageType === 'rally_point' && !Object.hasOwn(UPLOAD_ENDPOINTS, pageType)) {
    hint = UPLOAD_HINTS.RALLY_POINT_PENDING;
  } else if (!Object.hasOwn(UPLOAD_ENDPOINTS, pageType ?? '')) {
    hint = UPLOAD_HINTS.UNSUPPORTED_PAGE;
  } else if (!hasAccounts) {
    hint = UPLOAD_HINTS.NO_ACCOUNTS;
  } else if (!accountSelected) {
    hint = UPLOAD_HINTS.CHOOSE_ACCOUNT;
  }
  return { pageName, canUpload: hint === '', hint };
}
