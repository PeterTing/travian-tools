import { describe, expect, it } from 'vitest'
import {
  TS_BONUS_PER_LEVEL,
  TS_THRESHOLD_FIELDS,
  calculateTravelSeconds,
  tournamentSquareBonusFactor,
} from '../travianFormulas'

describe('Tournament Square (S71) — shared frontend formula', () => {
  it('constants match backend: threshold 20, +20% per level', () => {
    expect(TS_THRESHOLD_FIELDS).toBe(20)
    expect(TS_BONUS_PER_LEVEL).toBe(0.2)
  })

  it('bonus factor: level 0 → 1, level 1 → 1.2, level 20 → 5', () => {
    expect(tournamentSquareBonusFactor(0)).toBe(1)
    expect(tournamentSquareBonusFactor(1)).toBeCloseTo(1.2)
    expect(tournamentSquareBonusFactor(5)).toBeCloseTo(2)
    expect(tournamentSquareBonusFactor(20)).toBeCloseTo(5)
  })

  it('distance exactly 20: TS does not accelerate', () => {
    const noTs = calculateTravelSeconds({
      distance: 20,
      unitSpeed: 10,
      tournamentSquareLevel: 0,
    })
    const withTs = calculateTravelSeconds({
      distance: 20,
      unitSpeed: 10,
      tournamentSquareLevel: 20,
    })
    expect(withTs).toBe(noTs)
    // 20 fields / 10 fields-per-hour = 2h = 7200s
    expect(noTs).toBe(7200)
  })

  it('distance under 20: TS does not accelerate', () => {
    const noTs = calculateTravelSeconds({
      distance: 19.9,
      unitSpeed: 10,
      tournamentSquareLevel: 0,
    })
    const withTs = calculateTravelSeconds({
      distance: 19.9,
      unitSpeed: 10,
      tournamentSquareLevel: 20,
    })
    expect(withTs).toBe(noTs)
  })

  it('distance just over 20: only the beyond-20 portion is accelerated', () => {
    // 30 fields, speed 10, TS 1 → near 20/10=2h, far 10/(10*1.2)=0.833…h → 2.833…h
    const secs = calculateTravelSeconds({
      distance: 30,
      unitSpeed: 10,
      tournamentSquareLevel: 1,
    })
    const expectedHours = 20 / 10 + 10 / (10 * 1.2)
    expect(secs).toBe(Math.round(expectedHours * 3600))
  })

  it('level boundaries: L0 no bonus, L1 +20%, L20 ×5 on far segment', () => {
    const base = calculateTravelSeconds({
      distance: 40,
      unitSpeed: 10,
      tournamentSquareLevel: 0,
    })
    const l1 = calculateTravelSeconds({
      distance: 40,
      unitSpeed: 10,
      tournamentSquareLevel: 1,
    })
    const l20 = calculateTravelSeconds({
      distance: 40,
      unitSpeed: 10,
      tournamentSquareLevel: 20,
    })
    expect(l1).toBeLessThan(base)
    expect(l20).toBeLessThan(l1)
    // far = 20 / (10 * 5) = 0.4h; near = 2h → 2.4h = 8640s
    expect(l20).toBe(Math.round((2 + 0.4) * 3600))
  })
})

describe('Hero boots (P0-20, official help page S71): added to Tournament Square, beyond 20 fields only', () => {
  const t = (distance: number, ts: number, boots: number) =>
    calculateTravelSeconds({ distance, unitSpeed: 10, tournamentSquareLevel: ts, heroBonusPercent: boots })

  it('≤ 20 fields with boots: time unchanged', () => {
    expect(t(20, 0, 75)).toBe(t(20, 0, 0))
    expect(t(15, 0, 75)).toBe(t(15, 0, 0))
    expect(t(20, 10, 75)).toBe(7200)
  })

  it('> 20 fields: boots + arena are added, not multiplied', () => {
    // TS 10 (+200%) + boots 25% → far segment × 3.25 (not 3 × 1.25 = 3.75)
    const added = Math.round((20 / 10 + 80 / (10 * 3.25)) * 3600)
    const multiplied = Math.round((20 / 10 + 80 / (10 * 3.75)) * 3600)
    expect(t(100, 10, 25)).toBe(added)
    expect(t(100, 10, 25)).not.toBe(multiplied)
  })

  it('arena only', () => {
    expect(t(60, 5, 0)).toBe(Math.round((2 + 40 / (10 * 2)) * 3600))
  })

  it('boots only: only the stretch beyond 20 fields is faster', () => {
    expect(t(60, 0, 50)).toBe(Math.round((2 + 40 / (10 * 1.5)) * 3600))
    expect(t(60, 0, 50)).not.toBe(Math.round((60 / 15) * 3600))
  })
})

