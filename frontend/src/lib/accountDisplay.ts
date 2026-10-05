import type { GameAccount } from '@/types/game'

/** 頂部和切換清單用的暱稱；沒填就用世界名稱或網址代替 */
export function accountPlayerLabel(account: GameAccount, fallback: string): string {
  return account.player_name?.trim() || fallback
}

/** 世界名稱；沒填就從網址取出主機名稱（例如 ts3.x1.international.travian.com → ts3） */
export function accountWorldLabel(account: GameAccount): string {
  if (account.server_name?.trim()) return account.server_name.trim()
  try {
    return new URL(account.server_url).hostname.split('.')[0] || account.server_url
  } catch {
    return account.server_url
  }
}

/** 後端回的時間；沒有時區標記時是 UTC。空的或讀不懂回 null */
export function parseServerTime(value: string | null | undefined): Date | null {
  if (!value) return null
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(value)
  const then = new Date(hasZone ? value : `${value}Z`)
  return Number.isNaN(then.getTime()) ? null : then
}

export type UpdatedAgo =
  | { key: 'neverUpdated' }
  | { key: 'updatedJustNow' }
  | { key: 'updatedMinutesAgo'; count: number }
  | { key: 'updatedHoursAgo'; count: number }
  | { key: 'updatedYesterday' }
  | { key: 'updatedDaysAgo'; count: number }

/** 把最後更新時間換成「2 分鐘前更新」「昨天更新」「3 天前」這類說法的 i18n key */
export function updatedAgo(lastUpdated: string | null, now: Date = new Date()): UpdatedAgo {
  const then = parseServerTime(lastUpdated)
  if (!then) return { key: 'neverUpdated' }
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000)
  if (minutes < 1) return { key: 'updatedJustNow' }
  if (minutes < 60) return { key: 'updatedMinutesAgo', count: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { key: 'updatedHoursAgo', count: hours }
  const days = Math.floor(hours / 24)
  if (days === 1) return { key: 'updatedYesterday' }
  return { key: 'updatedDaysAgo', count: days }
}

/** 瀏覽器目前的 IANA 時區，例如 Asia/Taipei；取不到就回 UTC */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
