/**
 * P0-06 最近上傳列：線框「類型 · 摘要」＋相對時間（例：3 分鐘前）。
 */
import type { SyncLog, SyncType } from '@/services/syncApi'
import { pageTypeLabel } from '@/lib/pasteFormat'
import { parseServerTime } from '@/lib/accountDisplay'

export type RelativeAgo =
  | { key: 'justNow' }
  | { key: 'minutesAgo'; count: number }
  | { key: 'hoursAgo'; count: number }
  | { key: 'yesterday' }
  | { key: 'daysAgo'; count: number }

/** 相對時間（不加「更新」）；線框①用「n 分鐘前」 */
export function relativeAgo(iso: string | null | undefined, now: Date = new Date()): RelativeAgo | null {
  const then = parseServerTime(iso)
  if (!then) return null
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000)
  if (minutes < 1) return { key: 'justNow' }
  if (minutes < 60) return { key: 'minutesAgo', count: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { key: 'hoursAgo', count: hours }
  const days = Math.floor(hours / 24)
  if (days === 1) return { key: 'yesterday' }
  return { key: 'daysAgo', count: days }
}

function syncTypeToPageType(syncType: SyncType | string): string {
  const raw = String(syncType)
  const lower = raw.toLowerCase()
  if (lower === 'rally_point' || raw === 'RALLY_POINT') return 'rally_point'
  if (lower === 'village_overview' || raw === 'VILLAGE_OVERVIEW') return 'village_overview'
  if (lower === 'village_center' || raw === 'VILLAGE_CENTER') return 'village_center'
  if (lower === 'troops' || raw === 'TROOPS') return 'troop_statistics'
  if (lower === 'full' || raw === 'FULL') {
    // reports are logged as FULL
    return 'reports'
  }
  if (lower === 'map_sql' || raw === 'MAP_SQL') return 'map_sql'
  return lower
}

export function recentUploadTypeLabel(syncType: SyncType | string): string {
  const page = syncTypeToPageType(syncType)
  if (page === 'map_sql') return '地圖'
  return pageTypeLabel(page)
}

/** 摘要：來襲筆數／村莊名／新增更新 */
export function recentUploadSummary(
  log: SyncLog,
  villageName?: string | null,
): string {
  const page = syncTypeToPageType(log.sync_type)
  const created = log.items_created ?? 0
  const updated = log.items_updated ?? 0
  const synced = log.items_synced ?? created + updated

  if (page === 'rally_point') {
    return `${synced} 筆來襲`
  }
  if (page === 'village_overview' || page === 'village_center') {
    if (villageName) return villageName
    if (created || updated) return `新增 ${created} · 更新 ${updated}`
    return synced ? `${synced} 項` : '已存入'
  }
  if (page === 'reports') {
    if (created || updated) return `新增 ${created} · 更新 ${updated}`
    return synced ? `${synced} 筆` : '已存入'
  }
  if (created || updated) return `新增 ${created} · 更新 ${updated}`
  if (villageName) return villageName
  return synced ? `${synced} 項` : '已存入'
}

export function formatRecentUploadLine(
  log: SyncLog,
  villageName?: string | null,
): string {
  return `${recentUploadTypeLabel(log.sync_type)} · ${recentUploadSummary(log, villageName)}`
}

export function isSuccessfulSync(log: SyncLog): boolean {
  const s = String(log.status).toLowerCase()
  return s === 'success'
}
