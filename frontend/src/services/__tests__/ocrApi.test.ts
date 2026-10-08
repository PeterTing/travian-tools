import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { toOcrError } from '@/services/ocrApi'

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  const response = { status, statusText: '', headers: {}, config, data } as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, response)
}

describe('toOcrError (P0-07)', () => {
  it('keeps the backend code for 413 / 504', () => {
    const big = toOcrError(httpError(413, { detail: { code: 'OCR_IMAGE_TOO_LARGE', message: '圖片太大' } }))
    expect(big.code).toBe('OCR_IMAGE_TOO_LARGE')
    const slow = toOcrError(httpError(504, { detail: { code: 'OCR_TIMEOUT', message: '辨識太久' } }))
    expect(slow.code).toBe('OCR_TIMEOUT')
  })

  it('maps a bare 413 (proxy / Cloud Run, no JSON code) to OCR_IMAGE_TOO_LARGE', () => {
    expect(toOcrError(httpError(413, '<html>Request Entity Too Large</html>')).code).toBe('OCR_IMAGE_TOO_LARGE')
  })

  it('maps a bare 504 and an axios timeout to OCR_TIMEOUT, not a network error', () => {
    expect(toOcrError(httpError(504, '<html>upstream timeout</html>')).code).toBe('OCR_TIMEOUT')
    const timedOut = new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', { headers: new AxiosHeaders() }, {})
    expect(toOcrError(timedOut).code).toBe('OCR_TIMEOUT')
  })

  it('a request with no response is still a network error', () => {
    const offline = new AxiosError('Network Error', 'ERR_NETWORK', { headers: new AxiosHeaders() }, {})
    expect(toOcrError(offline).code).toBe('OCR_NETWORK')
  })
})
