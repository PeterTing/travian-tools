import { describe, it, expect } from 'vitest'
import data from './unitCostVerified.json'
import { isTribeCostVerified, UNIT_COST_VERIFIED } from './unitCosts'

describe('unit cost verification flags (data/unitCostVerified.json)', () => {
  it('real data: all 7 tribes are community-sourced, so every one is false (Vikings only had speed verified)', () => {
    expect(Object.keys(data.tribes).sort()).toEqual(['egyptians', 'gauls', 'huns', 'romans', 'spartans', 'teutons', 'vikings'])
    for (const [tribe, v] of Object.entries(data.tribes)) expect(v, tribe).toBe(false)
    for (const tribe of Object.keys(data.tribes)) expect(isTribeCostVerified(tribe), tribe).toBe(false)
    expect(UNIT_COST_VERIFIED).toBe(data.tribes)
  })

  it('flipping a tribe to true in the data is all it takes (mock table)', () => {
    const mock = { ...data.tribes, gauls: true }
    expect(isTribeCostVerified('gauls', mock)).toBe(true)
    expect(isTribeCostVerified('romans', mock)).toBe(false)
    expect(isTribeCostVerified('unknown', mock)).toBe(false)
  })
})
