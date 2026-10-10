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
import { showUnitPendingLine } from '@/lib/unitPending'

const LINE = /^斯巴達、維京的兵種數字待驗證（斯巴達含速度）$/
const VERIFIED = ['romans', 'teutons', 'gauls', 'egyptians', 'huns']
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

  it('only Spartans, Vikings, or 「全部」 need the line; the 5 ts11-verified tribes and unknown tribe do not', () => {
    for (const tr of VERIFIED) expect(showUnitPendingLine(tr), tr).toBe(false)
    expect(showUnitPendingLine('spartans')).toBe(true)
    expect(showUnitPendingLine('vikings')).toBe(true)
    expect(showUnitPendingLine('all')).toBe(true)
    expect(showUnitPendingLine(null)).toBe(false)
    expect(showUnitPendingLine(undefined)).toBe(false)
  })

  it('pages without a tribe selector follow the account tribe', () => {
    for (const tr of VERIFIED) {
      fill.tribe = tr
      const { unmount } = render(<MemoryRouter initialEntries={['/calculator/crop']}><AutoFillBar /></MemoryRouter>)
      expect(line(), tr).not.toBeInTheDocument()
      unmount()
    }
    for (const tr of ['spartans', 'vikings']) {
      fill.tribe = tr
      const { unmount } = render(<MemoryRouter initialEntries={['/calculator/crop']}><AutoFillBar /></MemoryRouter>)
      expect(screen.getByTestId('autofill-unit-pending-text')).toHaveTextContent(LINE)
      unmount()
    }
  })

  it('a page tribe selector wins over the account tribe (CalcBar tribe=…)', () => {
    fill.tribe = 'spartans'
    const { unmount } = render(
      <MemoryRouter initialEntries={['/database/troops']}><CalcFrame usesVillage={false}><CalcBar tribe="gauls" /></CalcFrame></MemoryRouter>,
    )
    expect(line()).not.toBeInTheDocument()
    unmount()
    fill.tribe = 'gauls'
    render(<MemoryRouter initialEntries={['/database/troops']}><CalcFrame usesVillage={false}><CalcBar tribe="all" /></CalcFrame></MemoryRouter>)
    expect(screen.getByTestId('autofill-unit-pending-text')).toHaveTextContent(LINE)
  })

  it('one line only (no second Spartan-speed line)', () => {
    fill.tribe = 'spartans'
    render(<MemoryRouter initialEntries={['/calculator/crop']}><AutoFillBar /></MemoryRouter>)
    expect(screen.getAllByTestId('autofill-unit-pending-text')).toHaveLength(1)
    expect(screen.queryByText('斯巴達速度待驗證')).not.toBeInTheDocument()
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
