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
  beginnerProtectionDays = 5,
): Promise<PhaseDetectionResponse> => {
  const response = await api.post<PhaseDetectionResponse>('/strategy/phase', {
    account_id: accountId,
    beginner_protection_days: beginnerProtectionDays,
  })
  return response.data
}

export const healthCheck = async (
  accountId: string,
  beginnerProtectionDays = 5,
): Promise<HealthCheckResponse> => {
  const response = await api.post<HealthCheckResponse>('/strategy/health-check', {
    account_id: accountId,
    beginner_protection_days: beginnerProtectionDays,
  })
  return response.data
}
