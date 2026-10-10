import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import FarmingCalculator from '../FarmingCalculator'

vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null,
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
const setArena = (v: number) => fireEvent.change(within(screen.getByRole('group', { name: '競技場等級' })).getByRole('spinbutton'), { target: { value: String(v) } })

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

  it('arena 5: summary keeps ONE chip listing unitCarry then arenaSpeed; the open note shows the two entries in that order, 8px apart', () => {
    setArena(5)
    const chips = titleChips()
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveAttribute('data-kind', 'unitCarry arenaSpeed')
    fireEvent.click(chips[0]!)
    const panel = document.getElementById(chips[0]!.getAttribute('aria-controls')!)!
    const entries = within(panel).getAllByTestId('pending-note-entry')
    expect(entries.map((e) => e.getAttribute('data-kind'))).toEqual(['unitCarry', 'arenaSpeed'])
    expect(entries[0]).not.toHaveClass('mt-2')
    expect(entries[1]).toHaveClass('mt-2')
  })

  it('arena 5: daily yield, raids per hour and payback each have exactly one chip that includes the speed', () => {
    setArena(5)
    expect(kindsOf(row('每小時最多次數'))).toEqual(['arenaSpeed'])
    expect(kindsOf(row('每日預估收益'))).toEqual(['unitCarry arenaSpeed'])
    expect(kindsOf(row('回本天數'))).toEqual(['units arenaSpeed'])
  })

  it('arena 5 + boots 25: the combined arenaBootsSpeed kind is used', () => {
    setArena(5)
    fireEvent.change(screen.getByLabelText('英雄靴子速度加成（%）'), { target: { value: '25' } })
    expect(titleChips()[0]).toHaveAttribute('data-kind', 'unitCarry arenaBootsSpeed')
    expect(kindsOf(row('每小時最多次數'))).toEqual(['arenaBootsSpeed'])
  })

  it('arena 0 and boots 0: summary lists only unitCarry and no detail row has a speed chip', () => {
    const chips = titleChips()
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveAttribute('data-kind', 'unitCarry')
    expect(kindsOf(row('每小時最多次數'))).toEqual([])
    expect(kindsOf(row('每日預估收益'))).toEqual(['unitCarry'])
    expect(kindsOf(row('回本天數'))).toEqual(['units'])
    const all = within(screen.getByTestId('calc-result-panel')).queryAllByTestId('pending-verify-chip').map((c) => c.getAttribute('data-kind') ?? '')
    expect(all.some((k) => /Speed/.test(k))).toBe(false)
  })
})
