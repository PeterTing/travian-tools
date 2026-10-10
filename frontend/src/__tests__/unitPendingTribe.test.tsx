import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import type { TroopTribe } from '@/types/game'

// 帳號的部族（每個測試自己設）
const fill = vi.hoisted(() => ({ tribe: null as string | null }))
vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  return {
    ...mod,
    useAutoFill: (): AutoFillValue => ({
      account: null, village: null, villages: [], speed: 1, tribe: fill.tribe as TroopTribe | null, accountSpeed: 1,
      accountTribe: fill.tribe as TroopTribe | null, offsetHours: null, overrides: {}, setOverride: () => undefined,
      clearOverride: () => undefined, selectVillage: () => undefined,
    }),
  }
})

import AutoFillBar from '@/components/autofill/AutoFillBar'
import CalcFrame, { CalcBar } from '@/components/autofill/CalcFrame'
import FarmingCalculator, { FARM_UNITS } from '@/features/guideCalcs/components/FarmingCalculator'
import { showUnitPendingLine, unitPendingLineKey } from '@/lib/unitPending'
import { vikingCarryPending } from '@/data/unitSpeeds'

// 維京運載量 2026-10-11 起 ✓（Fandom、Siegewise 兩份一致），這一行只剩中文名暫譯
// 「全部」／不知道部族
const LINE = /^維京的兵種中文名為暫譯$/
// 選維京（設計師）：只寫「兵種中文名為暫譯」
const LINE_PROVISIONAL = /^兵種中文名為暫譯$/
// 5 族 ts11 核對；斯巴達 2026-10-11 在 ASIA x1 遊戲內說明核對（數字、速度、運載量、中文名）
const VERIFIED = ['romans', 'teutons', 'gauls', 'egyptians', 'huns', 'spartans']
const line = () => screen.queryByTestId('autofill-unit-pending')

describe('兵種待驗證那一行看部族（P0-17 (k)）', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })
  beforeEach(() => {
    fill.tribe = null
  })

  it('only Vikings or 「全部」 need the line; unknown tribe shows it too; the 5 ts11-verified tribes and Spartans do not', () => {
    for (const tr of VERIFIED) expect(showUnitPendingLine(tr), tr).toBe(false)
    expect(showUnitPendingLine('vikings')).toBe(true)
    expect(showUnitPendingLine('all')).toBe(true)
    // 不知道部族：可能是維京，所以顯示
    expect(showUnitPendingLine(null)).toBe(true)
    expect(showUnitPendingLine(undefined)).toBe(true)
  })

  it('pages without a tribe selector follow the account tribe', () => {
    for (const tr of VERIFIED) {
      fill.tribe = tr
      const { unmount } = render(<MemoryRouter initialEntries={['/calculator/crop']}><AutoFillBar /></MemoryRouter>)
      expect(line(), tr).not.toBeInTheDocument()
      unmount()
    }
    fill.tribe = 'vikings'
    const { unmount } = render(<MemoryRouter initialEntries={['/calculator/crop']}><AutoFillBar /></MemoryRouter>)
    expect(screen.getByTestId('autofill-unit-pending-text')).toHaveTextContent(LINE_PROVISIONAL)
    unmount()
  })

  it('a page tribe selector wins over the account tribe (CalcBar tribe=…)', () => {
    fill.tribe = 'vikings'
    const { unmount } = render(
      <MemoryRouter initialEntries={['/database/troops']}><CalcFrame usesVillage={false}><CalcBar tribe="gauls" /></CalcFrame></MemoryRouter>,
    )
    expect(line()).not.toBeInTheDocument()
    unmount()
    fill.tribe = 'gauls'
    render(<MemoryRouter initialEntries={['/database/troops']}><CalcFrame usesVillage={false}><CalcBar tribe="all" /></CalcFrame></MemoryRouter>)
    expect(screen.getByTestId('autofill-unit-pending-text')).toHaveTextContent(LINE)
  })

  it('Vikings: only 「兵種中文名為暫譯」 (one chip); Spartans no line; 「全部」 and unknown tribe 「維京的兵種中文名為暫譯」', () => {
    fill.tribe = 'vikings'
    const v = render(<MemoryRouter initialEntries={['/calculator/crop']}><AutoFillBar /></MemoryRouter>)
    const row = screen.getByTestId('autofill-unit-pending')
    expect(screen.getAllByTestId('autofill-unit-pending-text')).toHaveLength(1)
    expect(screen.getByTestId('autofill-unit-pending-text')).toHaveTextContent(LINE_PROVISIONAL)
    expect(row.querySelectorAll('[data-testid="pending-verify-chip"]')).toHaveLength(1)
    v.unmount()
    // 斯巴達：2026-10-11 起是 ASIA x1 遊戲內名稱和數字，整行都不出現
    fill.tribe = 'spartans'
    const s = render(<MemoryRouter initialEntries={['/calculator/crop']}><AutoFillBar /></MemoryRouter>)
    expect(line()).not.toBeInTheDocument()
    s.unmount()
    // 頁面選單選維京也一樣（帳號是高盧）
    fill.tribe = 'gauls'
    const a = render(<MemoryRouter initialEntries={['/database/troops']}><CalcFrame usesVillage={false}><CalcBar tribe="vikings" /></CalcFrame></MemoryRouter>)
    expect(screen.getByTestId('autofill-unit-pending-text')).toHaveTextContent(LINE_PROVISIONAL)
    a.unmount()
    // 不知道部族
    fill.tribe = null
    const b = render(<MemoryRouter initialEntries={['/calculator/crop']}><AutoFillBar /></MemoryRouter>)
    expect(screen.getByTestId('autofill-unit-pending-text')).toHaveTextContent(LINE)
    b.unmount()
  })

  it('wording follows Viking carry: ✓ now; if it went back to 待驗證 the exact designer strings come back', () => {
    expect(vikingCarryPending()).toBe(false)
    const zh = (tribe: string | null, pending: boolean) => i18n.t(unitPendingLineKey(tribe, pending))
    expect(zh('vikings', false)).toBe('兵種中文名為暫譯')
    expect(zh('all', false)).toBe('維京的兵種中文名為暫譯')
    expect(zh(null, false)).toBe('維京的兵種中文名為暫譯')
    // 運載量待驗證時（設計師，一字不差）
    expect(zh('vikings', true)).toBe('維京的運載量待驗證，兵種中文名為暫譯')
    expect(zh('all', true)).toBe('維京的兵種運載量待驗證')
    expect(zh(null, true)).toBe('維京的兵種運載量待驗證')
  })

  it('one line only (no Spartan line any more)', () => {
    fill.tribe = 'vikings'
    render(<MemoryRouter initialEntries={['/calculator/crop']}><AutoFillBar /></MemoryRouter>)
    expect(screen.getAllByTestId('autofill-unit-pending-text')).toHaveLength(1)
    expect(screen.queryByText(/斯巴達/)).not.toBeInTheDocument()
  })

  it('農場收益 follows the picked unit’s tribe, not the account (all picks are ts11-verified → no line)', () => {
    fill.tribe = 'spartans'
    render(<MemoryRouter initialEntries={['/calculator/farming']}><CalcFrame><FarmingCalculator /></CalcFrame></MemoryRouter>)
    expect(screen.getByTestId('autofill-bar')).toBeInTheDocument()
    expect(line()).not.toBeInTheDocument()
    const select = document.getElementById('farming-unit') as HTMLSelectElement
    for (const u of FARM_UNITS) {
      fireEvent.change(select, { target: { value: u.id } })
      expect(VERIFIED, u.id).toContain(u.tribeId)
      expect(line(), u.id).not.toBeInTheDocument()
    }
  })

  it('pages with their own tribe selector pass it to CalcBar', () => {
    const src = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8')
    expect(src('pages/database/TroopsPage.tsx')).toContain('<CalcBar tribe={tribe} />')
    expect(src('pages/calculator/TechnologyCalculatorPage.tsx')).toContain('<CalcBar tribe={form.tribe} />')
    expect(src('features/guideCalcs/components/LaunchSimCalculator.tsx')).toContain('<CalcBar tribe={tribe} />')
    expect(src('features/guideCalcs/components/FarmingCalculator.tsx')).toContain('<CalcBar tribe={unit.tribeId} />')
  })
})
