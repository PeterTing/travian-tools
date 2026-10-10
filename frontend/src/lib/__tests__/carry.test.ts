// 運載量加總（P0-23）：任何一個 null 就無法計算，不算部分加總、不當 0；混合選擇也一樣
import { describe, expect, it } from 'vitest'
import { totalCarry, missingCarryReason, missingCarryTribeReason, missingCarryKinds } from '../carry'
import { TRIBES } from '@/features/guideCalcs/data/tribes'

const unit = (tribe: keyof typeof TRIBES, id: string, count = 1) => {
  const u = TRIBES[tribe].units.find((x) => x.id === id)!
  return { tribe, nameZh: u.name.zh, carry: u.carry, count }
}
// 維京 2026-10-11 起有運載量（Fandom、Siegewise 兩份一致）；留空（null）那條路還在，這裡用維京兵種名但 carry 設成 null 來測
const pending = (id: string, count = 1) => ({ ...unit('vikings', id, count), carry: null })

describe('totalCarry', () => {
  it('all known: sum of carry × count', () => {
    const r = totalCarry([unit('gauls', 'theutatesThunder', 10), unit('teutons', 'maceman', 5)])
    expect(r).toEqual({ ok: true, total: 75 * 10 + 60 * 5 })
  })

  it('mixed with one unit whose carry is empty (null): not computable, no partial sum', () => {
    const r = totalCarry([unit('gauls', 'theutatesThunder', 10), pending('thrall', 3)])
    expect(r.ok).toBe(false)
    expect('total' in r).toBe(false)
    if (!r.ok) {
      expect(missingCarryReason(r.missing)).toBe(`維京：${unit('vikings', 'thrall').nameZh}運載量還沒核對`)
      expect(missingCarryKinds(r.missing)).toEqual(['vikingCarry'])
    }
  })

  it('mixed with several empty-carry units: every missing unit named, joined with 、', () => {
    const r = totalCarry([pending('thrall'), unit('romans', 'legionnaire', 4), unit('spartans', 'hoplite'), pending('berserker')])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const n = (id: string) => unit('vikings', id).nameZh
      expect(missingCarryReason(r.missing)).toBe(`維京：${n('thrall')}運載量還沒核對、維京：${n('berserker')}運載量還沒核對`)
      expect(missingCarryKinds(r.missing)).toEqual(['vikingCarry'])
    }
  })

  it('Spartan units have carry from the ASIA x1 in-game help (2026-10-11): computable', () => {
    expect(totalCarry([unit('spartans', 'hoplite', 10), unit('spartans', 'elpida', 2)])).toEqual({ ok: true, total: 60 * 10 + 110 * 2 })
  })

  it('Viking units have carry from two matching sources (Fandom + Siegewise, 2026-10-11): computable', () => {
    expect(totalCarry([unit('vikings', 'thrall', 10), unit('vikings', 'huskarlRider', 2), unit('gauls', 'theutatesThunder', 1)])).toEqual({ ok: true, total: 55 * 10 + 110 * 2 + 75 })
  })

  it('a null unit with count 0 is still not computable (never treated as 0)', () => {
    expect(totalCarry([pending('huskarlRider', 0)]).ok).toBe(false)
  })

  it('reason format with explicit names', () => {
    expect(missingCarryReason([{ tribe: 'vikings', nameZh: '奴僕' }])).toBe('維京：奴僕運載量還沒核對')
    expect(missingCarryReason([{ tribe: 'vikings', nameZh: '奴僕' }, { tribe: 'vikings', nameZh: '狂戰士' }])).toBe('維京：奴僕運載量還沒核對、維京：狂戰士運載量還沒核對')
  })

  it('single-unit reason', () => {
    expect(missingCarryTribeReason('spartans')).toBe('斯巴達運載量還沒核對')
    expect(missingCarryTribeReason('vikings')).toBe('維京運載量還沒核對')
  })
})
