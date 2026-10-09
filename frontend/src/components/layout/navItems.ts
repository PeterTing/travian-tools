/**
 * 外框導覽（IA v2.2，設計師定案 2026-10-09）
 *
 * 手機：底部 5 個分頁不變（首頁、村莊、計算器、攻略、更多）。
 *   「計算器」分頁用分段切 發展／打仗／防守／掠奪；「更多」放遊戲資料、外部工具、地圖、統計、帳號。
 * 電腦（≥ 1024px）：左側選單，順序 首頁、村莊、發展、打仗、防守、掠奪、資料、攻略、更多；
 *   每組可收合，同時只展開一組，會記住上次開的那組。
 *
 * 刻意不放：戰鬥模擬（P1-06 重寫前隱藏，/calculator/battle 轉回首頁）、
 * P1／P2 還沒做的頁面（英雄配點、投石車數量、練兵量、援軍可達、查糧、綠洲掠奪、
 * 綠洲動物、OP 出擊前清單）——做好才出現在選單裡，不留空入口。
 */
import { ROUTES } from '@/constants/routes'

export interface NavLink {
  /** i18n key */
  labelKey: string
  to: string
  /** 計算器列表上的一行說明（i18n key） */
  descKey?: string
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

export type CalcSegmentId = 'development' | 'combat' | 'defense' | 'raid'

export interface CalcSegment extends NavGroup {
  id: CalcSegmentId
}

/** 計算器四段（手機分段＝電腦左側的四組，內容一致） */
export const CALC_SEGMENTS: CalcSegment[] = [
  {
    id: 'development',
    titleKey: 'nav.groups.development',
    links: [
      { labelKey: 'nav.calcs.passiveCp', to: '/calculator/passive-cp', descKey: 'nav.desc.passiveCp' },
      { labelKey: 'nav.calcs.fields', to: ROUTES.CALCULATOR.FIELDS, descKey: 'nav.desc.fields' },
      { labelKey: 'nav.calcs.buildOrder', to: '/calculator/build-order', descKey: 'nav.desc.buildOrder' },
      { labelKey: 'nav.calcs.launchSim', to: '/calculator/launch-sim', descKey: 'nav.desc.launchSim' },
      { labelKey: 'nav.calcs.npc', to: '/calculator/npc', descKey: 'nav.desc.npc' },
      { labelKey: 'nav.calcs.tradeRoute', to: '/calculator/trade-route', descKey: 'nav.desc.tradeRoute' },
      { labelKey: 'nav.buildingCalc', to: ROUTES.CALCULATOR.BUILDING, descKey: 'nav.desc.buildingCalc' },
    ],
  },
  {
    id: 'combat',
    titleKey: 'nav.groups.combat',
    links: [
      { labelKey: 'nav.calcs.path', to: '/calculator/path', descKey: 'nav.desc.path' },
      { labelKey: 'nav.calcs.attackPlanner', to: '/calculator/attack-planner', descKey: 'nav.desc.attackPlanner' },
      { labelKey: 'nav.calcs.technology', to: '/calculator/technology', descKey: 'nav.desc.technology' },
      { labelKey: 'nav.cropBalance', to: ROUTES.CALCULATOR.CROP, descKey: 'nav.desc.cropBalance' },
    ],
  },
  {
    id: 'defense',
    titleKey: 'nav.groups.defense',
    links: [
      { labelKey: 'nav.calcs.incoming', to: ROUTES.CALCULATOR.INCOMING, descKey: 'nav.desc.incoming' },
      { labelKey: 'nav.calcs.pathSpeedTs', to: '/calculator/path-speed-ts', descKey: 'nav.desc.pathSpeedTs' },
      { labelKey: 'nav.calcs.interception', to: '/calculator/interception', descKey: 'nav.desc.interception' },
      { labelKey: 'nav.calcs.saveTroops', to: '/calculator/save-troops', descKey: 'nav.desc.saveTroops' },
      { labelKey: 'nav.calcs.cropScouter', to: '/calculator/crop-scouter', descKey: 'nav.desc.cropScouter' },
    ],
  },
  {
    id: 'raid',
    titleKey: 'nav.groups.raid',
    links: [
      { labelKey: 'nav.calcs.oasisRoi', to: '/calculator/oasis-roi', descKey: 'nav.desc.oasisRoi' },
      { labelKey: 'nav.calcs.farming', to: '/calculator/farming', descKey: 'nav.desc.farming' },
    ],
  },
]

/** 舊名稱保留（其他地方 import 用）：四段攤平 */
export const CALCULATOR_GROUPS: NavGroup[] = CALC_SEGMENTS

/** 遊戲資料（手機在「更多」，電腦在「資料」組） */
export const GAME_DATA_LINKS: NavLink[] = [
  { labelKey: 'nav.buildings', to: ROUTES.DATABASE.BUILDINGS },
  { labelKey: 'nav.troops', to: ROUTES.DATABASE.TROOPS },
  { labelKey: 'nav.resources', to: ROUTES.DATABASE.RESOURCES },
]

/** 電腦「資料」組：遊戲資料＋外部連結（8） */
export const DATA_LINKS: NavLink[] = [
  ...GAME_DATA_LINKS,
  { labelKey: 'nav.externalLinks', to: ROUTES.EXTERNAL_LINKS },
]

/** 攻略：P0 只有開局清單 */
export const STRATEGY_LINKS: NavLink[] = [
  { labelKey: 'nav.openingChecklist', to: ROUTES.STRATEGY.OPENING },
]

/** 「更多」裡最上面的兩個：地圖（map.sql）和帳號管理 */
export const MORE_LINKS: NavLink[] = [
  { labelKey: 'mapSql.title', to: ROUTES.MAP_SQL },
  { labelKey: 'gameAccounts.title', to: ROUTES.GAME_ACCOUNTS },
]

export const STATISTICS_LINKS: NavLink[] = [
  { labelKey: 'nav.stats.overview', to: '/statistics/overview' },
  { labelKey: 'nav.stats.players', to: '/statistics/players' },
  { labelKey: 'nav.stats.alliances', to: '/statistics/alliances' },
  { labelKey: 'nav.stats.conquests', to: '/statistics/conquests' },
  { labelKey: 'nav.stats.nameChanges', to: '/statistics/name-changes' },
  { labelKey: 'nav.stats.inactives', to: '/statistics/search/inactives' },
]

/** 「更多」頁的分組（外部工具另外放，見 ExternalLinkList） */
export const MORE_GROUPS: NavGroup[] = [
  { titleKey: 'nav.gameData', links: GAME_DATA_LINKS },
  { titleKey: 'nav.statistics', links: STATISTICS_LINKS },
]

/** 用到兵種資料（速度、花費、糧耗）的頁面：「已帶入」列多一行「待驗證」（TICKETS P0-15） */
export const UNIT_DATA_ROUTES: readonly string[] = [
  ROUTES.DATABASE.TROOPS,
  ROUTES.CALCULATOR.CROP,
  '/calculator/technology',
  '/calculator/path-speed-ts',
  '/calculator/launch-sim',
  '/calculator/trade-route',
  '/calculator/farming',
  '/calculator/path',
  '/calculator/interception',
  '/calculator/save-troops',
  '/calculator/attack-planner',
]

const startsWithSegment = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`)

export function usesUnitData(pathname: string): boolean {
  return UNIT_DATA_ROUTES.some((p) => startsWithSegment(pathname, p))
}

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

/** 某個計算器網址在哪一段（計算器列表預設打開那段） */
export function segmentFor(pathname: string): CalcSegmentId | null {
  for (const seg of CALC_SEGMENTS) {
    if (seg.links.some((l) => startsWithSegment(pathname, l.to))) return seg.id
  }
  return null
}

/** 側邊選單或「更多」頁的某個連結是不是目前這頁 */
export function isLinkActive(pathname: string, to: string): boolean {
  if (to === ROUTES.HOME) return pathname === ROUTES.HOME
  // 帳號管理底下的「新增」也算在帳號管理
  return startsWithSegment(pathname, to)
}
