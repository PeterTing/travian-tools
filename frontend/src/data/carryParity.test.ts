// 運載量只有一份（P0-23）：前端兵種資料、產生檔、後端 troops.json 每個兵種都一樣；改了任何一邊測試就會失敗
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRIBES } from '@/features/guideCalcs/data/tribes'
import { tribeUnitSpeeds, carryPendingTribe, UNIT_SPEED_TRIBES } from './unitSpeeds'

const backend = JSON.parse(readFileSync(resolve(__dirname, '../../../backend/data/static/troops.json'), 'utf8')).troops as Record<string, { tribe: string; carry_capacity: number | null }>

describe('carry capacity: frontend = backend troops.json for every unit', () => {
  it('covers all 70 units', () => {
    expect(Object.keys(backend)).toHaveLength(70)
    expect(UNIT_SPEED_TRIBES.flatMap((t) => tribeUnitSpeeds(t))).toHaveLength(70)
  })

  for (const tribe of UNIT_SPEED_TRIBES) {
    it(tribe, () => {
      const units = TRIBES[tribe].units
      for (const r of tribeUnitSpeeds(tribe)) {
        const fe = units.find((u) => u.id === r.feId)
        expect(fe, `${tribe}.${r.feId}`).toBeDefined()
        expect(backend[r.troopId].tribe).toBe(tribe)
        expect([r.troopId, fe!.carry]).toEqual([r.troopId, backend[r.troopId].carry_capacity])
        expect([r.troopId, r.carry]).toEqual([r.troopId, backend[r.troopId].carry_capacity])
      }
    })
  }

  it('sources: 5 tribes ts11; Spartans ASIA x1 in-game help (2026-10-11); Vikings pending (empty) → 待驗證 chip', () => {
    for (const tribe of UNIT_SPEED_TRIBES) {
      const want = tribe === 'vikings' ? 'pending' : tribe === 'spartans' ? 'asia_x1' : 'ts11'
      for (const r of tribeUnitSpeeds(tribe)) {
        expect(r.carrySource).toBe(want)
        expect(carryPendingTribe(r.troopId)).toBe(want === 'pending' ? tribe : null)
      }
    }
  })

  it('PM decision: every Viking unit has carry null (frontend, generated file, backend) — no community / estimated numbers', () => {
    expect(tribeUnitSpeeds('vikings').map((r) => r.carry)).toEqual(Array(10).fill(null))
    expect(TRIBES.vikings.units.map((u) => u.carry)).toEqual(Array(10).fill(null))
    for (const r of tribeUnitSpeeds('vikings')) expect(backend[r.troopId].carry_capacity, r.troopId).toBeNull()
    for (const tribe of UNIT_SPEED_TRIBES.filter((t) => t !== 'vikings')) {
      for (const r of tribeUnitSpeeds(tribe)) expect(typeof r.carry, r.troopId).toBe('number')
    }
    // 斯巴達：ASIA x1 遊戲內說明（2026-10-11）
    expect(tribeUnitSpeeds('spartans').map((r) => r.carry)).toEqual([60, 0, 40, 50, 110, 80, 0, 0, 0, 3000])
  })
})
