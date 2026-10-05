import { describe, expect, it } from 'vitest'
import { formatCountdownSeconds } from '../formatCountdown'

describe('formatCountdownSeconds', () => {
  it('formats under one hour as M:SS', () => {
    expect(formatCountdownSeconds(65)).toBe('1:05')
    expect(formatCountdownSeconds(59)).toBe('0:59')
  })

  it('formats hours as H:MM:SS', () => {
    expect(formatCountdownSeconds(39600)).toBe('11:00:00')
    expect(formatCountdownSeconds(3661)).toBe('1:01:01')
  })
})
