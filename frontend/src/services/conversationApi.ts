import api from './api'

// ============ Types ============

export interface ConversationMessage {
  message_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sequence: number
  is_compacted: boolean
  created_at: string
}

export interface ConversationSummary {
  conversation_id: string
  account_id: string | null
  title: string | null
  message_count: number
  is_archived: boolean
  created_at: string
  updated_at: string
  last_message_preview: string | null
}

export interface ConversationDetail {
  conversation_id: string
  account_id: string | null
  title: string | null
  summary: string | null
  message_count: number
  is_archived: boolean
  created_at: string
  updated_at: string
  messages: ConversationMessage[]
}

export interface ConversationListResponse {
  conversations: ConversationSummary[]
  total: number
}

export interface SendMessageResponse {
  conversation_id: string
  user_message: ConversationMessage
  assistant_message: ConversationMessage
  phase_analysis: string
  immediate_actions: string[]
  short_term_plan: string[]
  risk_warnings: string[]
}

// ============ API Functions ============

export const conversationApi = {
  /**
   * 取得對話列表
   */
  list: async (params?: {
    account_id?: string
    include_archived?: boolean
    limit?: number
    offset?: number
  }): Promise<ConversationListResponse> => {
    const response = await api.get<ConversationListResponse>('/conversations', {
      params,
    })
    return response.data
  },

  /**
   * 建立新對話
   */
  create: async (data: {
    account_id: string
    title?: string
  }): Promise<ConversationSummary> => {
    const response = await api.post<ConversationSummary>('/conversations', data)
    return response.data
  },

  /**
   * 取得對話詳情
   */
  get: async (conversationId: string): Promise<ConversationDetail> => {
    const response = await api.get<ConversationDetail>(
      `/conversations/${conversationId}`
    )
    return response.data
  },

  /**
   * 更新對話
   */
  update: async (
    conversationId: string,
    data: {
      title?: string
      is_archived?: boolean
    }
  ): Promise<ConversationSummary> => {
    const response = await api.patch<ConversationSummary>(
      `/conversations/${conversationId}`,
      data
    )
    return response.data
  },

  /**
   * 刪除對話
   */
  delete: async (conversationId: string): Promise<void> => {
    await api.delete(`/conversations/${conversationId}`)
  },

  /**
   * 發送訊息
   */
  sendMessage: async (
    conversationId: string,
    question: string
  ): Promise<SendMessageResponse> => {
    const response = await api.post<SendMessageResponse>(
      `/conversations/${conversationId}/messages`,
      { question }
    )
    return response.data
  },
}

export default conversationApi
