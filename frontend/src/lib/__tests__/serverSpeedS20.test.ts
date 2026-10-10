import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  TROOP_SPEED_MULTIPLIER,
  calculateTravelSeconds,
  distanceForTravelHours,
  isTroopSpeedMultiplierVerified,
  troopSpeedMultiplier,
  travelHours,
} from '../travianFormulas'

// 官方 S20「Game Versions and Speed」：Troops speed X1 Normal、X2 *2、X3 *2、X5 *2、X10 *4
// 出處檔：scripts/game_data/evidence/official_s20_speed_2026-10-11.json
const evidence = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../scripts/game_data/evidence/official_s20_speed_2026-10-11.json'), 'utf-8'),
) as { articles: { s20: { troop_speed_multiplier: Record<string, number>; text: string } } }

interface Case { distance: number; unitSpeed: number; serverSpeed: number; arenaLevel: number; bootsPercent: number; seconds: number; derivation?: string }
const { cases } = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../docs/knowledge/travel-speed-cases.json'), 'utf-8'),
) as { cases: Case[] }
const s20Cases = cases.filter((c) => c.derivation)

describe('伺服器倍速 → 兵速倍率（官方 S20，不是直接乘倍速）', () => {
  it('表和出處檔一致，原文裡有這一列', () => {
    const fromEvidence = Object.fromEntries(Object.entries(evidence.articles.s20.troop_speed_multiplier).map(([k, v]) => [Number(k), v]))
    expect(TROOP_SPEED_MULTIPLIER).toEqual(fromEvidence)
    expect(evidence.articles.s20.text).toContain('Troops speed:\nNormal\n*2\n*2\n*2\n*4\n')
  })

  it.each([[1, 1], [2, 2], [3, 2], [5, 2], [10, 4]])('x%i → ×%i', (s, m) => {
    expect(troopSpeedMultiplier(s)).toBe(m)
    expect(isTroopSpeedMultiplierVerified(s)).toBe(true)
  })

  it.each([[0, 1], [-3, 1], [Number.NaN, 1], [4, 2], [7, 2], [20, 4]])('表上沒有的 x%s → 保守用 ×%i（待驗證）', (s, m) => {
    expect(troopSpeedMultiplier(s)).toBe(m)
    if (s > 1) expect(isTroopSpeedMultiplierVerified(s)).toBe(false)
  })

  it('x1／x2／x3／x5／x10 各一個案例，每個都有競技場和靴子', () => {
    expect(s20Cases.map((c) => c.serverSpeed).sort((a, b) => a - b)).toEqual([1, 2, 3, 5, 10])
    for (const c of s20Cases) {
      expect(c.arenaLevel).toBeGreaterThan(0)
      expect(c.bootsPercent).toBeGreaterThan(0)
    }
  })

  // 每個案例的 derivation 寫了怎麼從 S20（兵速倍率）＋S71（20 格後 ×(1+0.2×競技場+靴子%)）算出 seconds
  it.each(s20Cases.map((c) => [`x${c.serverSpeed}`, c] as const))('%s', (_n, c) => {
    const opts = { distance: c.distance, unitSpeed: c.unitSpeed, serverSpeed: c.serverSpeed, tournamentSquareLevel: c.arenaLevel, heroBonusPercent: c.bootsPercent }
    expect(calculateTravelSeconds(opts)).toBe(c.seconds)
    expect(distanceForTravelHours({ ...opts, hours: travelHours(opts) })).toBeCloseTo(c.distance, 6)
  })

  it('x3 不再直接 ×3（舊版 4457 秒太短，S20 → 6686 秒）', () => {
    const base = { distance: 80, unitSpeed: 10, tournamentSquareLevel: 10, heroBonusPercent: 50 }
    expect(calculateTravelSeconds({ ...base, serverSpeed: 3 })).toBe(6686)
    expect(calculateTravelSeconds({ ...base, serverSpeed: 3 })).toBe(calculateTravelSeconds({ ...base, serverSpeed: 2 }))
  })
})
