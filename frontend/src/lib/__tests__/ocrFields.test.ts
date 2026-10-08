import { describe, expect, it } from 'vitest'
import {
  applyFieldValue,
  countUnconfirmed,
  defaultOcrCaptureAt,
  formatCoords,
  parseCoordsInput,
  parseTimeInput,
  setFieldConfirmed,
} from '../ocrFields'
import { ocrLowResResponse } from '@/test/ocrFixtures'

describe('ocrFields', () => {
  it('formats and parses coordinates', () => {
    expect(formatCoords({ x: -45, y: 12 })).toBe('(\u221245|12)')
    expect(parseCoordsInput('(−45|12)')).toEqual({ x: -45, y: 12 })
    expect(parseCoordsInput('-45 12')).toEqual({ x: -45, y: 12 })
    expect(parseCoordsInput('45')).toBeNull()
    expect(parseTimeInput('2:41:10', false)).toBe(9670)
    expect(parseTimeInput('25:00:00', true)).toBeNull()
  })

  it('confirming a field updates the saved top-level values', () => {
    const data = ocrLowResResponse.data
    const movements = data.movements as Record<string, unknown>[]
    expect(countUnconfirmed(movements)).toBe(1)
    const next = applyFieldValue(data, 1, 'coords', { x: -46, y: 12 })
    const row = (next.movements as Record<string, unknown>[])[1]
    expect(row.coordinate_x).toBe(-46)
    expect(countUnconfirmed(next.movements as Record<string, unknown>[])).toBe(0)
    expect(next.incoming).toBe(next.movements)
    // 原本的物件沒被改
    expect(countUnconfirmed(movements)).toBe(1)
    const undone = setFieldConfirmed(next, 1, 'coords', false)
    expect(countUnconfirmed(undone.movements as Record<string, unknown>[])).toBe(1)
  })

  it('capture time: server clock > file time (24h) > now', () => {
    const now = Date.UTC(2026, 9, 6, 9, 30)
    const f = (lm: number) => new File(['x'], 'a.png', { lastModified: lm })
    expect(defaultOcrCaptureAt([f(now)], '2026-10-06T09:29:18Z', now)).toEqual({
      captureAt: '2026-10-06T09:29:18Z',
      timeSource: 'server_clock',
    })
    expect(defaultOcrCaptureAt([f(now - 60_000)], null, now).timeSource).toBe('file')
    expect(defaultOcrCaptureAt([f(now - 3 * 86400_000)], null, now).timeSource).toBe('now')
  })
})
