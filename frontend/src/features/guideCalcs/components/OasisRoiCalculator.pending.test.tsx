import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import OasisRoiCalculator from './OasisRoiCalculator'
import { hmCumulativeCost } from '../data/travian'

const setDesktop = (matches: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches, media: query, onchange: null,
    addListener: () => undefined, removeListener: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

const isShown = (el: Element) => !el.closest('[hidden]')

// P0-23：英雄宅 2–20 級花費照官方知識庫、資源田產量照官方知識庫、Plus 乘在總產量上照官方 S129 → 整頁沒有「待驗證」
describe('OasisRoiCalculator: everything is checked against official data, so no 待驗證 chip (P0-23)', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it('hero mansion cumulative cost = official knowledge base table (L1–10 sum)', () => {
    expect(hmCumulativeCost(10)).toBe(114240)
  })

  it('phone collapsed, phone expanded and desktop: no chip anywhere, with Plus on or off', () => {
    setDesktop(false)
    const { unmount } = render(<MemoryRouter><OasisRoiCalculator /></MemoryRouter>)
    expect(screen.getByTestId('calc-result-secondary')).toHaveTextContent('英雄宅成本')
    expect(isShown(screen.getByTestId('calc-result-details'))).toBe(false)
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    expect(isShown(screen.getByTestId('calc-result-details'))).toBe(true)
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    unmount()

    setDesktop(true)
    render(<MemoryRouter><OasisRoiCalculator /></MemoryRouter>)
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    const table = screen.getByTestId('oasis-hm-compare')
    for (const tr of table.querySelectorAll('thead > tr, tbody > tr')) expect(tr).toHaveClass('h-11')
    fireEvent.click(screen.getByRole('checkbox', { name: /金幣產量加成/ }))
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
  })
})
