import axios from 'axios'
import { api } from './api'

/** P0-07 截圖辨識（集結點）。圖片只送去辨識，不會被存下來。 */

export type OcrFieldName = 'coords' | 'countdown' | 'arrival'
export type OcrFieldStatus = 'ok' | 'low' | 'missing'

export interface OcrOption {
  value: unknown
  label: string
  note?: string | null
}

export interface OcrField {
  status: OcrFieldStatus
  value: unknown
  reasons: string[]
  /** 在原圖上的框 [x0, y0, x1, y1]（原圖像素） */
  box: number[] | null
  image_index: number | null
  raw?: string | null
  score?: number | null
  options: OcrOption[]
  confirmed: boolean
}

export interface OcrMovementMeta {
  image_index: number
  block_box: number[]
  fields: Record<OcrFieldName, OcrField>
}

export interface OcrImageMeta {
  image_index: number
  engine?: string | null
  width: number
  height: number
  bytes: number
  ocr_ms?: number | null
  round_trip_ms?: number | null
}

export interface OcrMeta {
  engine?: string | null
  images: OcrImageMeta[]
  elapsed_ms: number
  low_count: number
  missing_count: number
  dropped_unreadable: number
  overlap_removed: number
  map_checked: boolean
  capture_at_suggested: string | null
  time_source: 'server_clock' | 'client'
  server_clock_box?: number[] | null
  server_clock_image_index?: number | null
}

export interface OcrRallyResponse {
  ok: boolean
  page_type: string
  data: Record<string, unknown>
  warnings: { code: string; message: string }[]
  server_time?: string | null
  ocr: OcrMeta
}

export interface OcrCoordCandidate {
  x: number
  y: number
  label: string
  status: OcrFieldStatus
  reasons: string[]
  score: number
  box: number[]
}

export class OcrRequestError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export const OCR_MAX_IMAGES = 4

/** 後端回 {detail: {code, message}}；其他錯誤轉成看得懂的話 */
export function toOcrError(e: unknown): OcrRequestError {
  if (axios.isCancel(e) || (e instanceof Error && e.name === 'CanceledError')) {
    return new OcrRequestError('OCR_CANCELLED', '已取消')
  }
  if (axios.isAxiosError(e)) {
    const detail = (e.response?.data as { detail?: unknown } | undefined)?.detail
    if (detail && typeof detail === 'object' && 'code' in detail) {
      const d = detail as { code: string; message?: string }
      return new OcrRequestError(d.code, d.message || '辨識失敗')
    }
    // 沒有 {code} 的 413／504（例如前面的代理或 Cloud Run 自己回的）也要對到專屬失敗卡
    if (e.response?.status === 413) {
      return new OcrRequestError('OCR_IMAGE_TOO_LARGE', '圖片太大')
    }
    if (e.response?.status === 504 || e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') {
      return new OcrRequestError('OCR_TIMEOUT', '辨識太久了，請一次少傳幾張截圖再試')
    }
    if (typeof detail === 'string') return new OcrRequestError('OCR_FAILED', detail)
    if (!e.response) return new OcrRequestError('OCR_NETWORK', '連不上伺服器，請檢查網路後再試')
  }
  if (e instanceof OcrRequestError) return e
  return new OcrRequestError('OCR_FAILED', e instanceof Error ? e.message : '辨識失敗')
}

export const ocrApi = {
  recognizeRally: async (
    accountId: string,
    files: File[],
    signal?: AbortSignal,
  ): Promise<OcrRallyResponse> => {
    const form = new FormData()
    form.append('account_id', accountId)
    for (const f of files) form.append('images', f, f.name)
    try {
      const { data } = await api.post<OcrRallyResponse>('/ocr/rally', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
        timeout: 60_000,
      })
      return data
    } catch (e) {
      throw toOcrError(e)
    }
  },

  recognizeCoords: async (
    file: File,
    signal?: AbortSignal,
  ): Promise<{ candidates: OcrCoordCandidate[] }> => {
    const form = new FormData()
    form.append('image', file, file.name)
    try {
      const { data } = await api.post<{ candidates: OcrCoordCandidate[] }>('/ocr/coords', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
        timeout: 60_000,
      })
      return data
    } catch (e) {
      throw toOcrError(e)
    }
  },
}
