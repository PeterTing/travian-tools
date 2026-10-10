// 運載量只有一份（P0-23）：前端兵種資料、產生檔、後端 troops.json 每個兵種都一樣；改了任何一邊測試就會失敗
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRIBES } from '@/features/guideCalcs/data/tribes'
import { tribeUnitSpeeds, carryPendingTribe, UNIT_SPEED_TRIBES } from './unitSpeeds'

const backend = JSON.parse(readFileSync(resolve(__dirname, '../../../backend/data/static/troops.json'), 'utf8')).troops as Record<string, { tribe: string; carry_capacity: number }>

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

  it('sources: 5 tribes ts11; Spartans community, Vikings estimate → 待驗證 chip', () => {
    for (const tribe of UNIT_SPEED_TRIBES) {
      const want = tribe === 'spartans' ? 'community' : tribe === 'vikings' ? 'estimate' : 'ts11'
      for (const r of tribeUnitSpeeds(tribe)) {
        expect(r.carrySource).toBe(want)
        expect(carryPendingTribe(r.troopId)).toBe(want === 'ts11' ? null : tribe)
      }
    }
  })

  it('Viking / Spartan values (old backend numbers had no source and are gone)', () => {
    expect(tribeUnitSpeeds('vikings').map((r) => r.carry)).toEqual([50, 30, 60, 0, 50, 70, 0, 0, 0, 3000])
    expect(tribeUnitSpeeds('spartans').map((r) => r.carry)).toEqual([60, 0, 40, 50, 110, 80, 0, 0, 0, 3000])
  })
})
