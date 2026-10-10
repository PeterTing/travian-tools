import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import FarmingCalculator from '../FarmingCalculator'

vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null, birthTribe: null, multiTribe: false,
    offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined,
    selectVillage: () => undefined,
  }
  return { ...mod, useAutoFill: () => value }
})

const kindsOf = (el: Element) => [...el.querySelectorAll('[data-testid="pending-verify-chip"]')].map((c) => c.getAttribute('data-kind'))
const titleChips = () => {
  const panel = screen.getByTestId('calc-result-panel')
  return within(panel).queryAllByTestId('pending-verify-chip').filter((c) => !c.closest('[data-testid="calc-result-details"]'))
}
const row = (label: string) => within(screen.getByTestId('calc-result-details')).getByText(label).closest('div')!
const setArena = (v: number) => fireEvent.change(screen.getByRole('combobox', { name: '競技場等級' }), { target: { value: String(v) } })

describe('農場收益：行軍速度灰標（P0-22）', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })
  beforeEach(() => {
    render(<MemoryRouter><FarmingCalculator /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
  })

  // P0-18 之後列出的 6 種兵都在 ts11 核對過：unitCarry／units 不再出現，只剩行軍速度
  it('arena 5: summary keeps ONE chip; units are ts11-verified (P0-18) so it lists only arenaSpeed', () => {
    setArena(5)
    const chips = titleChips()
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveAttribute('data-kind', 'arenaSpeed')
    fireEvent.click(chips[0]!)
    const panel = document.getElementById(chips[0]!.getAttribute('aria-controls')!)!
    expect(within(panel).getAllByTestId('pending-note-entry').map((e) => e.getAttribute('data-kind'))).toEqual(['arenaSpeed'])
  })

  it('arena 5: groups, total troops and payback each have exactly one chip that includes the speed; daily yield does not use travel time → no chip', () => {
    setArena(5)
    expect(kindsOf(row('需要幾組'))).toEqual(['arenaSpeed'])
    expect(kindsOf(row('總兵數'))).toEqual(['arenaSpeed'])
    expect(kindsOf(row('回本天數'))).toEqual(['arenaSpeed'])
    expect(kindsOf(row('每日預估收益'))).toEqual([])
  })

  it('arena 5 + boots 25: the combined arenaBootsSpeed kind is used', () => {
    setArena(5)
    fireEvent.change(screen.getByLabelText('英雄靴子速度加成（%）'), { target: { value: '25' } })
    expect(titleChips()[0]).toHaveAttribute('data-kind', 'arenaBootsSpeed')
    expect(kindsOf(row('需要幾組'))).toEqual(['arenaBootsSpeed'])
  })

  it('arena 0 and boots 0: no speed chip anywhere (and no unit chip: ts11-verified)', () => {
    expect(titleChips()).toHaveLength(0)
    expect(kindsOf(row('需要幾組'))).toEqual([])
    expect(kindsOf(row('每日預估收益'))).toEqual([])
    expect(kindsOf(row('回本天數'))).toEqual([])
    const all = within(screen.getByTestId('calc-result-panel')).queryAllByTestId('pending-verify-chip').map((c) => c.getAttribute('data-kind') ?? '')
    expect(all.some((k) => /Speed/.test(k))).toBe(false)
  })
})
