import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import LaunchSimCalculator from './components/LaunchSimCalculator'
import { LAUNCH_SIM_ESTIMATE_ONLY } from '@/lib/pendingNotes'

// PM 2026-10-11（#45）：開局衝村模擬是估算，不放「待驗證」灰標；結果下面一行 12px 灰字說明
describe('開局衝村模擬：估算說明取代待驗證灰標', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    // 手機寬度（明細收合）
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('flag is on', () => { expect(LAUNCH_SIM_ESTIMATE_ONLY).toBe(true) })

  it('no launchSim chip anywhere; grey 12px estimate line under the result', () => {
    render(<MemoryRouter><LaunchSimCalculator /></MemoryRouter>)
    const chips = screen.queryAllByTestId('pending-verify-chip').filter((c) => c.getAttribute('data-kind') === 'launchSim')
    expect(chips).toHaveLength(0)
    const note = screen.getByTestId('launch-sim-estimate-note')
    expect(note).toHaveTextContent('依模型估算，實際會因任務、冒險和操作不同')
    expect(note).toHaveClass('text-xs', 'text-gray-500')
    // 在結果摘要裡（手機收合也看得到），不在明細裡
    const panel = screen.getByTestId('calc-result-panel')
    expect(within(panel).getByTestId('launch-sim-estimate-note')).toBe(note)
    expect(note.closest('[data-testid="calc-result-details"]')).toBeNull()
  })
})
