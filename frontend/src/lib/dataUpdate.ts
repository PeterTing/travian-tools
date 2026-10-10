import { INGAME_BUILDINGS, ingameTribeName, ingameUnitNameByGameId } from '@/lib/ingameNames'
import { readPref } from '@/lib/localPrefs'

/**
 * 資料更新卡的上線日（台北時間，YYYY-MM-DD）。#33、#34 一起在第 ③ 階段上線：deploy 當天改這一行就好——
 * 卡片標題（M/D 資料更新）、「知道了」記住的 key、14 天後自動不顯示的時間都從這裡算。
 */
export const DATA_UPDATE_RELEASE_DATE = '2026-10-10'

const [, releaseMonth, releaseDay] = DATA_UPDATE_RELEASE_DATE.split('-').map(Number)

/** 卡片標題：上線日的 M/D */
export const DATA_UPDATE_TITLE = `${releaseMonth}/${releaseDay} 資料更新`
/** 按「知道了」後記在這台裝置；上線日換了 key 就跟著換（新的一次更新會再顯示） */
export const DATA_UPDATE_PREF_KEY = `tt:dataUpdate:${DATA_UPDATE_RELEASE_DATE}`
/** 上線日起 14 天（台北時間第 15 天 0:00）後自動不顯示 */
export const DATA_UPDATE_HIDE_AT = new Date(new Date(`${DATA_UPDATE_RELEASE_DATE}T00:00:00+08:00`).getTime() + 14 * 86_400_000)

export interface DataUpdateItem {
  /** 改了什麼 */
  label: string
  /** 舊值、新值；只有一句話的項目（例如行軍時間修正）兩個都不填 */
  before?: string
  after?: string
  /** 只在伺服器倍速 ≥ 這個值的世界顯示（例如 x3 以上才有的修正） */
  minServerSpeed?: number
  /** 縮排的第二行（例如羅馬人另外一組數字） */
  sub?: { label: string; before: string; after: string }
  /** 灰色小字補充（例如「田地回本會變短」） */
  note?: string
}

const smithy = INGAME_BUILDINGS.blacksmith!
const tradeOffice = INGAME_BUILDINGS.trade_office!

/**
 * 資料更新卡（#33 + #34 合成一張，PM）：前 3 項直接顯示，「再看 3 項」展開後 3 項。
 * 每一項的出處寫在 PR 說明。名稱一律讀遊戲內名稱表；舊名從表的 aliases 取（站上其他地方不顯示舊名）。
 */
export const DATA_UPDATE_ITEMS: DataUpdateItem[] = [
  // 官方說明頁 S20：兵速 x2/x3/x5 ×2、x10 ×4（之前直接乘倍速）。x1、x2 沒變，只給 x3 以上的世界看；放第一項，收合時也看得到（PM）
  { label: 'x3 以上世界的行軍時間已修正（之前算得太短，請重新確認排好的攻擊）', minServerSpeed: 3 },
  // ts11 manual/troop/64
  { label: `${ingameUnitNameByGameId(64)}運載量`, before: '115', after: '75' },
  // 舊的後端兵種資料 5800 → ts11 manual/troop/10 開拓者花費 4600 木材
  { label: `${ingameTribeName('romans')}${ingameUnitNameByGameId(10)}木材花費`, before: '5800', after: '4600' },
  // 官方說明頁 S3
  { label: `${ingameTribeName('huns')}商人容量`, before: '750', after: '500' },
  // 官方知識庫交易所效果欄（+20%／+40% 每級）、官方說明頁 S213
  { label: `${tradeOffice.zh}每級`, before: '10%', after: '20%', sub: { label: ingameTribeName('romans'), before: '20%', after: '40%' } },
  // 官方說明頁 S129：Plus 乘在總產量上
  { label: '田地回本、建造順序的 Plus', before: '加總', after: '相乘', note: '田地回本會變短' },
  { label: '建築名稱', before: smithy.aliases[0]!, after: smithy.zh },
]

/** 這個世界要顯示的項目（倍速不夠的項目拿掉；不知道倍速就當 x1） */
export function dataUpdateItemsFor(serverSpeed?: number | null): DataUpdateItem[] {
  const speed = serverSpeed ?? 1
  return DATA_UPDATE_ITEMS.filter((it) => it.minServerSpeed === undefined || speed >= it.minServerSpeed)
}

/** 不展開時顯示幾項 */
export const DATA_UPDATE_VISIBLE = 3

export function shouldShowDataUpdate(now: Date = new Date()): boolean {
  if (now.getTime() >= DATA_UPDATE_HIDE_AT.getTime()) return false
  return readPref(DATA_UPDATE_PREF_KEY) !== 'dismissed'
}
