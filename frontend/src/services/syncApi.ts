import api from './api'

export type SyncType =
  | 'village_overview'
  | 'village_center'
  | 'troops'
  | 'full'
  | 'map_sql'

export type SyncStatus = 'pending' | 'in_progress' | 'success' | 'failed'

export interface SyncLog {
  log_id: string
  user_id: string
  sync_type: SyncType
  account_id: string | null
  village_id: string | null
  status: SyncStatus
  items_synced: number
  items_created: number
  items_updated: number
  conflicts_resolved: number
  message: string | null
  error_details: string | null
  started_at: string
  completed_at: string | null
}

export interface SyncLogListResponse {
  logs: SyncLog[]
  total: number
}

export interface SyncStats {
  total_syncs: number
  successful_syncs: number
  failed_syncs: number
  last_sync_at: string | null
  items_synced_today: number
}

export interface ShouldSyncResponse {
  should_sync: boolean
}

export interface SyncResponse {
  success: boolean
  message: string
  synced_at: string
  village_id: string | null
}

export const syncApi = {
  // 同步日誌查詢
  getLogs: async (params?: {
    sync_type?: SyncType
    account_id?: string
    limit?: number
    offset?: number
  }): Promise<SyncLogListResponse> => {
    const { data } = await api.get('/sync-logs', { params })
    return data
  },

  getStats: async (accountId?: string): Promise<SyncStats> => {
    const { data } = await api.get('/sync-logs/stats', {
      params: { account_id: accountId },
    })
    return data
  },

  getLastSync: async (params?: {
    sync_type?: SyncType
    account_id?: string
    village_id?: string
  }): Promise<SyncLog | null> => {
    const { data } = await api.get('/sync-logs/last', { params })
    return data
  },

  shouldSync: async (
    syncType: SyncType,
    params?: {
      account_id?: string
      village_id?: string
      min_interval_minutes?: number
    }
  ): Promise<ShouldSyncResponse> => {
    const { data } = await api.get('/sync-logs/should-sync', {
      params: { sync_type: syncType, ...params },
    })
    return data
  },
}
