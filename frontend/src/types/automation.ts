// ============ 自動化設定類型 ============

export type TransportRole = 'source' | 'target' | 'disabled'
export type TransportMode = 'overflow' | 'balanced' | 'manual'
export type UpgradePriorityType = 'balanced' | 'resources_first' | 'military_first'

export interface AutomationSettings {
  settings_id: string
  account_id: string
  keepalive_enabled: boolean
  keepalive_interval_seconds: number
  popup_auto_close: boolean
  popup_close_delay_seconds: number
  attack_warning_enabled: boolean
  attack_warning_sound: boolean
  mh_announcement_auto_continue: boolean
  created_at: string
  updated_at: string
}

export interface AutomationSettingsUpdate {
  keepalive_enabled?: boolean
  keepalive_interval_seconds?: number
  popup_auto_close?: boolean
  popup_close_delay_seconds?: number
  attack_warning_enabled?: boolean
  attack_warning_sound?: boolean
  mh_announcement_auto_continue?: boolean
}

// ============ 村莊自動升級配置類型 ============

export interface VillageAutoUpgradeConfig {
  config_id: string
  village_id: string
  account_id: string
  enabled: boolean
  skip_upgrade: boolean
  roman_dual_build_enabled: boolean
  plus_multi_build_enabled: boolean
  priority_type: UpgradePriorityType
  created_at: string
  updated_at: string
}

export interface VillageAutoUpgradeConfigCreate {
  village_id: string
  enabled?: boolean
  skip_upgrade?: boolean
  roman_dual_build_enabled?: boolean
  plus_multi_build_enabled?: boolean
  priority_type?: UpgradePriorityType
}

export interface VillageAutoUpgradeConfigUpdate {
  enabled?: boolean
  skip_upgrade?: boolean
  roman_dual_build_enabled?: boolean
  plus_multi_build_enabled?: boolean
  priority_type?: UpgradePriorityType
}

export interface VillageAutoUpgradeConfigListResponse {
  configs: VillageAutoUpgradeConfig[]
  total: number
}

// ============ Keep-alive 類型 ============

export interface KeepAliveLog {
  log_id: string
  account_id: string
  executed_at: string
  success: boolean
  response_time_ms: number | null
  error_message: string | null
  session_expired: boolean
}

export interface KeepAliveLogListResponse {
  logs: KeepAliveLog[]
  total: number
}

export interface KeepAliveStats {
  total_checks: number
  successful_checks: number
  failed_checks: number
  success_rate: number
  avg_response_time_ms: number | null
  last_check_at: string | null
  session_expired_count: number
}

export interface SessionStatus {
  session_expired: boolean
  last_keepalive_at: string | null
  last_keepalive_success: boolean | null
}

// ============ 運送配置類型 ============

export interface VillageTransportConfig {
  config_id: string
  village_id: string
  account_id: string
  transport_role: TransportRole
  max_full_time_hours: number
  reserve_wood: number
  reserve_clay: number
  reserve_iron: number
  reserve_crop: number
  priority: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface VillageTransportConfigCreate {
  village_id: string
  transport_role?: TransportRole
  max_full_time_hours?: number
  reserve_wood?: number
  reserve_clay?: number
  reserve_iron?: number
  reserve_crop?: number
  priority?: number
  enabled?: boolean
}

export interface VillageTransportConfigUpdate {
  transport_role?: TransportRole
  max_full_time_hours?: number
  reserve_wood?: number
  reserve_clay?: number
  reserve_iron?: number
  reserve_crop?: number
  priority?: number
  enabled?: boolean
}

export interface VillageTransportConfigListResponse {
  configs: VillageTransportConfig[]
  total: number
}

// ============ 運送排程類型 ============

export interface TransportSchedule {
  schedule_id: string
  account_id: string
  enabled: boolean
  interval_minutes: number
  transport_mode: TransportMode
  target_village_id: string | null
  last_executed_at: string | null
  next_execute_at: string | null
  created_at: string
  updated_at: string
}

export interface TransportScheduleCreate {
  enabled?: boolean
  interval_minutes?: number
  transport_mode?: TransportMode
  target_village_id?: string | null
}

export interface TransportScheduleUpdate {
  enabled?: boolean
  interval_minutes?: number
  transport_mode?: TransportMode
  target_village_id?: string | null
}

// ============ 運送計畫類型 ============

export interface VillageResourceStatus {
  village_id: string
  wood: number
  clay: number
  iron: number
  crop: number
  warehouse_capacity: number
  granary_capacity: number
  wood_production: number
  clay_production: number
  iron_production: number
  crop_production: number
}

export interface TransportPlanItem {
  source_village_id: string
  target_village_id: string
  wood: number
  clay: number
  iron: number
  crop: number
  reason: string
}

export interface TransportPlanResponse {
  plan: TransportPlanItem[]
  total_wood: number
  total_clay: number
  total_iron: number
  total_crop: number
}

// ============ 運送日誌類型 ============

export interface TransportLog {
  log_id: string
  account_id: string
  source_village_id: string
  target_village_id: string | null
  target_x: number
  target_y: number
  wood: number
  clay: number
  iron: number
  crop: number
  success: boolean
  error_message: string | null
  executed_at: string
}

export interface TransportLogListResponse {
  logs: TransportLog[]
  total: number
}

export interface TransportStats {
  total_transports: number
  successful_transports: number
  failed_transports: number
  total_wood: number
  total_clay: number
  total_iron: number
  total_crop: number
}

// ============ 執行佇列類型 ============

export type ExecutionType = 'build' | 'train' | 'transport' | 'keepalive'
export type ExecutionStatus = 'pending' | 'confirmed' | 'executing' | 'completed' | 'failed' | 'cancelled'

export interface ExecutionTask {
  task_id: string
  account_id: string
  village_id: string | null
  execution_type: ExecutionType
  target_id: string | null
  target_name: string | null
  target_level: number | null
  position: number | null
  quantity: number | null
  cost_wood: number
  cost_clay: number
  cost_iron: number
  cost_crop: number
  total_cost: number
  priority: number
  status: ExecutionStatus
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  result_message: string | null
  error_message: string | null
  screenshot_path: string | null
  created_at: string
  updated_at: string
}

export interface ExecutionTaskCreate {
  account_id: string
  village_id?: string
  execution_type: ExecutionType
  target_id?: string
  target_name?: string
  target_level?: number
  position?: number
  quantity?: number
  cost_wood?: number
  cost_clay?: number
  cost_iron?: number
  cost_crop?: number
  priority?: number
  scheduled_at?: string
}

export interface ExecutionTaskUpdate {
  priority?: number
  status?: ExecutionStatus
  scheduled_at?: string
}

export interface ExecutionTaskListResponse {
  tasks: ExecutionTask[]
  total: number
  pending_count: number
  confirmed_count: number
  executing_count: number
}

export interface ExecutionTaskConfirmRequest {
  task_ids: string[]
}

export interface ExecutionTaskConfirmResponse {
  confirmed_count: number
  failed_count: number
  failed_task_ids: string[]
  message: string
}

export interface SafetyCheckResult {
  can_execute: boolean
  reason: string | null
  cooldown_remaining_seconds: number | null
}

export interface ExecutionQueueStats {
  total_tasks: number
  pending_tasks: number
  confirmed_tasks: number
  executing_tasks: number
  completed_tasks: number
  failed_tasks: number
  cancelled_tasks: number
}

// ============ 執行日誌類型 ============

export interface ExecutionLog {
  log_id: string
  task_id: string
  account_id: string
  execution_type: ExecutionType
  target_name: string | null
  success: boolean
  duration_ms: number | null
  result_message: string | null
  error_message: string | null
  screenshot_path: string | null
  executed_at: string
}

export interface ExecutionLogListResponse {
  logs: ExecutionLog[]
  total: number
  success_count: number
  failure_count: number
}

// ============ 版本資訊類型 ============

export interface VersionInfo {
  current_version: string
  latest_version: string | null
  update_available: boolean
  release_notes: string | null
  download_url: string | null
}

// ============ 快取統計類型 ============

export interface CacheStats {
  total_entries: number
  hit_count: number
  miss_count: number
  hit_rate: number
}
