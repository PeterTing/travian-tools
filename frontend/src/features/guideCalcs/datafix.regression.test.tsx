import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import i18n from '@/i18n/i18n'
import gen from '../../data/gameData.gen.json'
import { render, screen, within } from '@testing-library/react'
import PassiveCpCalculator, { villageCountdown } from './components/PassiveCpCalculator'
import { cropSim } from './components/CropSimCalculator'
import { CP_REQUIRED, CELEBRATIONS, cpAtLevel, hmCumulativeCost, FIELD_COSTS, type CpBuilding } from './data/travian'
import {
  buildingRows, celebrationCp, celebrationCap, villageRequirements, isVillageCpVerified, isPending,
  buildingName, isBuildingVerified,
} from '../../data/gameData'

describe('celebration CP = daily CP production, capped (support.travian.com/en/articles/82)', () => {
  it('ts11 early game: 12 CP/day village gets 12 CP from a small celebration, not 500', () => {
    expect(celebrationCp(12, 'small', 1)).toBe(12)
  })
  it('caps at 500 / 2,000 on x1', () => {
    expect(celebrationCp(529, 'small', 1)).toBe(500)
    expect(celebrationCp(5000, 'great', 1)).toBe(2000)
    expect(celebrationCp(1500, 'great', 1)).toBe(1500)
  })
  it('caps follow world speed (official Game Versions and Speed table)', () => {
    expect([1, 2, 3, 5, 10].map(sp => celebrationCap('small', sp as 1))).toEqual([500, 500, 250, 250, 125])
    expect([1, 2, 3, 5, 10].map(sp => celebrationCap('great', sp as 1))).toEqual([2000, 2000, 1000, 1000, 500])
  })
})

describe('villageCountdown', () => {
  it('passive only: (threshold − current CP) ÷ account CP/day', () => {
    const r = villageCountdown({ villageCp: 12, otherVillagesCp: 0, currentCp: 500, speed: 1, mode: 'none', hoursPerCelebration: 24 })
    expect(r.rows[0]!.village).toBe(2)
    expect(r.rows[0]!.daysPassive).toBeCloseTo(1500 / 12)
    expect(r.rows[0]!.daysWithCelebration).toBeNull()
  })
  it('small celebrations back to back add one day of village CP per 24 h, not +500', () => {
    const r = villageCountdown({ villageCp: 12, otherVillagesCp: 0, currentCp: 500, speed: 1, mode: 'small', hoursPerCelebration: 24 })
    expect(r.perCelebration).toBe(12)
    expect(r.rows[0]!.daysWithCelebration).toBeCloseTo(1500 / 24)
  })
  it('the old "+2,000 a day" column is gone: 529 CP/day + great celebrations', () => {
    const r = villageCountdown({ villageCp: 529, otherVillagesCp: 0, currentCp: 0, speed: 1, mode: 'great', hoursPerCelebration: 60 })
    expect(r.perCelebration).toBe(529)
    // village 3 = 8,000 CP: 8000 / (529 + 529 × 24/60) — old code said 8000 / 2529
    expect(r.rows[1]!.daysWithCelebration).toBeCloseTo(8000 / (529 + 529 * 0.4))
    expect(r.rows[1]!.daysWithCelebration).toBeGreaterThan(8000 / 2529)
  })
  it('great celebration uses the whole account and is capped', () => {
    const r = villageCountdown({ villageCp: 529, otherVillagesCp: 3000, currentCp: 0, speed: 1, mode: 'great', hoursPerCelebration: 24 })
    expect(r.accountCp).toBe(3529)
    expect(r.perCelebration).toBe(2000)
  })
})

describe('village CP thresholds — one source (official table)', () => {
  it('x1 matches support.travian.com/en/articles/51', () => {
    expect(villageRequirements(1).slice(0, 10)).toEqual([0, 2000, 8000, 20000, 39000, 65000, 99000, 141000, 191000, 251000])
    expect(CP_REQUIRED.map(r => r.cumulative)).toEqual(villageRequirements(1).slice(0, 10))
    expect(CP_REQUIRED[2]!.delta).toBe(6000)
  })
  it('x3 village 2 = 500, x10 village 50 = 1,234,700', () => {
    expect(villageRequirements(3)[1]).toBe(500)
    expect(villageRequirements(10)[49]).toBe(1234700)
  })
  it('only x1 village 2 is ts11-verified', () => {
    expect(isVillageCpVerified(2, 1)).toBe(true)
    expect(isVillageCpVerified(3, 1)).toBe(false)
    expect(isVillageCpVerified(2, 3)).toBe(false)
  })
})

describe('one set of building numbers', () => {
  const keys: [CpBuilding, string][] = [
    ['mainBuilding', 'main_building'], ['embassy', 'embassy'], ['townHall', 'town_hall'],
    ['residence', 'residence'], ['palace', 'palace'], ['treasury', 'treasury'],
    ['cranny', 'cranny'], ['granary', 'granary'], ['palisade', 'palisade'], ['cropland', 'cropland'],
  ]
  it('cpAtLevel equals the generated CP column for every level', () => {
    for (const [k, id] of keys) {
      for (const r of buildingRows(id)) expect(cpAtLevel(k, r.level)).toBe(r.cp)
    }
  })
  it('ts11 L1 CP: embassy 5, residence 2, palace 6, treasury 7, town hall 6, cranny 1', () => {
    expect([cpAtLevel('embassy', 1), cpAtLevel('residence', 1), cpAtLevel('palace', 1),
      cpAtLevel('treasury', 1), cpAtLevel('townHall', 1), cpAtLevel('cranny', 1)]).toEqual([5, 2, 6, 7, 6, 1])
  })
  it('field costs come from the generated table', () => {
    expect(FIELD_COSTS.crop[2]).toEqual({ level: 3, wood: 195, clay: 250, iron: 195, crop: 55 })
  })
  it('hero mansion cost (T4) and small celebration crop are flagged 待驗證', () => {
    expect(hmCumulativeCost(10)).toBe(17805)
    expect(isPending('heros_mansion', 'cost')).toBe(true)
    expect(CELEBRATIONS.small.cost.crop).toBe(1340)
    expect(CELEBRATIONS.small.cp).toBe(500)
  })
})

describe('CropSim reproduces small travian guide Table 1 (non-Egyptian, gold ×1.25 multiplied)', () => {
  const run = (layoutId: '15c' | '9c' | '7c', crop: number) => {
    const r = cropSim({ layoutId, fieldLevel: 18, bonus: { saw: 5, bri: 5, fnd: 5, mil: 5, bak: 5 },
      oasis: { wood: 0, clay: 0, iron: 0, crop }, gold: true, waterworks: 0 })
    return Math.round(r.totals.wood + r.totals.clay + r.totals.iron + r.totals.crop)
  }
  it.each([
    ['15c', 150, 136500], ['15c', 125, 126000], ['15c', 100, 115500], ['15c', 75, 105000],
    ['9c', 150, 107100], ['9c', 125, 100800], ['9c', 100, 94500], ['9c', 75, 88200],
    ['7c', 150, 97300], ['7c', 125, 92400], ['7c', 100, 87500], ['7c', 75, 82600],
  ] as const)('%s crop oasis %i%% → %i', (layout, crop, expected) => {
    expect(run(layout, crop)).toBe(expected)
  })
})

describe('PassiveCpCalculator UI', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
    // desktop width so the result details are open
    window.matchMedia = ((query: string) => ({
      matches: true, media: query, onchange: null,
      addListener: () => undefined, removeListener: () => undefined,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  })
  it('marks village 3+ thresholds 待驗證 but not village 2', () => {
    render(<PassiveCpCalculator />)
    const table = screen.getByTestId('cp-countdown')
    const rows = within(table).getAllByRole('row')
    expect(within(rows[1]!).queryByTestId('pending-verify-chip')).toBeNull()
    expect(within(rows[2]!).getByTestId('pending-verify-chip')).toBeInTheDocument()
    expect(screen.queryByText('+大慶典/天')).toBeNull()
  })
  it('shows small-celebration crop cost with 待驗證', () => {
    render(<PassiveCpCalculator />)
    const cost = screen.getByTestId('cp-celebration-cost')
    expect(within(cost).getByText(/1,340/)).toBeInTheDocument()
    expect(within(cost).getAllByTestId('pending-verify-chip').length).toBeGreaterThan(0)
  })
  it('title is CP 與開村 and the body says CP, not 文明點', () => {
    render(<PassiveCpCalculator />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('CP 與開村')
    expect(screen.queryByText(/文明點/)).toBeNull()
  })
  it('celebration hours field has the Town Hall hint', () => {
    render(<PassiveCpCalculator />)
    expect(screen.getByTestId('cp-hours-hint')).toHaveTextContent('慶典時長會隨城鎮廳等級變短，預設帶入城鎮廳 1 級的官方時長。')
  })
  it('building labels are Chinese in zh (same names as the buildings database)', () => {
    render(<PassiveCpCalculator />)
    expect(screen.getAllByText('村莊大樓').length).toBeGreaterThan(0)
    expect(screen.getAllByText('城鎮廳').length).toBeGreaterThan(0)
    expect(screen.getAllByText('鐵匠鋪／防具工坊').length).toBeGreaterThan(0)
    expect(screen.queryByText('Main Building')).toBeNull()
  })
  describe('in English', () => {
    let prev = 'zh-TW'
    beforeEach(async () => { prev = i18n.language; await i18n.changeLanguage('en') })
    afterEach(async () => { await i18n.changeLanguage(prev) })
    it('keeps English building names and wording', () => {
      render(<PassiveCpCalculator />)
      expect(screen.getAllByText('Main Building').length).toBeGreaterThan(0)
      expect(screen.queryByText('村莊大樓')).toBeNull()
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('CP & new villages')
      expect(screen.getByTestId('cp-hours-hint')).toHaveTextContent(/Town Hall level 1/)
    })
  })
})

describe('待驗證 follows the generator verified flag', () => {
  const unverified = [
    'stable', 'academy', 'blacksmith', 'armoury', 'workshop', 'town_hall', 'residence', 'palace',
    'treasury', 'sawmill', 'brickyard', 'iron_foundry', 'grain_mill', 'bakery', 'trade_office',
    'tournament_square', 'city_wall', 'earth_wall', 'great_barracks', 'great_stable',
    'great_warehouse', 'great_granary',
  ]
  it.each(unverified)('%s cost and time are 待驗證', (id) => {
    expect(isPending(id, 'cost')).toBe(true)
    expect(isPending(id, 'time')).toBe(true)
  })
  it.each(['main_building', 'warehouse', 'granary', 'cranny', 'marketplace', 'embassy', 'palisade', 'barracks', 'rally_point'])(
    '%s (ts11 measured) has no chip', (id) => {
      expect(isPending(id, 'cost')).toBe(false)
      expect(isPending(id, 'time')).toBe(false)
    },
  )
  it('every building not measured in ts11 has cost AND time 待驗證', () => {
    const measured = new Set(['main_building', 'barracks', 'rally_point', 'warehouse', 'granary', 'marketplace',
      'cranny', 'embassy', 'palisade', 'woodcutter', 'clay_pit', 'iron_mine', 'cropland'])
    for (const id of Object.keys(gen.buildings)) {
      if (measured.has(id)) {
        expect(isBuildingVerified(id), id).toBe(true)
      } else {
        expect(isPending(id, 'cost') && isPending(id, 'time'), id).toBe(true)
        expect(isBuildingVerified(id), id).toBe(false)
      }
    }
    for (const id of ['stonemasons_lodge', 'trapper', 'brewery', 'horse_drinking_trough']) {
      expect(isPending(id, 'cost'), id).toBe(true)
    }
  })
  it('names come from the same data as the database page', () => {
    expect(buildingName('main_building', 'zh')).toBe('村莊大樓')
    expect(buildingName('main_building', 'en')).toBe('Main Building')
    expect(buildingName('town_hall', 'zh')).toBe('城鎮廳')
  })
})
