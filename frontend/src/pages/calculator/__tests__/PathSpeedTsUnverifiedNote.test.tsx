import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import PathSpeedTsCalculatorPage from '../PathSpeedTsCalculatorPage'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'

vi.mock('@/services/advancedCalculatorApi', () => ({
  advancedCalculatorApi: { calculatePathSpeedTs: vi.fn() },
}))

vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({ currentAccount: null }),
}))

const mockedApi = vi.mocked(advancedCalculatorApi)

// 座標預設空白、空白不送出（2026-10-10）：先填攻擊者和目標
const fillCoords = () => {
  for (const [id, v] of [['attacker-x', '0'], ['attacker-y', '0'], ['target-x', '3'], ['target-y', '-5']]) {
    fireEvent.change(screen.getByTestId(id), { target: { value: v } })
  }
}

// 2026-10-11 起斯巴達在 ASIA x1 核對過，後端目前回空清單；這裡用假資料測「有待驗證兵種」的那條路徑
const UNVERIFIED = ['Hoplite', 'Ephor'].map(n => `${n} (spartans)`)

const chips0Kind = (el: HTMLElement) => within(el).getAllByTestId('pending-verify-chip')[0]?.getAttribute('data-kind')

describe('PathSpeedTsCalculatorPage unverified-units-note (P0-15)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('zh-TW')
  })

  it('shows ONE line: grey 待驗證 chip + 有兵種速度待驗證，未列入反推', async () => {
    mockedApi.calculatePathSpeedTs.mockResolvedValueOnce({
      distance: 6,
      possible_matches: [{
        unit_speed: 6,
        possible_units: ['Mercenary (huns)'],
        tournament_square_level: 0,
        calculated_travel_time_seconds: 3600,
        calculated_travel_time_formatted: '1:00:00',
      }],
      unverified_units: UNVERIFIED,
    })
    render(<PathSpeedTsCalculatorPage />)
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))

    const notes = await screen.findAllByTestId('unverified-units-note')
    expect(notes).toHaveLength(1)
    const note = notes[0]
    expect(note).toHaveTextContent('有兵種速度待驗證，未列入反推')
    expect(chips0Kind(note)).toBe('reverseTsUnverified')
    expect(note.className).toContain('text-xs')
    const chips = within(note).getAllByTestId('pending-verify-chip')
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveTextContent('待驗證')
    expect(chips[0].className).toContain('bg-gray-100')
    // 不再逐一列出兵種名
    expect(note).not.toHaveTextContent('Hoplite')
  })

  it('no note when the backend reports no unverified units', async () => {
    mockedApi.calculatePathSpeedTs.mockResolvedValueOnce({ distance: 6, possible_matches: [], unverified_units: [] })
    render(<PathSpeedTsCalculatorPage />)
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))
    expect(await screen.findByText(/無匹配結果/)).toBeInTheDocument()
    expect(screen.queryByTestId('unverified-units-note')).toBeNull()
  })
})
