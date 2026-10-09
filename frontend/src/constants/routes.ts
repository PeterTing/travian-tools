/**
 * 統一管理應用程式路由路徑
 */
export const ROUTES = {
  // 首頁
  HOME: '/',

  // 認證相關
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
  },

  // 資料庫
  DATABASE: {
    BUILDINGS: '/database/buildings',
    TROOPS: '/database/troops',
    RESOURCES: '/database/resources',
  },

  // 計算機
  CALCULATOR: {
    // 計算器列表（手機底部「計算器」分頁）
    INDEX: '/calculator',
    BUILDING: '/calculator/building',
    ROI: '/calculator/roi',
    BATTLE: '/calculator/battle',
    CROP: '/calculator/crop',
    // 資源田與首都規劃（田地 ROI＋首都產量模擬合一頁）
    FIELDS: '/calculator/fields',
    // 來襲列表（計算器 › 防守；首頁來襲卡「全部 ›」）
    INCOMING: '/calculator/incoming',
  },

  // 遊戲帳號
  GAME_ACCOUNTS: '/game-accounts',
  // 新增帳號或世界（擴充的「請先在工具網站新增遊戲帳號」也連到這裡）
  GAME_ACCOUNTS_NEW: '/game-accounts/new',

  // 村莊
  VILLAGES: {
    LIST: '/villages',
    DETAIL: (villageId: string) => `/villages/${villageId}`,
  },

  // 地圖
  MAP_SQL: '/map-sql',

  // 更多（手機底部「更多」分頁：地圖、帳號管理、數據庫、統計、登出）
  MORE: '/more',
  // 外部連結（8 個，只放連結，點了先提示即將離開）
  EXTERNAL_LINKS: '/more/external',

  // 攻略（P0 只有起手式）
  STRATEGY: {
    OPENING: '/strategy/opening',
  },
} as const
