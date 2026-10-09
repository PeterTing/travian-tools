import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
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
const fmt = (n: number) => Math.round(n).toLocaleString()

/** 畫面上看得到、含有英雄宅花費數字的地方，每一處都要跟著一個「待驗證」灰標 */
function hmCostSpotsWithoutChip(): string[] {
  const costs = [10, 15, 20].map(hmCumulativeCost).map(fmt)
  const bad: string[] = []
  // 收合列的摘要
  const sec = screen.getByTestId('calc-result-secondary')
  if (costs.some((c) => sec.textContent?.includes(c)) || /英雄宅成本/.test(sec.textContent ?? '')) {
    if (!within(sec).queryByTestId('pending-verify-chip')) bad.push('summary')
  }
  // 明細（展開才看得到）
  const details = screen.getByTestId('calc-result-details')
  if (isShown(details)) {
    const row = within(details).getByText('英雄宅累積成本').closest('div')!
    if (!within(row).queryByTestId('pending-verify-chip')) bad.push('detail row')
    const table = within(details).getByTestId('oasis-hm-compare')
    if (!within(table.querySelector('thead')!).queryByTestId('pending-verify-chip')) bad.push('compare table cost column')
  }
  return bad
}

describe('OasisRoiCalculator: the Hero\'s Mansion cost number always comes with its 待驗證 chip (P0-17)', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it('phone, collapsed: the summary line shows the mansion cost WITH a chip', () => {
    setDesktop(false)
    render(<MemoryRouter><OasisRoiCalculator /></MemoryRouter>)
    const sec = screen.getByTestId('calc-result-secondary')
    expect(sec).toHaveTextContent('英雄宅成本')
    expect(within(sec).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    expect(isShown(screen.getByTestId('calc-result-details'))).toBe(false)
    expect(hmCostSpotsWithoutChip()).toEqual([])
    // 摘要那一行至少 44px、垂直置中：灰標點擊範圍不碰到下面的「展開明細」
    expect(screen.getByTestId('oasis-summary-hm')).toHaveClass('min-h-11', 'items-center')
  })

  it('phone, expanded and desktop: every spot with the cost has a chip; tapping shows the heroMansionCost copy', () => {
    setDesktop(false)
    const { unmount } = render(<MemoryRouter><OasisRoiCalculator /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    expect(hmCostSpotsWithoutChip()).toEqual([])
    unmount()

    setDesktop(true)
    render(<MemoryRouter><OasisRoiCalculator /></MemoryRouter>)
    expect(hmCostSpotsWithoutChip()).toEqual([])
    const table = screen.getByTestId('oasis-hm-compare')
    for (const tr of table.querySelectorAll('thead > tr, tbody > tr')) expect(tr).toHaveClass('h-11')
    fireEvent.click(within(screen.getByTestId('calc-result-secondary')).getByTestId('pending-verify-chip'))
    // Plus 預設有勾：一個灰標三種說明，依數字順序（每天 +X → fieldHighLevel、cropSim；英雄宅成本 → heroMansionCost）
    const entries = screen.getAllByTestId('pending-note-entry')
    expect(entries.map((e) => e.getAttribute('data-kind'))).toEqual(['fieldHighLevel', 'cropSim', 'heroMansionCost'])
    expect(within(entries[2]!).getByTestId('pending-note-what')).toHaveTextContent('英雄宅的花費還沒在 ts11 遊戲內核對。')
    expect(within(entries[2]!).getByTestId('pending-note-source')).toHaveTextContent('目前用的數字來源還在查，可能有誤差。')
  })
})
