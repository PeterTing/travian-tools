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
