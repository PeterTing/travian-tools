import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import { SUMMARY_PENDING } from './summaryPending'

// 沒登入、沒帳號：計算器用預設輸入
vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null,
    offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined,
    selectVillage: () => undefined,
  }
  return { ...mod, useAutoFill: () => value }
})

const sources = import.meta.glob(['/src/features/**/*.tsx', '/src/pages/**/*.tsx', '/src/components/**/*.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const calculators = import.meta.glob('/src/features/guideCalcs/components/*Calculator.tsx', {
  import: 'default',
  eager: true,
}) as Record<string, ComponentType>

const rel = (p: string) => p.replace(/^\/src\//, '')

const usesPanel = Object.entries(sources)
  .filter(([p, src]) => !p.includes('.test.') && !p.endsWith('CalcResultPanel.tsx') && /<CalcResultPanel\b/.test(src))
  .map(([p]) => rel(p))

/** 手機寬度、明細收合：只看得到摘要（標題、大數字、第二行） */
function summaryChipKinds(): string[] {
  const panel = screen.getByTestId('calc-result-panel')
  return within(panel)
    .queryAllByTestId('pending-verify-chip')
    .filter((c) => !c.closest('[data-testid="calc-result-details"]'))
    .map((c) => c.getAttribute('data-kind') ?? '')
}

describe('結果摘要：用到待驗證資料的數字，收合時旁邊也有灰標（P0-17 PM 規則）', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('every page that renders CalcResultPanel is declared in SUMMARY_PENDING (new pages must declare)', () => {
    expect(usesPanel.length).toBeGreaterThanOrEqual(9)
    for (const p of usesPanel) expect(SUMMARY_PENDING[p], `${p} 沒登記在 summaryPending.ts`).toBeDefined()
    for (const p of Object.keys(SUMMARY_PENDING)) expect(usesPanel, `${p} 登記了但沒用 CalcResultPanel`).toContain(p)
  })

  for (const [path, decl] of Object.entries(SUMMARY_PENDING)) {
    const Comp = calculators[`/src/${path}`]
    if (!Comp) continue // 計算器頁面（PathCalculatorPage）要 API，見上面登記；它摘要沒用到待驗證資料
    it(`390 collapsed: ${path.split('/').pop()} summary chips = ${JSON.stringify(decl.chips)}`, () => {
      render(<MemoryRouter><Comp /></MemoryRouter>)
      expect(screen.getByTestId('calc-result-details').closest('[hidden]')).not.toBeNull()
      expect(summaryChipKinds().sort()).toEqual(decl.chips.map((c) => c.join(' ')).sort())
      // 灰標放在標籤（標題或第二行的字）旁邊，不放在大數字旁
      expect(within(screen.getByTestId('calc-result-primary')).queryByTestId('pending-verify-chip')).toBeNull()
      // 同一種只放一個（標題和第二行不重複）
      const kinds = summaryChipKinds().flatMap((k) => k.split(' '))
      expect(new Set(kinds).size, `${path} 摘要裡同一種灰標放了兩次`).toBe(kinds.length)
      // 點開：說明撐滿面板內容寬度（data-fill）
      for (const chip of within(screen.getByTestId('calc-result-panel')).queryAllByTestId('pending-verify-chip')) {
        if (chip.closest('[data-testid="calc-result-details"]')) continue
        fireEvent.click(chip)
        expect(document.getElementById(chip.getAttribute('aria-controls') ?? '')).toHaveAttribute('data-fill', 'true')
        fireEvent.click(chip)
      }
      cleanup()
    })
  }
})

describe('結果面板高度上限：手機最多半個螢幕，超過就在面板內捲動', () => {
  const css = readFileSync(resolve(__dirname, 'components/calc.module.css'), 'utf8')
  // 不在 @media 裡的 .output 規則（手機）合起來看
  const outputRule = [...css.matchAll(/(^|\n)\.output\s*\{([^}]*)\}/g)].map((m) => m[2]).join('\n')

  it('.output: max-height min(50vh, 22rem) and overflow-y auto', () => {
    expect(outputRule).toMatch(/max-height:\s*min\(50vh,\s*22rem\)/)
    expect(outputRule).toMatch(/overflow-y:\s*auto/)
  })

  it('detail rows are at least 44px and vertically centered (adjacent chips never share a tap area)', () => {
    const m = css.match(/\n\.details \.row\s*\{([^}]*)\}/)
    expect(m?.[1]).toMatch(/min-height:\s*2\.75rem/)
    expect(m?.[1]).toMatch(/align-items:\s*center/)
  })
})

describe('貿易路線、農場收益、田地回本：明細的數字都照官方核對過，不放灰標（P0-23）', () => {
  const open = async (path: string) => {
    const Comp = calculators[`/src/${path}`]!
    render(<MemoryRouter><Comp /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    return screen.getByTestId('calc-result-details')
  }
  const chipNextTo = (root: HTMLElement, label: string) => {
    const el = within(root).getByText(label)
    return el.querySelector('[data-testid="pending-verify-chip"]')?.getAttribute('data-kind') ?? null
  }
  it('trade route: merchant capacity / speed (official S3) and trade office bonus (official knowledge base + S213, S88) -> no chip anywhere, trade office 0 or 10', async () => {
    const d = await open('features/guideCalcs/components/TraderouteCalculator.tsx')
    for (const label of ['每商人容量（含交易所）', '速度', '單程 / 往返', '總商人']) expect(chipNextTo(d, label), label).toBeNull()
    expect(screen.getByTestId('calc-result-secondary')).toHaveTextContent('往返')
    expect(within(screen.getByTestId('calc-result-panel')).queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    const tribe = screen.getByLabelText('部族')
    expect(tribe.tagName).toBe('SELECT')
    expect(tribe.closest('div')!.querySelector('[data-testid="pending-verify-chip"]')).toBeNull()
    fireEvent.change(screen.getByRole('spinbutton', { name: '交易所等級 (0–20)' }), { target: { value: '0' } })
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    cleanup()
  })
  it('farming: every listed unit is read from the ts11 in-game help (P0-18), so carry, cost and payback carry no 待驗證', async () => {
    const d = await open('features/guideCalcs/components/FarmingCalculator.tsx')
    for (const label of ['每組兵數', '每次實際帶回', '每日預估收益', '兵力初始成本', '回本天數']) expect(chipNextTo(d, label), label).toBeNull()
    const unit = screen.getByLabelText('單位')
    expect(unit.tagName).toBe('SELECT')
    expect(unit.closest('div')!.querySelector('[data-kind="unitCarry"]')).toBeNull()
    cleanup()
  })
  it('field ROI (default L7, Plus on): cost / production rows and compare table header -> no chip', async () => {
    const d = await open('features/guideCalcs/components/FieldRoiCalculator.tsx')
    for (const label of ['升級成本（合計）', '每小時產量增加', '每天產量增加']) expect(chipNextTo(d, label), label).toBeNull()
    expect(within(d).getByTestId('field-roi-compare').querySelector('thead [data-testid="pending-verify-chip"]')).toBeNull()
    cleanup()
  })
})

/** P0-23：資源田 1–20 級（官方知識庫）、加成建築、供水系統（官方知識庫）、Plus 相乘（官方 S129）、英雄宅（官方知識庫）都核對過 */
describe('首都產量模擬、綠洲、田地回本、建造順序：任何等級、Plus 開或關都沒有灰標（P0-23）', () => {
  const setSelect = (from: string, to: number) => fireEvent.change(screen.getByDisplayValue(from), { target: { value: String(to) } })
  const noChip = () => expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)

  it('capital production sim: default (fields 18, all bonus buildings 5, Plus on), field level 2 / 3, waterworks 10 -> no chip', async () => {
    const { default: CropSim } = await import('./components/CropSimCalculator')
    render(<MemoryRouter><CropSim /></MemoryRouter>)
    noChip()
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    noChip()
    expect(screen.queryByTestId('cropsim-pending')).toBeNull()
    setSelect('18 級', 2)
    noChip()
    setSelect('2 級', 3)
    noChip()
    fireEvent.click(screen.getByRole('checkbox', { name: /Plus/ }))
    noChip()
    cleanup()
  })

  it('field ROI: target levels 2–20, Plus on and off -> no chip (level 1 uses level 0, see below)', async () => {
    const { default: FieldRoi } = await import('./components/FieldRoiCalculator')
    render(<MemoryRouter><FieldRoi /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    let cur = 7
    for (const lv of [2, 3, 4, 10, 20]) {
      setSelect(`${cur} 級`, lv)
      cur = lv
      noChip()
    }
    fireEvent.click(screen.getByRole('checkbox', { name: /Plus/ }))
    noChip()
    cleanup()
  })

  it('oasis: Plus on and off -> no chip (hero mansion cost from the official knowledge base)', async () => {
    const { default: Oasis } = await import('./components/OasisRoiCalculator')
    render(<MemoryRouter><Oasis /></MemoryRouter>)
    expect(screen.getByTestId('calc-result-secondary')).toHaveTextContent('英雄宅成本')
    noChip()
    fireEvent.click(screen.getByRole('checkbox', { name: /Plus/ }))
    noChip()
    cleanup()
  })

  it('build order: default (Plus on, bonus buildings in the plan) -> no chip on the summary line or the list title; Plus off -> still none', async () => {
    const { default: BuildOrder } = await import('./components/BuildOrderCalculator')
    render(<MemoryRouter><BuildOrder /></MemoryRouter>)
    noChip()
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    noChip()
    fireEvent.click(screen.getByRole('checkbox', { name: /Plus/ }))
    noChip()
    cleanup()
  })
})

/** Plus 乘在總產量上（官方 S129），加成建築、綠洲加在基礎產量上：田地回本、建造順序、首都產量模擬、綠洲同一種算法 */
describe('Plus multiplies the total production on every page (official S129, P0-23)', () => {
  it('field ROI and build order use (1 + bonus + oasis) × 1.25', async () => {
    const { fieldRoi } = await import('./data/travian')
    const { planGreedy } = await import('./components/BuildOrderCalculator')
    const r = fieldRoi('crop', 10, { goldBonus: 0.25, bonusBuildingPct: 0.5, oasisPct: 0 })
    expect(r.productionGainPerHour).toBeCloseTo(r.deltaBase * 1.5 * 1.25, 6)
    const base = { cropperId: '15c' as const, isCap: false, bonus: { sawmill: 0, brickyard: 0, ironFoundry: 0, grainMill: 0, bakery: 0 }, mb: 10, start: { wood: 1, clay: 1, iron: 1, crop: 1 } }
    const on = planGreedy({ ...base, gold: true }).steps.find((x) => x.kind === 'field')!
    const off = planGreedy({ ...base, gold: false }).steps.find((x) => x.kind === 'field' && x.type === on.type && x.to === on.to)!
    expect(off.roi / on.roi).toBeCloseTo(1.25, 6)
  })
})

/** #27 後續：競技場、英雄靴子（不靠登記表） */
describe('#27 follow-up chips', () => {
  const secondaryKind = () => within(screen.getByTestId('calc-result-secondary')).queryByTestId('pending-verify-chip')?.getAttribute('data-kind') ?? null
  const titleChip = () => within(screen.getByTestId('calc-result-title')).queryByTestId('pending-verify-chip')

  it('march time: arena 0 -> no chip; arena 1 -> arenaSpeed on the summary line and the time / seconds / speed rows (never the title)', async () => {
    const { default: Path } = await import('@/pages/calculator/PathCalculatorPage')
    render(<MemoryRouter><Path /></MemoryRouter>)
    // 座標預設空白、空白不算：先填起始和目標（2026-10-10 座標框修正）
    for (const id of ['path-start-x', 'path-start-y', 'path-target-x', 'path-target-y']) fireEvent.change(screen.getByTestId(id), { target: { value: '0' } })
    const panel = screen.getByTestId('calc-result-panel')
    expect(within(panel).queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    const ts = within(screen.getByTestId('path-ts-level')).getByRole('spinbutton')
    fireEvent.change(ts, { target: { value: '1' } })
    expect(secondaryKind()).toBe('arenaSpeed')
    expect(titleChip()).toBeNull()
    expect(within(screen.getByTestId('calc-result-primary')).queryByTestId('pending-verify-chip')).toBeNull()
    const d = screen.getByTestId('calc-result-details')
    for (const key of ['pathCalc.travelTime', 'pathCalc.seconds', 'pathCalc.effectiveSpeed']) {
      expect(within(d).getByText(i18n.t(key)).querySelector('[data-testid="pending-verify-chip"]')?.getAttribute('data-kind'), key).toBe('arenaSpeed')
    }
    fireEvent.change(ts, { target: { value: '0' } })
    expect(within(panel).queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    cleanup()
  })

  it('march time (P0-20): boots only -> heroBootsSpeed; arena + boots -> arenaBootsSpeed; one chip per line on the same lines; both 0 -> none', async () => {
    const { default: Path } = await import('@/pages/calculator/PathCalculatorPage')
    render(<MemoryRouter><Path /></MemoryRouter>)
    // 座標預設空白、空白不算：先填起始和目標（2026-10-10 座標框修正）
    for (const id of ['path-start-x', 'path-start-y', 'path-target-x', 'path-target-y']) fireEvent.change(screen.getByTestId(id), { target: { value: '0' } })
    const panel = screen.getByTestId('calc-result-panel')
    const ts = within(screen.getByTestId('path-ts-level')).getByRole('spinbutton')
    const boots = screen.getByLabelText(i18n.t('pathCalc.heroBonus'))
    expect(i18n.t('pathCalc.heroBonus')).toBe('英雄靴子速度加成（%）')
    expect(screen.getByText(/競技場和英雄靴子只加快超過 20 格的那段路，兩者相加；競技場每升一級快 20%。/)).toBeInTheDocument()
    const rowKinds = () => {
      const d = screen.getByTestId('calc-result-details')
      return ['pathCalc.travelTime', 'pathCalc.seconds', 'pathCalc.effectiveSpeed'].map((key) => {
        const chips = within(d).getByText(i18n.t(key)).querySelectorAll('[data-testid="pending-verify-chip"]')
        expect(chips.length, key).toBeLessThanOrEqual(1)
        return chips[0]?.getAttribute('data-kind') ?? null
      })
    }
    fireEvent.change(boots, { target: { value: '25' } })
    expect(secondaryKind()).toBe('heroBootsSpeed')
    expect(rowKinds()).toEqual(['heroBootsSpeed', 'heroBootsSpeed', 'heroBootsSpeed'])
    fireEvent.change(ts, { target: { value: '3' } })
    expect(secondaryKind()).toBe('arenaBootsSpeed')
    expect(rowKinds()).toEqual(['arenaBootsSpeed', 'arenaBootsSpeed', 'arenaBootsSpeed'])
    expect(titleChip()).toBeNull()
    fireEvent.change(boots, { target: { value: '0' } })
    expect(secondaryKind()).toBe('arenaSpeed')
    fireEvent.change(ts, { target: { value: '0' } })
    expect(within(panel).queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    cleanup()
  })
})

/** 0 級產量（3／小時）官方資料沒有：用到它的地方標 fieldLevelZero（P0-23） */
describe('fieldLevelZero: level-0 field production is unverified', () => {
  const setSelect = (from: string, to: number) => fireEvent.change(screen.getByDisplayValue(from), { target: { value: String(to) } })
  const kindOf = (el: Element | null) => el?.querySelector('[data-testid="pending-verify-chip"]')?.getAttribute('data-kind') ?? null

  it('field ROI: target level 1 -> summary, both production rows and the compare header; level 2 -> none; the cost row never', async () => {
    const { default: FieldRoi } = await import('./components/FieldRoiCalculator')
    render(<MemoryRouter><FieldRoi /></MemoryRouter>)
    setSelect('7 級', 1)
    expect(kindOf(screen.getByTestId('calc-result-secondary'))).toBe('fieldLevelZero')
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    const d = screen.getByTestId('calc-result-details')
    expect(kindOf(within(d).getByText('每小時產量增加'))).toBe('fieldLevelZero')
    expect(kindOf(within(d).getByText('每天產量增加'))).toBe('fieldLevelZero')
    expect(kindOf(within(d).getByText('升級成本（合計）'))).toBeNull()
    expect(kindOf(within(d).getByTestId('field-roi-compare').querySelector('thead'))).toBe('fieldLevelZero')
    fireEvent.click(within(screen.getByTestId('calc-result-secondary')).getByTestId('pending-verify-chip'))
    expect(screen.getByTestId('pending-note-what')).toHaveTextContent('資源田 0 級的產量待驗證。')
    expect(screen.getByTestId('pending-note-source')).toHaveTextContent('官方知識庫從 1 級開始，沒有 0 級；目前用 3／小時，所以 1 級只增加 4。')
    setSelect('1 級', 2)
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    cleanup()
  })

  it('build order: a field going 0 -> 1 adds fieldLevelZero; starting at 1 does not', async () => {
    const { planGreedy } = await import('./components/BuildOrderCalculator')
    const base = { cropperId: '15c' as const, isCap: false, bonus: { sawmill: 0, brickyard: 0, ironFoundry: 0, grainMill: 0, bakery: 0 }, mb: 10, gold: true }
    const from0 = (lv: number) => planGreedy({ ...base, start: { wood: lv, clay: lv, iron: lv, crop: lv } }).steps.some((x) => x.kind === 'field' && x.from === 0)
    expect(from0(0)).toBe(true)
    expect(from0(1)).toBe(false)
    const src = Object.entries(sources).find(([f]) => f.endsWith('/BuildOrderCalculator.tsx'))![1]
    expect(src).toMatch(/planUsesFieldLevelZero\(start, plan\.steps\) \? \['fieldLevelZero' as const\]/)
  })

  it('build order: a field that starts at level 0 adds fieldLevelZero even if no step upgrades it (PM)', async () => {
    const { planUsesFieldLevelZero } = await import('./components/BuildOrderCalculator')
    const fieldStep = (from: number) => ({ kind: 'field' as const, type: 'crop' as const, from, to: from + 1, cost: 1, roi: 1, time: 1, label: '', labelZh: '' })
    // 起始有 0 級的木材田，20 步裡一步都沒升到它：總產量還是用 0 級 3／小時算
    expect(planUsesFieldLevelZero({ wood: 0, clay: 5, iron: 5, crop: 5 }, [fieldStep(5)])).toBe(true)
    expect(planUsesFieldLevelZero({ wood: 5, clay: 5, iron: 5, crop: 5 }, [])).toBe(false)
    expect(planUsesFieldLevelZero({ wood: 5, clay: 5, iron: 5, crop: 5 }, [fieldStep(0)])).toBe(true)
    expect(planUsesFieldLevelZero({ wood: 1, clay: 1, iron: 1, crop: 1 }, [fieldStep(1)])).toBe(false)
  })
})
