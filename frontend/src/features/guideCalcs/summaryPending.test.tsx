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

describe('貿易路線、農場收益、田地回本：明細裡用到待驗證資料的數字也有灰標', () => {
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
  it('trade route: capacity, speed, one-way/round trip rows, table header, total merchants -> merchantCapacity; tribe select label; summary: only the second line (容量 · 往返) has a chip, title has none (dedup)', async () => {
    const d = await open('features/guideCalcs/components/TraderouteCalculator.tsx')
    expect(chipNextTo(d, '每商人容量（含交易所）')).toBe('merchantCapacity')
    expect(chipNextTo(d, '速度')).toBe('merchantCapacity')
    expect(chipNextTo(d, '單程 / 往返')).toBe('merchantCapacity')
    const sec = screen.getByTestId('calc-result-secondary')
    expect(sec).toHaveTextContent('往返')
    expect(within(sec).getByTestId('pending-verify-chip')).toHaveAttribute('data-kind', 'merchantCapacity')
    expect(within(screen.getByTestId('calc-result-title')).queryByTestId('pending-verify-chip')).toBeNull()
    expect(chipNextTo(d, '總商人')).toBe('merchantCapacity')
    expect(within(within(d).getByTestId('traderoute-table').querySelector('thead')!).getByTestId('pending-verify-chip')).toHaveAttribute('data-kind', 'merchantCapacity')
    const tribe = screen.getByLabelText('部族')
    expect(tribe.tagName).toBe('SELECT')
    expect(tribe.closest('div')!.querySelector('[data-kind="merchantCapacity"]')).not.toBeNull()
    cleanup()
  })
  it('farming: carry cap and daily yield -> unitCarry; troop cost and payback -> units; unit select label -> unitCarry', async () => {
    const d = await open('features/guideCalcs/components/FarmingCalculator.tsx')
    expect(chipNextTo(d, '搬運上限')).toBe('unitCarry')
    expect(chipNextTo(d, '每日預估收益')).toBe('unitCarry')
    expect(chipNextTo(d, '兵力初始成本')).toBe('units')
    expect(chipNextTo(d, '回本天數')).toBe('units')
    const unit = screen.getByLabelText('單位')
    expect(unit.tagName).toBe('SELECT')
    expect(unit.closest('div')!.querySelector('[data-kind="unitCarry"]')).not.toBeNull()
    cleanup()
  })
  it('field ROI (default L7): cost / production rows and compare table header -> building', async () => {
    const d = await open('features/guideCalcs/components/FieldRoiCalculator.tsx')
    // 預設 L7、Plus 有勾、沒有加成建築
    expect(chipNextTo(d, '升級成本（合計）')).toBe('fieldHighLevel')
    expect(chipNextTo(d, '每小時產量增加')).toBe('fieldHighLevel plusFormula')
    expect(chipNextTo(d, '每天產量增加')).toBe('fieldHighLevel plusFormula')
    expect(within(within(d).getByTestId('field-roi-compare').querySelector('thead')!).getByTestId('pending-verify-chip')).toHaveAttribute('data-kind', 'fieldHighLevel plusFormula')
    cleanup()
  })
})

/** 不靠登記表：首都產量模擬的加成建築（預設全 5 級）會算進數字 → building */
describe('首都產量模擬：加成建築算進去的數字都有 building', () => {
  const kindsOf = (el: Element | null) => el?.querySelector('[data-testid="pending-verify-chip"]')?.getAttribute('data-kind') ?? null
  // 明細的合計列（不是表格欄位標題）
  const rowLabel = (d: HTMLElement, label: string) => within(d).getAllByText(label).find((el) => !el.closest('table'))!
  // 加成建築欄位：label 和 input 在同一個 div 裡
  const setBonus = (label: string, v: number) => {
    const input = screen.getByText(label, { selector: 'label' }).parentElement!.querySelector('input')!
    fireEvent.change(input, { target: { value: String(v) } })
  }
  it('default: summary title, 產量分解 title and the three total rows list fieldHighLevel, building, cropSim in order; table header cells have no chip', async () => {
    const { default: CropSim } = await import('./components/CropSimCalculator')
    render(<MemoryRouter><CropSim /></MemoryRouter>)
    expect(kindsOf(screen.getByTestId('calc-result-title'))).toBe('fieldHighLevel building cropSim')
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    const d = screen.getByTestId('calc-result-details')
    expect(kindsOf(within(d).getByTestId('cropsim-breakdown-title'))).toBe('fieldHighLevel building cropSim')
    expect(within(d).getByTestId('cropsim-breakdown').querySelector('thead [data-testid="pending-verify-chip"]')).toBeNull()
    for (const label of ['木 + 土 + 鐵 /hr', '糧食 /hr', '總計 /hr']) {
      expect(kindsOf(rowLabel(d, label)), label).toBe('fieldHighLevel building cropSim')
    }
    cleanup()
  })
  it('bonus buildings: only lines whose buildings are > 0 get building; all 0 -> none', async () => {
    const { default: CropSim } = await import('./components/CropSimCalculator')
    render(<MemoryRouter><CropSim /></MemoryRouter>)
    const set = setBonus
    set('Grain Mill', 0)
    set('Bakery', 0)
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    const d = screen.getByTestId('calc-result-details')
    expect(kindsOf(rowLabel(d, '糧食 /hr'))).toBe('fieldHighLevel cropSim')
    expect(kindsOf(rowLabel(d, '木 + 土 + 鐵 /hr'))).toBe('fieldHighLevel building cropSim')
    expect(kindsOf(screen.getByTestId('calc-result-title'))).toBe('fieldHighLevel building cropSim')
    for (const l of ['Sawmill', 'Brickyard', 'Iron Foundry']) set(l, 0)
    expect(kindsOf(rowLabel(d, '木 + 土 + 鐵 /hr'))).toBe('fieldHighLevel cropSim')
    expect(kindsOf(screen.getByTestId('calc-result-title'))).toBe('fieldHighLevel cropSim')
    expect(kindsOf(within(d).getByTestId('cropsim-breakdown-title'))).toBe('fieldHighLevel cropSim')
    cleanup()
  })
})

/** 不靠登記表：直接看畫面（F） */
describe('Plus 有勾、390 收合：摘要的灰標點開要列出 Plus 的說明', () => {
  const openSummaryChip = () => {
    const panel = screen.getByTestId('calc-result-panel')
    expect(screen.getByTestId('calc-result-details').closest('[hidden]')).not.toBeNull()
    const chips = within(panel).getAllByTestId('pending-verify-chip').filter((c) => !c.closest('[data-testid="calc-result-details"]'))
    expect(chips).toHaveLength(1) // 摘要一行一個灰標
    fireEvent.click(chips[0]!)
    const note = document.getElementById(chips[0]!.getAttribute('aria-controls') ?? '')!
    expect(chips[0]).toHaveAttribute('aria-expanded', 'true')
    expect(note).toHaveAttribute('data-fill', 'true')
    return within(note).getAllByTestId('pending-note-entry')
  }
  const plusBox = () => {
    const box = screen.getByRole('checkbox', { name: /Plus/ }) as HTMLInputElement
    expect(box.checked).toBe(true)
    return box
  }

  it('oasis: cropSim (每天 +X) then heroMansionCost; unchecking Plus drops cropSim', async () => {
    const { default: Oasis } = await import('./components/OasisRoiCalculator')
    render(<MemoryRouter><Oasis /></MemoryRouter>)
    plusBox()
    const entries = openSummaryChip()
    expect(entries.map((e) => e.getAttribute('data-kind'))).toEqual(['fieldHighLevel', 'cropSim', 'heroMansionCost'])
    expect(entries[1]).toHaveTextContent('Plus 用乘的（×1.25）')
    // 種類之間隔 8px（mt-2）
    expect(entries[1]).toHaveClass('mt-2')
    fireEvent.click(plusBox())
    const chip = within(screen.getByTestId('calc-result-secondary')).getByTestId('pending-verify-chip')
    expect(chip).toHaveAttribute('data-kind', 'fieldHighLevel heroMansionCost')
    cleanup()
  })

  it('field ROI (default L7): fieldHighLevel (成本) then plusFormula (每天 +), with the PM copy', async () => {
    const { default: FieldRoi } = await import('./components/FieldRoiCalculator')
    render(<MemoryRouter><FieldRoi /></MemoryRouter>)
    plusBox()
    const entries = openSummaryChip()
    expect(entries.map((e) => e.getAttribute('data-kind'))).toEqual(['fieldHighLevel', 'plusFormula'])
    expect(entries[0]).toHaveTextContent('資源田 4 級以上的花費、時間，和 3 級以上的產量是公式推算。')
    expect(entries[0]).toHaveTextContent('ts11 只核對過花費 1–3 級、產量 0–2 級。')
    expect(entries[1]).toHaveTextContent('Plus 加成的算法還沒在 ts11 遊戲內核對。')
    expect(entries[1]).toHaveTextContent('這頁用加總算，產量模擬和綠洲用相乘算，結果可能不一樣。')
    cleanup()
  })
})

/** fieldHighLevel 的門檻：產量 3 級以上、花費／時間 4 級以上（ts11 核對過產量 0–2、花費 1–3） */
describe('fieldHighLevel thresholds: production >= 3, cost/time >= 4', () => {
  const setLevel = (from: string, to: number) => fireEvent.change(screen.getByDisplayValue(from), { target: { value: String(to) } })
  const uncheckPlus = () => fireEvent.click(screen.getByRole('checkbox', { name: /Plus/ }))
  const summaryKinds = () => {
    const c = within(screen.getByTestId('calc-result-secondary')).queryByTestId('pending-verify-chip')
    return c ? c.getAttribute('data-kind') : null
  }
  const rowKind = (label: string) => {
    const d = screen.getByTestId('calc-result-details')
    return within(d).getByText(label).querySelector('[data-testid="pending-verify-chip"]')?.getAttribute('data-kind') ?? null
  }

  it('field ROI: target lvl 2 -> no chip; lvl 3 -> production only; lvl 4 -> cost too', async () => {
    const { default: FieldRoi } = await import('./components/FieldRoiCalculator')
    render(<MemoryRouter><FieldRoi /></MemoryRouter>)
    uncheckPlus()
    setLevel('Lv 7', 2)
    expect(summaryKinds()).toBeNull()
    expect(rowKind('升級成本（合計）')).toBeNull()
    expect(rowKind('每小時產量增加')).toBeNull()
    setLevel('Lv 2', 3)
    expect(summaryKinds()).toBe('fieldHighLevel')
    expect(rowKind('升級成本（合計）')).toBeNull() // 花費 3 級核對過
    expect(rowKind('每小時產量增加')).toBe('fieldHighLevel')
    expect(rowKind('每天產量增加')).toBe('fieldHighLevel')
    setLevel('Lv 3', 4)
    expect(summaryKinds()).toBe('fieldHighLevel')
    expect(rowKind('升級成本（合計）')).toBe('fieldHighLevel')
    cleanup()
  })

  it('oasis: field level choices start at 5, so production always uses lvl >= 3 -> fieldHighLevel on the summary and both production rows', async () => {
    const { default: Oasis } = await import('./components/OasisRoiCalculator')
    render(<MemoryRouter><Oasis /></MemoryRouter>)
    uncheckPlus()
    const lv = screen.getByDisplayValue('Lv 10') as HTMLSelectElement
    expect(Math.min(...[...lv.options].map((o) => +o.value))).toBeGreaterThanOrEqual(3)
    expect(summaryKinds()).toBe('fieldHighLevel heroMansionCost')
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    expect(rowKind('此綠洲每小時產量')).toBe('fieldHighLevel')
    expect(rowKind('每天')).toBe('fieldHighLevel')
    cleanup()
  })

  it('build order: cost/time chip only when a field step goes to lvl >= 4 (start lvl 1 -> none reach 4; start lvl 3 -> some do)', async () => {
    const { planGreedy } = await import('./components/BuildOrderCalculator')
    const base = { cropperId: '15c' as const, isCap: false, bonus: { sawmill: 0, brickyard: 0, ironFoundry: 0, grainMill: 0, bakery: 0 }, mb: 10, gold: true }
    const reach4 = (lv: number) => planGreedy({ ...base, start: { wood: lv, clay: lv, iron: lv, crop: lv } }).steps.some((x) => x.kind === 'field' && x.to >= 4)
    expect(reach4(1)).toBe(false)
    expect(reach4(3)).toBe(true)
  })
})
