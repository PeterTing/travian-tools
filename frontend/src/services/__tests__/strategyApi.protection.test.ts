import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api', () => ({ default: { post: vi.fn(async () => ({ data: {} })) } }))
import api from '../api'
import { detectPhase, healthCheck } from '../strategyApi'

// 健檢：不再寫死新手保護 5 天，讓後端依伺服器速度用官方 S20 天數（稽核 2026-10-10）
describe('beginner protection days', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockClear()
  })

  it('health check omits beginner_protection_days unless the user picks one', async () => {
    await healthCheck('a1')
    expect(vi.mocked(api.post).mock.calls[0][1]).toEqual({ account_id: 'a1' })
    await healthCheck('a1', 3)
    expect(vi.mocked(api.post).mock.calls[1][1]).toEqual({ account_id: 'a1', beginner_protection_days: 3 })
  })

  it('phase detection too', async () => {
    await detectPhase('a1')
    expect(vi.mocked(api.post).mock.calls[0][1]).toEqual({ account_id: 'a1' })
  })
})
