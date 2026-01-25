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

export interface StrategyAdviceResponse {
  conversation_id: string
  phase_analysis: string
  immediate_actions: string[]
  short_term_plan: string[]
  risk_warnings: string[]
  answer: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationHistoryResponse {
  conversation_id: string
  messages: ConversationMessage[]
  created_at: string
  last_updated: string
}

// ============ API Functions ============

export const detectPhase = async (accountId: string): Promise<PhaseDetectionResponse> => {
  const response = await api.post<PhaseDetectionResponse>('/strategy/phase', {
    account_id: accountId,
  })
  return response.data
}

export const healthCheck = async (accountId: string): Promise<HealthCheckResponse> => {
  const response = await api.post<HealthCheckResponse>('/strategy/health-check', {
    account_id: accountId,
  })
  return response.data
}

export const getAdvice = async (
  accountId: string,
  question: string,
  conversationId?: string
): Promise<StrategyAdviceResponse> => {
  const response = await api.post<StrategyAdviceResponse>('/strategy/advice', {
    account_id: accountId,
    question,
    conversation_id: conversationId,
  })
  return response.data
}

export const getConversationHistory = async (
  conversationId: string
): Promise<ConversationHistoryResponse> => {
  const response = await api.get<ConversationHistoryResponse>(
    `/strategy/conversation/${conversationId}`
  )
  return response.data
}
