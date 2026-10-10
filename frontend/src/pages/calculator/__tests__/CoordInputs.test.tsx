// 座標框（2026-10-10 Peter：預設 0、完全打不出「-」）：空白不算、不送出，負座標照送
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import InterceptionCalculatorPage from '../InterceptionCalculatorPage'
import AttackPlannerPage from '../AttackPlannerPage'
import SaveTroopsCalculatorPage from '../SaveTroopsCalculatorPage'
import PathCalculatorPage from '../PathCalculatorPage'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'

vi.mock('@/services/advancedCalculatorApi', () => ({
  advancedCalculatorApi: {
    calculateInterception: vi.fn(),
    calculateTsOptimizer: vi.fn(),
    calculatePathSpeedTs: vi.fn(),
    calculateSaveTroops: vi.fn(),
  },
}))
vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({ currentAccount: null }),
}))

const api = vi.mocked(advancedCalculatorApi)
const coordInputs = () => [...document.querySelectorAll<HTMLInputElement>('input[data-testid$="-x"], input[data-testid$="-y"]')]

describe('座標框：全站共用規則', () => {
  beforeAll(() => {
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('zh-TW')
  })

  it.each([
    ['interception', () => render(<MemoryRouter><InterceptionCalculatorPage /></MemoryRouter>), 6],
    ['OP planner', () => render(<AttackPlannerPage />), 4],
    ['march time', () => render(<MemoryRouter><PathCalculatorPage /></MemoryRouter>), 4],
  ] as const)('%s: every coordinate box starts empty (no 0), text + full keyboard, 16px / 44px', (_n, doRender, count) => {
    doRender()
    const inputs = coordInputs()
    expect(inputs).toHaveLength(count)
    for (const el of inputs) {
      expect(el.value).toBe('')
      expect(el.type).toBe('text')
      expect(el.inputMode).toBe('text')
      expect(el).toHaveClass('h-11', 'text-base')
      expect(['X', 'Y']).toContain(el.placeholder)
    }
  })

  it('save troops: no village coordinates any more (only the distance matters, audit 2026-10-10)', () => {
    render(<SaveTroopsCalculatorPage />)
    expect(coordInputs()).toHaveLength(0)
  })

  it('interception: empty coords → not sent, red text under the empty boxes', async () => {
    vi.useFakeTimers()
    render(<MemoryRouter><InterceptionCalculatorPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    await act(async () => { vi.runAllTimers() })
    vi.useRealTimers()
    expect(api.calculateInterception).not.toHaveBeenCalled()
    expect(screen.getAllByText('請輸入 \u2212200–200 的整數')).toHaveLength(6)
  })

  it('interception: negative coords (typed and pasted from ts11) are sent as numbers', async () => {
    api.calculateInterception.mockResolvedValueOnce({} as never)
    render(<MemoryRouter><InterceptionCalculatorPage /></MemoryRouter>)
    fireEvent.change(screen.getByTestId('attacker-x'), { target: { value: '-4' } })
    fireEvent.change(screen.getByTestId('attacker-y'), { target: { value: '\u221212' } })
    // ts11 複製原文（review/realtest/clip/03-153811.txt 第 44 行）
    fireEvent.paste(screen.getByTestId('defender-x'), { clipboardData: { getData: () => '\u202d(\u202d33\u202c|\u202d\u2212\u202d4\u202c\u202c)\u202c' } })
    fireEvent.change(screen.getByTestId('catcher-x'), { target: { value: '-200' } })
    fireEvent.change(screen.getByTestId('catcher-y'), { target: { value: '200' } })
    fireEvent.change(screen.getByTestId('intercept-arrival'), { target: { value: '12:00:00' } })
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    expect(api.calculateInterception).toHaveBeenCalledWith(expect.objectContaining({
      attacker_x: -4, attacker_y: -12, defender_x: 33, defender_y: -4, catcher_x: -200, catcher_y: 200,
    }))
  })

  it('OP planner: out of range → not sent', () => {
    render(<AttackPlannerPage />)
    fireEvent.change(screen.getByTestId('target-x'), { target: { value: '201' } })
    fireEvent.change(screen.getByTestId('target-y'), { target: { value: '0' } })
    fireEvent.change(screen.getByTestId('attacker-x'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('attacker-y'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('ts-submit'))
    expect(api.calculateTsOptimizer).not.toHaveBeenCalled()
    expect(screen.getByTestId('target-x-error')).toBeInTheDocument()
  })

  it('march time: no result until both start and target are filled; then -4 works', () => {
    render(<MemoryRouter><PathCalculatorPage /></MemoryRouter>)
    expect(screen.getByTestId('path-need-coords')).toHaveTextContent('填好起始和目標座標後顯示')
    expect(screen.getByTestId('calc-result-primary')).toHaveTextContent('—')
    fireEvent.change(screen.getByTestId('path-start-x'), { target: { value: '0' } })
    fireEvent.change(screen.getByTestId('path-start-y'), { target: { value: '0' } })
    fireEvent.change(screen.getByTestId('path-target-x'), { target: { value: '3' } })
    fireEvent.change(screen.getByTestId('path-target-y'), { target: { value: '-4' } })
    expect(screen.queryByTestId('path-need-coords')).toBeNull()
    // 距離 5 格
    expect(screen.getByTestId('calc-result-secondary')).toHaveTextContent(/^5 格/)
  })
})
