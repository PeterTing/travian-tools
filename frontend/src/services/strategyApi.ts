import api from './api'

// ============ Types ============

export interface PhaseStandard {
  min_villages: number
  target_villages: number
  min_population: number
  target_population: number
  key_objectives: string[]
}

export interface PhaseDetectionResponse {
  phase: string
  phase_name_zh: string
  phase_description: string
  day: number
  village_count: number
  total_population: number
  progress_status: 'ahead' | 'normal' | 'behind'
  progress_description: string
  standard: PhaseStandard
  recommendations: string[]
}

export interface HealthCheckItem {
  name: string
  status: 'good' | 'warning' | 'critical'
  score: number
  message: string
  suggestions: string[]
}

export interface HealthCheckResponse {
  overall_score: number
  overall_status: 'healthy' | 'warning' | 'critical'
  checks: HealthCheckItem[]
  priority_actions: string[]
}

// ============ API Functions ============

export const detectPhase = async (
  accountId: string,
  beginnerProtectionDays?: number,
): Promise<PhaseDetectionResponse> => {
  const response = await api.post<PhaseDetectionResponse>('/strategy/phase', {
    account_id: accountId,
    ...(beginnerProtectionDays != null ? { beginner_protection_days: beginnerProtectionDays } : {}),
  })
  return response.data
}

export const healthCheck = async (
  accountId: string,
  /** 不填就讓後端依伺服器速度用官方 S20 天數（x1 5／x2 3／x3 3／x5 2／x10 1） */
  beginnerProtectionDays?: number,
): Promise<HealthCheckResponse> => {
  const response = await api.post<HealthCheckResponse>('/strategy/health-check', {
    account_id: accountId,
    ...(beginnerProtectionDays != null ? { beginner_protection_days: beginnerProtectionDays } : {}),
  })
  return response.data
}
