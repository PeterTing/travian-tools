import type { Village } from '@/types/game'
import { parseServerTime, updatedAgo } from '@/lib/accountDisplay'

/** 線框稿用的負號是 U+2212（−），不是連字號 */
const MINUS = '\u2212'

const numberFormat = new Intl.NumberFormat('en-US')

/** 1240 → 「1,240」；負數用 U+2212 */
export function formatNumber(value: number): string {
  const text = numberFormat.format(Math.abs(value))
  return value < 0 ? `${MINUS}${text}` : text
}

/** 每小時變化量：正數帶「+」，負數用「−」，0 就是「0」 */
export function formatSignedNumber(value: number): string {
  if (value > 0) return `+${formatNumber(value)}`
  return formatNumber(value)
}

/** 座標 (10|−3)；任一軸沒有資料就回 null（不顯示座標） */
export function formatCoordinates(x: number | null, y: number | null): string | null {
  if (x === null || x === undefined || y === null || y === undefined) return null
  return `(${formatNumber(x)}|${formatNumber(y)})`
}

export type VillageSortKey = 'population' | 'crop' | 'name'

/** 列表排序：人口、糧由大到小；名稱照筆畫／字母；沒有資料的排最後 */
export function sortVillages(villages: Village[], key: VillageSortKey): Village[] {
  const rows = [...villages]
  if (key === 'name') {
    return rows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'zh-Hant'))
  }
  if (key === 'crop') {
    const crop = (v: Village) => v.crop_net_per_hour ?? Number.NEGATIVE_INFINITY
    return rows.sort((a, b) => crop(b) - crop(a))
  }
  return rows.sort((a, b) => b.population - a.population)
}

export type PastedAgo =
  | { key: 'noOverview' }
  | { key: 'oldestJustNow' }
  | { key: 'oldestMinutesAgo'; count: number }
  | { key: 'oldestHoursAgo'; count: number }
  | { key: 'oldestYesterday' }
  | { key: 'oldestDaysAgo'; count: number }

/**
 * 「最舊的資料是 n 小時前貼上的」用的 i18n key（不到 1 分鐘＝剛剛、不到 1 小時用分鐘）。
 * 時間只算村莊總覽（dorf1）的上傳；一個都沒有（手動新增、只有村莊中心）是 noOverview。
 */
export function pastedAgo(oldestPastedAt: string | null | undefined, now: Date = new Date()): PastedAgo {
  const ago = updatedAgo(oldestPastedAt ?? null, now)
  switch (ago.key) {
    case 'neverUpdated':
      return { key: 'noOverview' }
    case 'updatedJustNow':
      return { key: 'oldestJustNow' }
    case 'updatedMinutesAgo':
      return { key: 'oldestMinutesAgo', count: ago.count }
    case 'updatedHoursAgo':
      return { key: 'oldestHoursAgo', count: ago.count }
    case 'updatedYesterday':
      return { key: 'oldestYesterday' }
    case 'updatedDaysAgo':
      return { key: 'oldestDaysAgo', count: ago.count }
  }
}

const HOUR = 60 * 60 * 1000
/** 最舊的資料超過這麼久變黃 */
export const WARN_AFTER_MS = 6 * HOUR
/** 超過這麼久變紅、多一句「數字可能已經不準。」；單一村莊超過這麼久，那一列標出幾天前 */
export const STALE_AFTER_MS = 24 * HOUR

/** 提示的三種程度：中性（6 小時內）、黃（6 到 24 小時）、紅（超過 24 小時） */
export type FreshnessLevel = 'neutral' | 'warn' | 'stale'

/** 依最舊資料的時間決定提示的程度；沒有村莊總覽資料算中性 */
export function freshnessLevel(oldestPastedAt: string | null | undefined, now: Date = new Date()): FreshnessLevel {
  const then = parseServerTime(oldestPastedAt)
  if (!then) return 'neutral'
  const age = now.getTime() - then.getTime()
  if (age < WARN_AFTER_MS) return 'neutral'
  if (age <= STALE_AFTER_MS) return 'warn'
  return 'stale'
}

export type RowAge = { key: 'rowYesterday' } | { key: 'rowDaysAgo'; count: number }

/** 單一村莊的資料超過 24 小時才回「昨天」「n 天前」；其他（含從沒貼上過）回 null，不顯示 */
export function staleRowAge(lastPastedAt: string | null | undefined, now: Date = new Date()): RowAge | null {
  const then = parseServerTime(lastPastedAt)
  if (!then || now.getTime() - then.getTime() <= STALE_AFTER_MS) return null
  const ago = updatedAgo(lastPastedAt ?? null, now)
  if (ago.key === 'updatedDaysAgo') return { key: 'rowDaysAgo', count: ago.count }
  return { key: 'rowYesterday' }
}
