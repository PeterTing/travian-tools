import { api } from './api'

export interface ParseWarning {
  code: string
  message: string
}

export interface ParsePreviewResponse {
  ok: boolean
  page_type: string
  data: Record<string, unknown>
  warnings: ParseWarning[]
  server_time?: string | null
}

export interface DraftResponse {
  draft_id: string
  account_id: string
  page_type: string
  source: string
  url?: string | null
  server_time?: string | null
  data: Record<string, unknown>
  warnings: ParseWarning[]
  expires_at: string
}

export interface ConfirmRequest {
  account_id: string
  page_type: string
  data: Record<string, unknown>
  draft_id?: string | null
  capture_at?: string | null
  server_time?: string | null
  source?: string
  village_id?: string | null
  time_display?: string | null
  local_timezone?: string | null
  utc_offset?: number | null
  help_improve?: boolean
}

export interface ConfirmResponse {
  success: boolean
  message: string
  created: number
  updated: number
  total: number
  village_id?: string | null
  movement_ids: string[]
}

export interface Movement {
  movement_id: string
  kind: string
  role?: string | null
  headline?: string | null
  coordinate_x?: number | null
  coordinate_y?: number | null
  arrival_at?: string | null
  needs_coords: boolean
  troops: unknown[]
  source: string
}

export const pasteApi = {
  preview: async (body: {
    kind: string
    html?: string
    text?: string
    url?: string
    page_type_hint?: string
    server_time?: string
  }): Promise<ParsePreviewResponse> => {
    const { data } = await api.post<ParsePreviewResponse>('/parse', body)
    return data
  },

  getDraft: async (draftId: string): Promise<DraftResponse> => {
    const { data } = await api.get<DraftResponse>(`/parse/drafts/${draftId}`)
    return data
  },

  confirm: async (body: ConfirmRequest): Promise<ConfirmResponse> => {
    const { data } = await api.post<ConfirmResponse>('/paste/confirm', body)
    return data
  },

  listMovements: async (accountId: string): Promise<{ movements: Movement[]; total: number }> => {
    const { data } = await api.get<{ movements: Movement[]; total: number }>('/movements', {
      params: { account_id: accountId },
    })
    return data
  },

  updateCoords: async (
    movementId: string,
    coordinate_x: number,
    coordinate_y: number,
  ): Promise<Movement> => {
    const { data } = await api.patch<Movement>(`/movements/${movementId}/coords`, {
      coordinate_x,
      coordinate_y,
    })
    return data
  },
}
