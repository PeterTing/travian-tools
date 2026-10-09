/**
 * P0-15 第一階段：兵種速度只用第一手出處（ts11 遊戲內說明／官方文章）。
 * 前端資料和後端 troops.json 由同一個產生器產生，這裡確認前端各處都讀同一份。
 */
import { describe, it, expect } from 'vitest'
import { TRIBES, TRIBE_ORDER } from '@/features/guideCalcs/data/tribes'
import { TRIBE_SETTLER_COST } from '@/features/guideCalcs/data/build-order/tribe-cost'
import { isSpeedVerified, tribeUnitSpeeds, unitSpeed, unitSpeedValue, UNIT_SPEED_TRIBES } from './unitSpeeds'

// ts11 遊戲內說明（2026-10-09 讀取），t1..t10。要改必須重新在 ts11 讀一次。
const TS11_PINNED: Record<string, number[]> = {
  romans: [6, 5, 7, 16, 14, 10, 4, 3, 4, 5],
  teutons: [7, 7, 6, 9, 10, 9, 4, 3, 4, 5],
  gauls: [7, 6, 17, 19, 16, 13, 4, 3, 5, 5],
  egyptians: [7, 6, 7, 16, 15, 10, 4, 3, 4, 5],
  huns: [6, 6, 19, 16, 15, 14, 4, 3, 5, 5],
}

describe('unit speeds (P0-15 phase 1)', () => {
  it('covers all 7 tribes × 10 units with provenance', () => {
    expect([...UNIT_SPEED_TRIBES].sort()).toEqual([...TRIBE_ORDER].sort())
    for (const tribe of UNIT_SPEED_TRIBES) {
      const rows = tribeUnitSpeeds(tribe)
      expect(rows.map(r => r.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      for (const r of rows) {
        expect(['ts11', 'official', 'official_pending', 'pending']).toContain(r.source)
        if (r.source === 'pending') {
          expect(r.speed).toBeNull()
        } else {
          expect(r.speed).toBeGreaterThan(0)
          expect(r.ref).toBeTruthy()
        }
        if (r.source === 'official' || r.source === 'official_pending') expect(r.ref).toMatch(/^https:\/\/support\.travian\.com\//)
      }
    }
  })

  it('pins the ts11 in-game help values', () => {
    for (const [tribe, speeds] of Object.entries(TS11_PINNED)) {
      const rows = tribeUnitSpeeds(tribe as keyof typeof TRIBES)
      expect(rows.map(r => r.speed), tribe).toEqual(speeds)
      expect(rows.every(r => r.source === 'ts11'), tribe).toBe(true)
    }
    expect(unitSpeed('gauls', 'phalanx')?.ref).toBe('manual/troop/21')
  })

  it('uses the official Viking table and leaves unsourced Spartan units pending', () => {
    expect(tribeUnitSpeeds('vikings').map(r => r.speed)).toEqual([7, 7, 5, 9, 12, 9, 4, 3, 5, 5])
    expect(tribeUnitSpeeds('spartans').map(r => r.speed)).toEqual([6, 9, 8, 6, 16, 9, null, null, null, null])
    expect(unitSpeedValue('spartans', 'ephor')).toBeNull()
    expect(tribeUnitSpeeds('spartans').map(r => r.source)).toEqual([
      ...Array(6).fill('official_pending'), ...Array(4).fill('pending'),
    ])
    expect(tribeUnitSpeeds('spartans').some(r => isSpeedVerified(r.source))).toBe(false)
    expect(tribeUnitSpeeds('vikings').every(r => isSpeedVerified(r.source))).toBe(true)
  })

  it('tribe guide data reads the generated speed for every unit', () => {
    for (const id of TRIBE_ORDER) {
      for (const u of TRIBES[id].units) {
        const s = unitSpeed(id, u.id)
        expect(s, `${id}.${u.id}`).toBeDefined()
        expect(u.speed, `${id}.${u.id}`).toBe(s?.speed)
        expect(u.speedSource).toBe(s?.source)
      }
    }
    expect(TRIBES.huns.units.find(u => u.id === 'marksman')?.speed).toBe(15)
  })

  it('settler speed in the opening data comes from the same table', () => {
    for (const id of TRIBE_ORDER) {
      expect(TRIBE_SETTLER_COST[id].combat.speed, id).toBe(unitSpeedValue(id, 'settler'))
    }
  })
})
