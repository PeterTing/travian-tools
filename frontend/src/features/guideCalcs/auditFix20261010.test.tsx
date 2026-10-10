// 稽核 2026-10-10：被動 CP、開村時間模擬、商人路線、綠洲回本、主村產量、建造順序、資源田回本
import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import PassiveCpCalculator, { villageDailyCp, villageCountdown, parseFieldLevels, PRESET_LUMI_CP } from './components/PassiveCpCalculator'
import LaunchSimCalculator, { simulate } from './components/LaunchSimCalculator'
import { CP_BASE } from './data/travian'

beforeAll(async () => {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  await i18n.changeLanguage('zh-TW')
})

describe('被動 CP：資源田、集結點、城牆等都要算', () => {
  it('ts11 2026-10-08 village = 12 CP/day (game cpProductionTotal)', () => {
    // review/realtest/ts11-progress.md 10/08 11:04 快照：MB3、倉庫 1、穀倉 2、山洞 1、集結點 1；
    // 田 木 L2、泥 L2、鐵 L2、農 L2、農 L1，其他 13 塊 L0；遊戲顯示 CP 12/天
    const levels = { mb: 3, wh: 1, gr: 2, cr: 1, rp: 1 }
    expect(villageDailyCp(levels, [2, 2, 2, 2, 1])).toBe(12)
    // 以前的算法（不算田和集結點）只有 6
    expect(villageDailyCp({ mb: 3, wh: 1, gr: 2, cr: 1 })).toBe(6)
  })

  it('the four field types share one CP base, so one list of 18 levels is enough', () => {
    expect(new Set([CP_BASE.woodcutter, CP_BASE.clayPit, CP_BASE.ironMine, CP_BASE.cropland]).size).toBe(1)
  })

  it('walls and other CP buildings count (palisade L1 = 1 CP, ts11)', () => {
    expect(villageDailyCp({ wa: 1 })).toBe(1)
    expect(villageDailyCp({ tr: 1 })).toBeGreaterThan(0)
    expect(villageDailyCp({ bw: 1 })).toBeGreaterThan(0)
  })

  it('preset 「常用」 is still the guide\'s 529', () => {
    expect(PRESET_LUMI_CP).toBe(529)
  })

  it('field levels parser', () => {
    expect(parseFieldLevels('')).toEqual([])
    expect(parseFieldLevels('2 2,2，1')).toEqual([2, 2, 2, 1])
    expect(parseFieldLevels('21')).toBeNull()
    expect(parseFieldLevels('-1')).toBeNull()
    expect(parseFieldLevels(Array(19).fill('1').join(' '))).toBeNull()
  })

  it('celebration hours 0 → no "+ celebrations" days (was 24 celebrations a day)', () => {
    const r = villageCountdown({ villageCp: 100, otherVillagesCp: 0, currentCp: 500, speed: 1, mode: 'small', hoursPerCelebration: 0 })
    expect(r.extraPerDay).toBe(0)
    expect(r.rows[0]!.daysWithCelebration).toBeNull()
  })

  it('negative current CP is treated as 0', () => {
    const r = villageCountdown({ villageCp: 100, otherVillagesCp: 0, currentCp: -1000, speed: 1, mode: 'none', hoursPerCelebration: 24 })
    expect(r.rows[0]!.daysPassive).toBe(2000 / 100)
  })

  it('page: field levels raise the daily CP; bad input → error under the field', () => {
    render(<MemoryRouter><PassiveCpCalculator /></MemoryRouter>)
    const primary = () => screen.getAllByTestId('calc-result-primary')[0]!.textContent
    expect(primary()).toContain('529')
    fireEvent.change(screen.getByTestId('cp-fields-all'), { target: { value: '1' } })
    expect(primary()).toContain(String(529 + 18))
    fireEvent.change(screen.getByTestId('cp-fields'), { target: { value: '2 x' } })
    expect(screen.getByTestId('cp-fields-error')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('cp-hours'), { target: { value: '0' } })
    expect(screen.getByTestId('cp-hours-error')).toHaveTextContent('大於 0')
  })
})

describe('開村時間模擬：產量 ≤0', () => {
  it('simulate() refuses 0 / negative / NaN', () => {
    expect(() => simulate('4p-sim', 0)).toThrow(RangeError)
    expect(() => simulate('4p-sim', -100)).toThrow(RangeError)
    expect(() => simulate('4p-sim', NaN)).toThrow(RangeError)
  })

  it('page: 0 → error under the field, no NaN / negative hours', () => {
    render(<MemoryRouter><LaunchSimCalculator /></MemoryRouter>)
    for (const v of ['0', '-500', '']) {
      fireEvent.change(screen.getByTestId('launch-prod'), { target: { value: v } })
      expect(screen.getByTestId('launch-prod-error')).toHaveTextContent('大於 0')
      expect(document.body.textContent).not.toMatch(/NaN|-\d+(\.\d+)? h/)
    }
  })
})

describe('商人路線：商人數進位、跟現有商人比、擋負距離', () => {
  it('needed merchants is a whole number (ceil) and compared with what you have', async () => {
    const { default: Trade } = await import('./components/TraderouteCalculator')
    render(<MemoryRouter><Trade /></MemoryRouter>)
    const needed = screen.getByTestId('traderoute-needed')
    expect(needed.textContent).toMatch(/^\d+$/)
    const n = Number(needed.textContent)
    fireEvent.change(screen.getByTestId('traderoute-have'), { target: { value: String(n - 1) } })
    expect(screen.getByTestId('traderoute-short')).toHaveTextContent(`還差 1 個`)
    fireEvent.change(screen.getByTestId('traderoute-have'), { target: { value: String(n) } })
    expect(screen.queryByTestId('traderoute-short')).toBeNull()
    expect(screen.getByTestId('traderoute-speed-note')).toHaveTextContent('待驗證')
  })

  it('negative / empty distance → error under the field, no negative time', async () => {
    const { default: Trade } = await import('./components/TraderouteCalculator')
    render(<MemoryRouter><Trade /></MemoryRouter>)
    fireEvent.change(screen.getByTestId('traderoute-dist'), { target: { value: '-30' } })
    expect(screen.getByTestId('traderoute-dist-error')).toBeInTheDocument()
    expect(screen.getByTestId('traderoute-needed')).toHaveTextContent('—')
    expect(document.body.textContent).not.toMatch(/NaN|-\d+m/)
  })
})

describe('綠洲回本：英雄宅用增量花費', () => {
  it('10→15 = 383,295 and 15→20 = 1,595,070 (audit probe), not the cumulative cost', async () => {
    const { hmCumulativeCost } = await import('./data/travian')
    expect(hmCumulativeCost(15) - hmCumulativeCost(10)).toBe(383295)
    expect(hmCumulativeCost(20) - hmCumulativeCost(15)).toBe(1595070)
    const { default: Oasis } = await import('./components/OasisRoiCalculator')
    render(<MemoryRouter><Oasis /></MemoryRouter>)
    fireEvent.change(screen.getByTestId('oasis-hm-target'), { target: { value: '15' } })
    // 換目標時「現在幾級」自動帶上一格（10 級）
    expect((screen.getByTestId('oasis-hm-now') as HTMLSelectElement).value).toBe('10')
    expect(screen.getByTestId('oasis-hm-cost')).toHaveTextContent('383,295')
    expect(screen.getByTestId('oasis-hm-compare')).toHaveTextContent('1,595,070')
  })

  it('gold bonus is off by default and named for what it is; clearing cost is added', async () => {
    const { default: Oasis } = await import('./components/OasisRoiCalculator')
    render(<MemoryRouter><Oasis /></MemoryRouter>)
    expect(screen.getByTestId('oasis-gold')).not.toBeChecked()
    expect(screen.getByText('金幣產量加成 +25%')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Plus/)
    const before = screen.getAllByTestId('calc-result-primary')[0]!.textContent
    fireEvent.change(screen.getByTestId('oasis-clear-cost'), { target: { value: '50000' } })
    expect(screen.getAllByTestId('calc-result-primary')[0]!.textContent).not.toBe(before)
  })
})

describe('資源田回本：一般村 10 級、金幣產量加成', () => {
  it('normal village offers 1–10 only; capital up to 20; gold bonus off by default, not called Plus', async () => {
    const { default: FieldRoi } = await import('./components/FieldRoiCalculator')
    render(<MemoryRouter><FieldRoi /></MemoryRouter>)
    const levels = () => Array.from((within(screen.getByTestId('field-roi-level')).getByRole('combobox') as HTMLSelectElement).options).map((o) => Number(o.value))
    expect(Math.max(...levels())).toBe(10)
    fireEvent.change(screen.getByTestId('field-roi-village'), { target: { value: 'capital' } })
    expect(Math.max(...levels())).toBe(20)
    fireEvent.change(within(screen.getByTestId('field-roi-level')).getByRole('combobox'), { target: { value: '15' } })
    fireEvent.change(screen.getByTestId('field-roi-village'), { target: { value: 'normal' } })
    expect((within(screen.getByTestId('field-roi-level')).getByRole('combobox') as HTMLSelectElement).value).toBe('10')
    expect(screen.getByTestId('field-roi-gold')).not.toBeChecked()
    expect(document.body.textContent).not.toMatch(/Plus/)
  })
})

describe('主村產量模擬：拿掉 21 級、加成建築 0–5、綠洲只能選官方組合', () => {
  it('no level 21 production (4270 had no source)', async () => {
    const { FIELD_PRODUCTION } = await import('./data/travian')
    expect(FIELD_PRODUCTION).toHaveLength(21)
    expect(FIELD_PRODUCTION).not.toContain(4270)
    const { default: CropSim } = await import('./components/CropSimCalculator')
    render(<MemoryRouter><CropSim /></MemoryRouter>)
    expect(screen.queryByRole('option', { name: '21 級' })).toBeNull()
  })

  it('bonus buildings are 0–5 dropdowns (no grain mill 50)', async () => {
    const { default: CropSim } = await import('./components/CropSimCalculator')
    render(<MemoryRouter><CropSim /></MemoryRouter>)
    for (const k of ['saw', 'bri', 'fnd', 'mil', 'bak']) {
      const el = within(screen.getByTestId(`cropsim-bonus-${k}`)).getByRole('combobox') as HTMLSelectElement
      expect(el.tagName).toBe('SELECT')
      expect(Array.from(el.options).map((o) => Number(o.value))).toEqual([0, 1, 2, 3, 4, 5])
    }
  })

  it('oases: up to 3 official types; crop max 150%, wood/clay/iron 75% outside the Natarian area', async () => {
    const { oasisPercent, OASIS_SLOTS } = await import('./components/CropSimCalculator')
    expect(OASIS_SLOTS).toBe(3)
    expect(oasisPercent(['single50_crop', 'single50_crop', 'single50_crop']).crop).toBe(150)
    expect(oasisPercent(['dual25_wood_crop', 'single25_wood', 'single25_wood'])).toEqual({ wood: 75, clay: 0, iron: 0, crop: 25 })
    // 第 4 塊不算
    expect(oasisPercent(['single50_crop', 'single50_crop', 'single50_crop', 'single50_crop']).crop).toBe(150)
    const { default: CropSim } = await import('./components/CropSimCalculator')
    render(<MemoryRouter><CropSim /></MemoryRouter>)
    expect(screen.getByTestId('cropsim-oasis-total')).toHaveTextContent('糧 +150%')
    fireEvent.change(screen.getByTestId('cropsim-oasis-3'), { target: { value: '' } })
    expect(screen.getByTestId('cropsim-oasis-total')).toHaveTextContent('糧 +100%')
    expect(screen.getByTestId('cropsim-oasis-1')).toHaveTextContent('木 +50%（納塔區）')
  })
})

describe('建造順序：加成建築要先滿足前置條件', () => {
  it('BB_REQ matches buildings.json prerequisites (main building 5, fields, grain mill)', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const data = JSON.parse(readFileSync(resolve(__dirname, '../../../../backend/data/static/buildings.json'), 'utf8')).buildings
    const { BB_REQ } = await import('./components/BuildOrderCalculator')
    const ids = { sawmill: ['sawmill', 'woodcutter'], brickyard: ['brickyard', 'clay_pit'], ironFoundry: ['iron_foundry', 'iron_mine'], grainMill: ['grain_mill', 'cropland'], bakery: ['bakery', 'cropland'] } as const
    for (const [bb, [id, field]] of Object.entries(ids)) {
      const pre = Object.fromEntries((data[id].prerequisites as { building_id: string; level: number }[]).map((p) => [p.building_id, p.level]))
      const req = BB_REQ[bb as keyof typeof BB_REQ]
      expect(req.mb, bb).toBe(pre.main_building)
      expect(req.field, bb).toBe(pre[field])
      if (bb === 'bakery') expect(req.alsoMill).toBe(pre.grain_mill)
    }
  })

  it('main building 1, all fields 10: never suggests a bonus building, says to raise the main building', async () => {
    const { planGreedy } = await import('./components/BuildOrderCalculator')
    const zero = { sawmill: 0, brickyard: 0, ironFoundry: 0, grainMill: 0, bakery: 0 }
    const r = planGreedy({ cropperId: '15c', isCap: true, start: { wood: 10, clay: 10, iron: 10, crop: 10 }, bonus: zero, mb: 1, gold: false })
    expect(r.steps.some((x) => x.kind === 'bb')).toBe(false)
    expect(r.blockedByMb.length).toBeGreaterThan(0)
    const ok = planGreedy({ cropperId: '15c', isCap: true, start: { wood: 10, clay: 10, iron: 10, crop: 10 }, bonus: zero, mb: 5, gold: false })
    expect(ok.steps.some((x) => x.kind === 'bb')).toBe(true)
    expect(ok.blockedByMb).toEqual([])
  })
})
