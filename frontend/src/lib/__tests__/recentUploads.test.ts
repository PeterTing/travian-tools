import { describe, expect, it } from 'vitest'
import {
  formatRecentUploadLine,
  isSuccessfulSync,
  recentUploadSummary,
  relativeAgo,
} from '../recentUploads'
import type { SyncLog } from '@/services/syncApi'

const baseLog = (over: Partial<SyncLog> = {}): SyncLog =>
  ({
    log_id: 'l1',
    user_id: 'u1',
    sync_type: 'rally_point',
    account_id: 'a1',
    village_id: null,
    status: 'success',
    items_synced: 3,
    items_created: 2,
    items_updated: 1,
    conflicts_resolved: 0,
    message: null,
    error_details: null,
    started_at: '2026-10-05T04:00:00Z',
    completed_at: '2026-10-05T04:00:00Z',
    ...over,
  }) as SyncLog

describe('relativeAgo', () => {
  const now = new Date('2026-10-05T04:10:00Z')
  it('formats minutes without 更新 suffix intent', () => {
    expect(relativeAgo('2026-10-05T04:07:00Z', now)).toEqual({
      key: 'minutesAgo',
      count: 3,
    })
  })
})

describe('formatRecentUploadLine', () => {
  it('uses 類型 · 摘要 for rally', () => {
    expect(formatRecentUploadLine(baseLog())).toBe('集結點 · 3 筆來襲')
  })
  it('prefers village name for overview', () => {
    expect(
      formatRecentUploadLine(
        baseLog({ sync_type: 'village_overview', items_synced: 1 }),
        '主村',
      ),
    ).toBe('村莊總覽 · 主村')
  })
})

describe('recentUploadSummary', () => {
  it('reports created/updated for reports (FULL)', () => {
    expect(
      recentUploadSummary(
        baseLog({
          sync_type: 'full',
          items_created: 2,
          items_updated: 1,
          items_synced: 3,
        }),
      ),
    ).toBe('新增 2 · 更新 1')
  })
})

describe('isSuccessfulSync', () => {
  it('accepts success', () => {
    expect(isSuccessfulSync(baseLog({ status: 'success' }))).toBe(true)
    expect(isSuccessfulSync(baseLog({ status: 'failed' as never }))).toBe(false)
  })
})
