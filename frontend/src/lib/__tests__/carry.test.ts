// 運載量加總（P0-23）：任何一個 null 就無法計算，不算部分加總、不當 0；混合選擇也一樣
import { describe, expect, it } from 'vitest'
import { totalCarry, missingCarryReason, missingCarryTribeReason, missingCarryKinds } from '../carry'
import { TRIBES } from '@/features/guideCalcs/data/tribes'

const unit = (tribe: keyof typeof TRIBES, id: string, count = 1) => {
  const u = TRIBES[tribe].units.find((x) => x.id === id)!
  return { tribe, nameZh: u.name.zh, carry: u.carry, count }
}

describe('totalCarry', () => {
  it('all known: sum of carry × count', () => {
    const r = totalCarry([unit('gauls', 'theutatesThunder', 10), unit('teutons', 'maceman', 5)])
    expect(r).toEqual({ ok: true, total: 75 * 10 + 60 * 5 })
  })

  it('mixed with one Viking unit: not computable, no partial sum', () => {
    const r = totalCarry([unit('gauls', 'theutatesThunder', 10), unit('vikings', 'thrall', 3)])
    expect(r.ok).toBe(false)
    expect('total' in r).toBe(false)
    if (!r.ok) {
      expect(missingCarryReason(r.missing)).toBe(`維京：${unit('vikings', 'thrall').nameZh}運載量還沒核對`)
      expect(missingCarryKinds(r.missing)).toEqual(['vikingCarry'])
    }
  })

  it('mixed with Viking and Spartan units: every missing unit named, joined with 、', () => {
    const r = totalCarry([unit('vikings', 'thrall'), unit('romans', 'legionnaire', 4), unit('spartans', 'hoplite'), unit('vikings', 'berserker')])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const n = (t: 'vikings' | 'spartans', id: string) => unit(t, id).nameZh
      expect(missingCarryReason(r.missing)).toBe(`維京：${n('vikings', 'thrall')}運載量還沒核對、斯巴達：${n('spartans', 'hoplite')}運載量還沒核對、維京：${n('vikings', 'berserker')}運載量還沒核對`)
      expect(missingCarryKinds(r.missing)).toEqual(['vikingCarry', 'spartanCarry'])
    }
  })

  it('a null unit with count 0 is still not computable (never treated as 0)', () => {
    expect(totalCarry([unit('spartans', 'elpida', 0)]).ok).toBe(false)
  })

  it('reason format with explicit names', () => {
    expect(missingCarryReason([{ tribe: 'vikings', nameZh: '奴僕' }])).toBe('維京：奴僕運載量還沒核對')
    expect(missingCarryReason([{ tribe: 'vikings', nameZh: '奴僕' }, { tribe: 'spartans', nameZh: '重裝步兵' }])).toBe('維京：奴僕運載量還沒核對、斯巴達：重裝步兵運載量還沒核對')
  })

  it('single-unit reason', () => {
    expect(missingCarryTribeReason('spartans')).toBe('斯巴達運載量還沒核對')
    expect(missingCarryTribeReason('vikings')).toBe('維京運載量還沒核對')
  })
})
