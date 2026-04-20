import api from './api'
import type {
  AutomationSettings,
  AutomationSettingsUpdate,
  CacheStats,
  ExecutionLogListResponse,
  ExecutionQueueStats,
  ExecutionTask,
  ExecutionTaskConfirmResponse,
  ExecutionTaskCreate,
  ExecutionTaskListResponse,
  ExecutionTaskUpdate,
  ExecutionStatus,
  ExecutionType,
  KeepAliveLogListResponse,
  KeepAliveStats,
  SafetyCheckResult,
  SessionStatus,
  TransportLogListResponse,
  TransportPlanResponse,
  TransportSchedule,
  TransportScheduleCreate,
  TransportScheduleUpdate,
  TransportStats,
  VersionInfo,
  VillageAutoUpgradeConfig,
  VillageAutoUpgradeConfigCreate,
  VillageAutoUpgradeConfigListResponse,
  VillageAutoUpgradeConfigUpdate,
  VillageResourceStatus,
  VillageTransportConfig,
  VillageTransportConfigCreate,
  VillageTransportConfigListResponse,
  VillageTransportConfigUpdate,
} from '@/types/automation'

// ============ 自動化設定 API ============

export const automationApi = {
  /**
   * 取得自動化設定
   */
  getSettings: async (accountId: string): Promise<AutomationSettings> => {
    const response = await api.get<AutomationSettings>(
      `/automation/settings/${accountId}`
    )
    return response.data
  },

  /**
   * 更新自動化設定
   */
  updateSettings: async (
    accountId: string,
    data: AutomationSettingsUpdate
  ): Promise<AutomationSettings> => {
    const response = await api.patch<AutomationSettings>(
      `/automation/settings/${accountId}`,
      data
    )
    return response.data
  },

  // ============ 村莊自動升級配置 ============

  /**
   * 取得帳號所有村莊自動升級配置
   */
  getAutoUpgradeConfigs: async (
    accountId: string
  ): Promise<VillageAutoUpgradeConfigListResponse> => {
    const response = await api.get<VillageAutoUpgradeConfigListResponse>(
      `/automation/auto-upgrade/${accountId}`
    )
    return response.data
  },

  /**
   * 取得村莊自動升級配置
   */
  getAutoUpgradeConfig: async (
    accountId: string,
    villageId: string
  ): Promise<VillageAutoUpgradeConfig> => {
    const response = await api.get<VillageAutoUpgradeConfig>(
      `/automation/auto-upgrade/${accountId}/${villageId}`
    )
    return response.data
  },

  /**
   * 建立或更新村莊自動升級配置
   */
  createOrUpdateAutoUpgradeConfig: async (
    accountId: string,
    data: VillageAutoUpgradeConfigCreate
  ): Promise<VillageAutoUpgradeConfig> => {
    const response = await api.post<VillageAutoUpgradeConfig>(
      `/automation/auto-upgrade/${accountId}`,
      data
    )
    return response.data
  },

  /**
   * 更新村莊自動升級配置
   */
  updateAutoUpgradeConfig: async (
    accountId: string,
    villageId: string,
    data: VillageAutoUpgradeConfigUpdate
  ): Promise<VillageAutoUpgradeConfig> => {
    const response = await api.patch<VillageAutoUpgradeConfig>(
      `/automation/auto-upgrade/${accountId}/${villageId}`,
      data
    )
    return response.data
  },

  /**
   * 切換村莊自動升級開關
   */
  toggleAutoUpgrade: async (
    accountId: string,
    villageId: string,
    enabled: boolean
  ): Promise<VillageAutoUpgradeConfig> => {
    const response = await api.post<VillageAutoUpgradeConfig>(
      `/automation/auto-upgrade/${accountId}/${villageId}/toggle`,
      null,
      { params: { enabled } }
    )
    return response.data
  },

  /**
   * 切換村莊略過升級
   */
  toggleSkipUpgrade: async (
    accountId: string,
    villageId: string,
    skip: boolean
  ): Promise<VillageAutoUpgradeConfig> => {
    const response = await api.post<VillageAutoUpgradeConfig>(
      `/automation/auto-upgrade/${accountId}/${villageId}/skip`,
      null,
      { params: { skip } }
    )
    return response.data
  },

  // ============ Keep-alive ============

  /**
   * 取得 Keep-alive 日誌
   */
  getKeepaliveLogs: async (
    accountId: string,
    limit = 100
  ): Promise<KeepAliveLogListResponse> => {
    const response = await api.get<KeepAliveLogListResponse>(
      `/automation/keepalive/logs/${accountId}`,
      { params: { limit } }
    )
    return response.data
  },

  /**
   * 取得 Keep-alive 統計
   */
  getKeepaliveStats: async (accountId: string): Promise<KeepAliveStats> => {
    const response = await api.get<KeepAliveStats>(
      `/automation/keepalive/stats/${accountId}`
    )
    return response.data
  },

  /**
   * 取得 session 狀態
   */
  getSessionStatus: async (accountId: string): Promise<SessionStatus> => {
    const response = await api.get<SessionStatus>(
      `/automation/keepalive/status/${accountId}`
    )
    return response.data
  },

  /**
   * 執行 Keep-alive（瀏覽器自動化）
   */
  executeKeepalive: async (
    accountId: string,
    serverUrl: string
  ): Promise<{
    success: boolean
    message: string
    session_expired: boolean
    log_id: string
  }> => {
    const response = await api.post(
      `/automation/keepalive/execute/${accountId}`,
      null,
      { params: { server_url: serverUrl } }
    )
    return response.data
  },

  // ============ 彈窗和攻擊警告 ============

  /**
   * 處理彈窗
   */
  handlePopups: async (
    accountId: string,
    delaySeconds = 60
  ): Promise<{ success: boolean; message: string; closed_count: number }> => {
    const response = await api.post(
      `/automation/popup/handle/${accountId}`,
      null,
      { params: { delay_seconds: delaySeconds } }
    )
    return response.data
  },

  /**
   * 處理 MH 公告
   */
  handleMhAnnouncement: async (
    accountId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/automation/mh/handle/${accountId}`)
    return response.data
  },

  /**
   * 檢查攻擊
   */
  checkAttacks: async (
    accountId: string,
    serverUrl: string
  ): Promise<{
    success: boolean
    message: string
    has_attacks: boolean
    attacks: Array<{ selector: string; count: number }>
  }> => {
    const response = await api.get(`/automation/attack/check/${accountId}`, {
      params: { server_url: serverUrl },
    })
    return response.data
  },

  // ============ 版本檢查 ============

  /**
   * 取得版本資訊
   */
  getVersion: async (): Promise<VersionInfo> => {
    const response = await api.get<VersionInfo>('/automation/version')
    return response.data
  },

  /**
   * 檢查更新
   */
  checkUpdate: async (): Promise<VersionInfo> => {
    const response = await api.get<VersionInfo>('/automation/version/check')
    return response.data
  },

  // ============ URL 快取 ============

  /**
   * 取得 URL 快取統計
   */
  getCacheStats: async (): Promise<CacheStats> => {
    const response = await api.get<CacheStats>('/automation/cache/stats')
    return response.data
  },

  /**
   * 清空 URL 快取
   */
  clearCache: async (): Promise<{ cleared_count: number }> => {
    const response = await api.post('/automation/cache/clear')
    return response.data
  },
}

// ============ 運送 API ============

export const transportApi = {
  /**
   * 取得帳號所有村莊運送配置
   */
  getConfigs: async (
    accountId: string
  ): Promise<VillageTransportConfigListResponse> => {
    const response = await api.get<VillageTransportConfigListResponse>(
      `/transport/configs/${accountId}`
    )
    return response.data
  },

  /**
   * 取得村莊運送配置
   */
  getConfig: async (
    accountId: string,
    villageId: string
  ): Promise<VillageTransportConfig> => {
    const response = await api.get<VillageTransportConfig>(
      `/transport/configs/${accountId}/${villageId}`
    )
    return response.data
  },

  /**
   * 建立或更新村莊運送配置
   */
  createOrUpdateConfig: async (
    accountId: string,
    data: VillageTransportConfigCreate
  ): Promise<VillageTransportConfig> => {
    const response = await api.post<VillageTransportConfig>(
      `/transport/configs/${accountId}`,
      data
    )
    return response.data
  },

  /**
   * 更新村莊運送配置
   */
  updateConfig: async (
    accountId: string,
    villageId: string,
    data: VillageTransportConfigUpdate
  ): Promise<VillageTransportConfig> => {
    const response = await api.patch<VillageTransportConfig>(
      `/transport/configs/${accountId}/${villageId}`,
      data
    )
    return response.data
  },

  /**
   * 刪除村莊運送配置
   */
  deleteConfig: async (accountId: string, villageId: string): Promise<void> => {
    await api.delete(`/transport/configs/${accountId}/${villageId}`)
  },

  /**
   * 批量更新村莊搬運優先順序
   */
  batchUpdatePriorities: async (
    accountId: string,
    priorities: Record<string, number>
  ): Promise<{ updated_count: number }> => {
    const response = await api.post(
      `/transport/configs/${accountId}/priorities`,
      { priorities }
    )
    return response.data
  },

  // ============ 運送排程 ============

  /**
   * 取得運送排程
   */
  getSchedule: async (accountId: string): Promise<TransportSchedule | null> => {
    const response = await api.get<TransportSchedule | null>(
      `/transport/schedule/${accountId}`
    )
    return response.data
  },

  /**
   * 建立或更新運送排程
   */
  createOrUpdateSchedule: async (
    accountId: string,
    data: TransportScheduleCreate
  ): Promise<TransportSchedule> => {
    const response = await api.post<TransportSchedule>(
      `/transport/schedule/${accountId}`,
      data
    )
    return response.data
  },

  /**
   * 更新運送排程
   */
  updateSchedule: async (
    accountId: string,
    data: TransportScheduleUpdate
  ): Promise<TransportSchedule> => {
    const response = await api.patch<TransportSchedule>(
      `/transport/schedule/${accountId}`,
      data
    )
    return response.data
  },

  // ============ 運送計畫 ============

  /**
   * 計算運送計畫
   */
  calculatePlan: async (
    accountId: string,
    villageResources: VillageResourceStatus[]
  ): Promise<TransportPlanResponse> => {
    const response = await api.post<TransportPlanResponse>(
      `/transport/plan/${accountId}`,
      { village_resources: villageResources }
    )
    return response.data
  },

  // ============ 立即運送 ============

  /**
   * 立即運送（建立任務）
   */
  immediateTransport: async (
    accountId: string,
    data: {
      source_village_id: string
      target_village_id?: string
      target_x: number
      target_y: number
      wood: number
      clay: number
      iron: number
      crop: number
    }
  ) => {
    const response = await api.post(`/transport/immediate/${accountId}`, data)
    return response.data
  },

  /**
   * 立即執行運送（瀏覽器自動化）
   */
  executeImmediateTransport: async (
    accountId: string,
    serverUrl: string,
    data: {
      source_village_id: string
      target_village_id?: string
      target_x: number
      target_y: number
      wood: number
      clay: number
      iron: number
      crop: number
    }
  ) => {
    const response = await api.post(
      `/transport/immediate/${accountId}/execute`,
      data,
      { params: { server_url: serverUrl } }
    )
    return response.data
  },

  // ============ 運送日誌 ============

  /**
   * 取得運送日誌
   */
  getLogs: async (
    accountId: string,
    options?: { success?: boolean; limit?: number; offset?: number }
  ): Promise<TransportLogListResponse> => {
    const response = await api.get<TransportLogListResponse>(
      `/transport/logs/${accountId}`,
      { params: options }
    )
    return response.data
  },

  /**
   * 取得運送統計
   */
  getStats: async (
    accountId: string,
    days = 7
  ): Promise<TransportStats> => {
    const response = await api.get<TransportStats>(
      `/transport/stats/${accountId}`,
      { params: { days } }
    )
    return response.data
  },
}

// ============ 執行佇列 API ============

export const executionApi = {
  /**
   * 新增執行任務到佇列
   */
  createTask: async (data: ExecutionTaskCreate): Promise<ExecutionTask> => {
    const response = await api.post<ExecutionTask>('/execute/queue', data)
    return response.data
  },

  /**
   * 取得執行任務列表
   */
  getTasks: async (
    accountId: string,
    options?: {
      status?: ExecutionStatus
      limit?: number
      offset?: number
    }
  ): Promise<ExecutionTaskListResponse> => {
    const response = await api.get<ExecutionTaskListResponse>('/execute/queue', {
      params: { account_id: accountId, ...options },
    })
    return response.data
  },

  /**
   * 取得執行任務詳情
   */
  getTask: async (taskId: string): Promise<ExecutionTask> => {
    const response = await api.get<ExecutionTask>(`/execute/queue/${taskId}`)
    return response.data
  },

  /**
   * 更新執行任務
   */
  updateTask: async (
    taskId: string,
    data: ExecutionTaskUpdate
  ): Promise<ExecutionTask> => {
    const response = await api.put<ExecutionTask>(
      `/execute/queue/${taskId}`,
      data
    )
    return response.data
  },

  /**
   * 刪除執行任務
   */
  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/execute/queue/${taskId}`)
  },

  /**
   * 批量確認任務
   */
  confirmTasks: async (
    taskIds: string[]
  ): Promise<ExecutionTaskConfirmResponse> => {
    const response = await api.post<ExecutionTaskConfirmResponse>(
      '/execute/queue/confirm',
      { task_ids: taskIds }
    )
    return response.data
  },

  /**
   * 批量取消任務
   */
  cancelTasks: async (
    taskIds: string[]
  ): Promise<ExecutionTaskConfirmResponse> => {
    const response = await api.post<ExecutionTaskConfirmResponse>(
      '/execute/queue/cancel',
      { task_ids: taskIds }
    )
    return response.data
  },

  /**
   * 執行安全檢查
   */
  checkSafety: async (accountId: string): Promise<SafetyCheckResult> => {
    const response = await api.get<SafetyCheckResult>(
      `/execute/safety-check/${accountId}`
    )
    return response.data
  },

  /**
   * 取得佇列統計
   */
  getStats: async (accountId: string): Promise<ExecutionQueueStats> => {
    const response = await api.get<ExecutionQueueStats>(
      `/execute/stats/${accountId}`
    )
    return response.data
  },

  /**
   * 取得執行日誌
   */
  getLogs: async (options?: {
    account_id?: string
    execution_type?: ExecutionType
    success?: boolean
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }): Promise<ExecutionLogListResponse> => {
    const response = await api.get<ExecutionLogListResponse>('/execute/logs', {
      params: options,
    })
    return response.data
  },

  /**
   * 執行單一任務
   */
  runTask: async (taskId: string): Promise<ExecutionTask> => {
    const response = await api.post<ExecutionTask>(`/execute/run/${taskId}`)
    return response.data
  },
}

export default { automationApi, transportApi, executionApi }
