import type { Village } from '@/types/game'
import { updatedAgo } from '@/lib/accountDisplay'

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
  | { key: 'neverPasted' }
  | { key: 'pastedJustNow' }
  | { key: 'pastedMinutesAgo'; count: number }
  | { key: 'pastedHoursAgo'; count: number }
  | { key: 'pastedYesterday' }
  | { key: 'pastedDaysAgo'; count: number }

/** 「資料是 n 小時前貼上的」用的 i18n key（不到 1 分鐘＝剛剛、不到 1 小時用分鐘） */
export function pastedAgo(lastPastedAt: string | null | undefined, now: Date = new Date()): PastedAgo {
  const ago = updatedAgo(lastPastedAt ?? null, now)
  switch (ago.key) {
    case 'neverUpdated':
      return { key: 'neverPasted' }
    case 'updatedJustNow':
      return { key: 'pastedJustNow' }
    case 'updatedMinutesAgo':
      return { key: 'pastedMinutesAgo', count: ago.count }
    case 'updatedHoursAgo':
      return { key: 'pastedHoursAgo', count: ago.count }
    case 'updatedYesterday':
      return { key: 'pastedYesterday' }
    case 'updatedDaysAgo':
      return { key: 'pastedDaysAgo', count: ago.count }
  }
}
