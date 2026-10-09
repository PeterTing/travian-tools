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

const SPARTANS = [
  'Hoplite', 'Sentinel', 'Shieldsman', 'Twinsteel Therion', 'Elpida Rider',
  'Corinthian Crusher', 'Ram', 'Ballista', 'Ephor', 'Settler',
].map(n => `${n} (spartans)`)

describe('PathSpeedTsCalculatorPage unverified-units-note (P0-15)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('zh-TW')
  })

  it('shows ONE line: grey 待驗證 chip + 斯巴達兵種速度待驗證，未列入反推', async () => {
    mockedApi.calculatePathSpeedTs.mockResolvedValueOnce({
      distance: 6,
      possible_matches: [{
        unit_speed: 6,
        possible_units: ['Mercenary (huns)'],
        tournament_square_level: 0,
        calculated_travel_time_seconds: 3600,
        calculated_travel_time_formatted: '1:00:00',
      }],
      unverified_units: SPARTANS,
    })
    render(<PathSpeedTsCalculatorPage />)
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))

    const notes = await screen.findAllByTestId('unverified-units-note')
    expect(notes).toHaveLength(1)
    const note = notes[0]
    expect(note).toHaveTextContent('斯巴達兵種速度待驗證，未列入反推')
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
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))
    expect(await screen.findByText(/無匹配結果/)).toBeInTheDocument()
    expect(screen.queryByTestId('unverified-units-note')).toBeNull()
  })
})
