import { describe, it, expect } from 'vitest'
import data from './unitCostVerified.json'
import { isTribeCostVerified, UNIT_COST_VERIFIED } from './unitCosts'

describe('unit cost verification flags (data/unitCostVerified.json)', () => {
  it('real data: the 5 ts11 tribes are read from the in-game help (P0-18); Vikings from official S139 (P0-23); Spartans from the ASIA x1 in-game help (2026-10-11)', () => {
    expect(Object.keys(data.tribes).sort()).toEqual(['egyptians', 'gauls', 'huns', 'romans', 'spartans', 'teutons', 'vikings'])
    const expected: Record<string, boolean> = { romans: true, teutons: true, gauls: true, egyptians: true, huns: true, spartans: true, vikings: true }
    for (const [tribe, v] of Object.entries(data.tribes)) expect(v, tribe).toBe(expected[tribe])
    for (const tribe of Object.keys(data.tribes)) expect(isTribeCostVerified(tribe), tribe).toBe(expected[tribe])
    expect(UNIT_COST_VERIFIED).toBe(data.tribes)
  })

  it('flipping a tribe to true in the data is all it takes (mock table)', () => {
    const mock = { ...data.tribes, gauls: true, romans: false }
    expect(isTribeCostVerified('gauls', mock)).toBe(true)
    expect(isTribeCostVerified('romans', mock)).toBe(false)
    expect(isTribeCostVerified('unknown', mock)).toBe(false)
  })
})
