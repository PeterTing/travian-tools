import { describe, expect, it } from 'vitest'
import {
  defaultOpenSection,
  formatAmount,
  progressCounts,
  remainingSteps,
  resolveStep,
} from '@/lib/openingChecklist'
import { makeOpeningChecklist } from '@/test/openingChecklistFixture'

const sections = () => makeOpeningChecklist().strategies[0].sections
const settlers = () => sections()[1].steps.find((s) => s.id === 'r084')!
const warehouse = () => sections()[1].steps.find((s) => s.id === 'r058')!

describe('opening checklist helpers (P0-10)', () => {
  it('only changes tribe-dependent fields, never the step itself', () => {
    const step = settlers()
    const teuton = resolveStep(step, 'teutons')
    expect(teuton.cost).toBe(20000)
    expect(teuton.id).toBe(step.id)
    expect(teuton.building).toBe('拓荒者')
    // 沒有覆寫的部族照原本的值
    expect(resolveStep(step, 'huns').cost).toBe(18100)
  })

  it('marks tribes the Excel has no data for', () => {
    const viking = resolveStep(settlers(), 'vikings')
    expect(viking.missing).toBe('settler_cost')
    expect(viking.cost).toBeNull()
    expect(resolveStep(settlers(), 'gauls').missing).toBeUndefined()
  })

  it('lets a tribe un-skip a step it needs (romans need warehouse 5 for EI)', () => {
    expect(resolveStep(warehouse(), 'gauls').skip).toBe(true)
    const roman = resolveStep(warehouse(), 'romans')
    expect(roman.skip).toBe(false)
    expect(roman.cost).toBe(2010)
  })

  it('opens the first section that still has unfinished steps', () => {
    expect(defaultOpenSection(sections(), new Set())).toBe('tier-1')
    expect(defaultOpenSection(sections(), new Set(['r003', 'r004']))).toBe('tier-2')
    // 必做都勾完了，接著是選做段落
    const required = ['r003', 'r004', 'r010', 'r058', 'r084']
    expect(defaultOpenSection(sections(), new Set(required))).toBe('extra-cp')
    expect(defaultOpenSection(sections(), new Set([...required, 'r095', 'r096']))).toBeNull()
  })

  it('main progress counts required steps only; optional steps are counted separately', () => {
    expect(progressCounts(sections(), new Set(['r003', 'r095']))).toEqual({
      requiredDone: 1,
      requiredTotal: 5,
      optionalDone: 1,
      optionalTotal: 2,
    })
    // 必做全部勾完＝100%，選做一個都沒勾也一樣
    const all = progressCounts(sections(), new Set(['r003', 'r004', 'r010', 'r058', 'r084']))
    expect(all.requiredDone).toBe(all.requiredTotal)
    expect(all.optionalDone).toBe(0)
  })

  it('counts remaining steps per section', () => {
    expect(remainingSteps(sections()[1], new Set(['r010']))).toBe(2)
  })

  it('formats numbers with thousands separators and a real minus sign', () => {
    expect(formatAmount(18100)).toBe('18,100')
    expect(formatAmount(1109.75)).toBe('1,109.75')
    expect(formatAmount(-320)).toBe('−320')
  })
})
