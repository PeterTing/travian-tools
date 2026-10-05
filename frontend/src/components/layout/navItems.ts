/**
 * 外框導覽的內容（P0-11，照 P0 線框 v0.4「資訊架構」；P0-09 計算器清單）
 *
 * 手機：底部 5 個分頁（首頁、村莊、計算器、攻略、更多）
 * 電腦（≥ 1024px）：左側選單，內容一樣
 *
 * 刻意不放：AI 助手、執行（P0-01 已移除）、知識庫（P1 才加，不留空入口）、
 * 戰鬥模擬（P1-06 重寫完成前先隱藏；路由還在，只是沒有入口）。
 */
import { ROUTES } from '@/constants/routes'

export interface NavLink {
  /** i18n key */
  labelKey: string
  to: string
}

export interface NavGroup {
  /** i18n key */
  titleKey: string
  links: NavLink[]
}

export type TabId = 'home' | 'villages' | 'calculators' | 'strategy' | 'more'

export interface NavTab {
  id: TabId
  labelKey: string
  to: string
}

/** 手機底部分頁 */
export const TABS: NavTab[] = [
  { id: 'home', labelKey: 'nav.tabs.home', to: ROUTES.HOME },
  { id: 'villages', labelKey: 'nav.tabs.villages', to: ROUTES.VILLAGES.LIST },
  { id: 'calculators', labelKey: 'nav.tabs.calculators', to: ROUTES.CALCULATOR.INDEX },
  { id: 'strategy', labelKey: 'nav.tabs.strategy', to: ROUTES.STRATEGY.OPENING },
  { id: 'more', labelKey: 'nav.tabs.more', to: ROUTES.MORE },
]

/**
 * 計算器（戰鬥模擬不在這裡：P1 重寫完才開）
 * 打仗／發展以線框為準；guide 8 個為主，其餘既有工具排在後面。
 */
export const CALCULATOR_GROUPS: NavGroup[] = [
  {
    titleKey: 'nav.groups.combat',
    links: [
      { labelKey: 'nav.calcs.path', to: '/calculator/path' },
      { labelKey: 'nav.calcs.launchSim', to: '/calculator/launch-sim' },
      { labelKey: 'nav.calcs.interception', to: '/calculator/interception' },
      { labelKey: 'nav.calcs.saveTroops', to: '/calculator/save-troops' },
      { labelKey: 'nav.calcs.pathSpeedTs', to: '/calculator/path-speed-ts' },
      { labelKey: 'nav.calcs.attackPlanner', to: '/calculator/attack-planner' },
    ],
  },
  {
    titleKey: 'nav.groups.development',
    links: [
      { labelKey: 'nav.calcs.buildOrder', to: '/calculator/build-order' },
      { labelKey: 'nav.calcs.passiveCp', to: '/calculator/passive-cp' },
      { labelKey: 'nav.calcs.fieldRoi', to: '/calculator/field-roi' },
      { labelKey: 'nav.calcs.oasisRoi', to: '/calculator/oasis-roi' },
      { labelKey: 'nav.calcs.cropSim', to: '/calculator/crop-sim' },
      { labelKey: 'nav.calcs.farming', to: '/calculator/farming' },
      { labelKey: 'nav.calcs.tradeRoute', to: '/calculator/trade-route' },
      { labelKey: 'nav.buildingCalc', to: ROUTES.CALCULATOR.BUILDING },
      { labelKey: 'nav.cropBalance', to: ROUTES.CALCULATOR.CROP },
      { labelKey: 'nav.calcs.npc', to: '/calculator/npc' },
      { labelKey: 'nav.calcs.technology', to: '/calculator/technology' },
      { labelKey: 'nav.calcs.cropScouter', to: '/calculator/crop-scouter' },
    ],
  },
]

/** 攻略：P0 只有起手式 */
export const STRATEGY_LINKS: NavLink[] = [
  { labelKey: 'nav.openingChecklist', to: ROUTES.STRATEGY.OPENING },
]

/** 「更多」裡最上面的兩個：地圖（map.sql）和帳號管理 */
export const MORE_LINKS: NavLink[] = [
  { labelKey: 'mapSql.title', to: ROUTES.MAP_SQL },
  { labelKey: 'gameAccounts.title', to: ROUTES.GAME_ACCOUNTS },
]

/** 「更多」裡的參考資料 */
export const MORE_GROUPS: NavGroup[] = [
  {
    titleKey: 'nav.database',
    links: [
      { labelKey: 'nav.buildings', to: ROUTES.DATABASE.BUILDINGS },
      { labelKey: 'nav.troops', to: ROUTES.DATABASE.TROOPS },
      { labelKey: 'nav.resources', to: ROUTES.DATABASE.RESOURCES },
    ],
  },
  {
    titleKey: 'nav.statistics',
    links: [
      { labelKey: 'nav.stats.overview', to: '/statistics/overview' },
      { labelKey: 'nav.stats.players', to: '/statistics/players' },
      { labelKey: 'nav.stats.alliances', to: '/statistics/alliances' },
      { labelKey: 'nav.stats.conquests', to: '/statistics/conquests' },
      { labelKey: 'nav.stats.nameChanges', to: '/statistics/name-changes' },
      { labelKey: 'nav.stats.inactives', to: '/statistics/search/inactives' },
    ],
  },
]

const startsWithSegment = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`)

/** 目前網址屬於哪一個底部分頁（登入、註冊等頁面不屬於任何分頁） */
export function activeTabFor(pathname: string): TabId | null {
  if (pathname === ROUTES.HOME || startsWithSegment(pathname, '/paste')) return 'home'
  if (startsWithSegment(pathname, ROUTES.VILLAGES.LIST)) return 'villages'
  if (startsWithSegment(pathname, ROUTES.CALCULATOR.INDEX)) return 'calculators'
  if (startsWithSegment(pathname, '/strategy')) return 'strategy'
  if (
    [ROUTES.MORE, ROUTES.GAME_ACCOUNTS, ROUTES.MAP_SQL, '/database', '/statistics'].some((p) =>
      startsWithSegment(pathname, p)
    )
  )
    return 'more'
  return null
}

/** 側邊選單或「更多」頁的某個連結是不是目前這頁 */
export function isLinkActive(pathname: string, to: string): boolean {
  if (to === ROUTES.HOME) return pathname === ROUTES.HOME
  // 帳號管理底下的「新增」也算在帳號管理
  return startsWithSegment(pathname, to)
}
