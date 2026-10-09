import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import InterceptionCalculatorPage from '../InterceptionCalculatorPage'
import AttackPlannerPage from '../AttackPlannerPage'
import PathSpeedTsCalculatorPage from '../PathSpeedTsCalculatorPage'
import SaveTroopsCalculatorPage from '../SaveTroopsCalculatorPage'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import { speedPendingKinds } from '@/lib/pendingNotes'

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
const chipKinds = (el: HTMLElement) => within(el).queryAllByTestId('pending-verify-chip').map((c) => c.getAttribute('data-kind'))
const setStepper = (label: string, v: number) => {
  const input = within(screen.getByRole('group', { name: label })).getByRole('spinbutton')
  fireEvent.change(input, { target: { value: String(v) } })
}

describe('speedPendingKinds（P0-21：全站共用，同行軍時間頁）', () => {
  it('arena only / boots only / both / none', () => {
    expect(speedPendingKinds(3, 0)).toEqual(['arenaSpeed'])
    expect(speedPendingKinds(0, 25)).toEqual(['heroBootsSpeed'])
    expect(speedPendingKinds(3, 25)).toEqual(['arenaBootsSpeed'])
    expect(speedPendingKinds(0, 0)).toEqual([])
  })
})

describe('行軍速度灰標：攔截、OP 規劃、反推 TS、躲兵（P0-21）', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('zh-TW')
  })

  it('interception: attacker arena/boots → return-time line; catcher → travel-time line; the big send time has none', async () => {
    api.calculateInterception.mockResolvedValue({
      attacker_return_time: '17:00:00', send_time: '14:30:00', travel_time_formatted: '2h 30m 0s', distance_to_attacker: 30,
    })
    render(<InterceptionCalculatorPage />)
    setStepper('攻擊方競技場等級', 5)
    fireEvent.change(screen.getByTestId('attacker-boots'), { target: { value: '25' } })
    fireEvent.change(screen.getByTestId('catcher-boots'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    const ret = await screen.findByTestId('intercept-return-label')
    expect(api.calculateInterception).toHaveBeenCalledWith(expect.objectContaining({ attacker_ts_level: 5, attacker_hero_bonus: 25, catcher_hero_bonus: 20, catcher_ts_level: 0 }))
    expect(chipKinds(ret)).toEqual(['arenaBootsSpeed'])
    expect(chipKinds(screen.getByTestId('intercept-travel-label'))).toEqual(['heroBootsSpeed'])
    expect(screen.getAllByTestId('pending-verify-chip')).toHaveLength(2)
    expect(screen.getByText('攻擊方英雄靴子速度加成（%）')).toBeInTheDocument()
    expect(screen.getByText('攔截者英雄靴子速度加成（%）')).toBeInTheDocument()
  })

  it('interception: all zero → no chip', async () => {
    api.calculateInterception.mockResolvedValue({
      attacker_return_time: '19:08:34', send_time: '16:38:34', travel_time_formatted: '3h 0m 0s', distance_to_attacker: 30,
    })
    render(<InterceptionCalculatorPage />)
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    await screen.findByTestId('intercept-return-label')
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
  })

  it('TS optimizer: boots field per attacker; one chip per result row in the travel-time cell', async () => {
    api.calculateTsOptimizer.mockResolvedValue({
      target_arrival: '2030-01-01T12:00:00+00:00',
      results: [{ village_label: 'Hammer-1', recommended_ts_level: 0, send_time: '2030-01-01T06:26:40+00:00', travel_time_formatted: '5:33:20', distance: 50 }],
      warnings: [],
    })
    render(<AttackPlannerPage />)
    expect(screen.getAllByText('英雄靴子速度加成（%）').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByTestId('attacker-boots'), { target: { value: '25' } })
    fireEvent.click(screen.getByTestId('ts-submit'))
    const cell = await screen.findByTestId('ts-travel')
    expect(chipKinds(screen.getByTestId('ts-travel-card'))).toEqual(['heroBootsSpeed'])
    expect(api.calculateTsOptimizer).toHaveBeenCalledWith(expect.objectContaining({ attackers: [expect.objectContaining({ hero_bonus: 25, ts_level: 0 })] }))
    expect(chipKinds(cell)).toEqual(['heroBootsSpeed'])
  })

  it('reverse TS: boots field is sent; each match row gets the chip for its own arena level (none for TS 0 without boots)', async () => {
    api.calculatePathSpeedTs.mockResolvedValue({
      distance: 50,
      possible_matches: [
        { unit_speed: 7, possible_units: ['Phalanx'], tournament_square_level: 5, calculated_travel_time_seconds: 18000, calculated_travel_time_formatted: '5h 0m 0s' },
        { unit_speed: 10, possible_units: ['Legionnaire'], tournament_square_level: 0, calculated_travel_time_seconds: 18000, calculated_travel_time_formatted: '5h 0m 0s' },
      ],
      unverified_units: [],
    })
    render(<PathSpeedTsCalculatorPage />)
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))
    const cells = await screen.findAllByTestId('reverse-travel')
    expect(cells.map(chipKinds)).toEqual([['arenaSpeed'], []])

    fireEvent.change(screen.getByTestId('reverse-boots'), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))
    expect(api.calculatePathSpeedTs).toHaveBeenLastCalledWith(expect.objectContaining({ hero_bonus: 25 }))
    await vi.waitFor(() => expect(screen.getAllByTestId('reverse-travel').map(chipKinds)).toEqual([['arenaBootsSpeed'], ['heroBootsSpeed']]))
    expect(screen.getByText('英雄靴子速度加成（%）')).toBeInTheDocument()
  })

  it('save troops: chip on the 「找一個距離約 X 格」 line, never beside the big distance', async () => {
    api.calculateSaveTroops.mockResolvedValue({ ideal_distance: 38, send_time_formatted: '4h 0m 0s', return_time_formatted: '8h 0m 0s' })
    render(<SaveTroopsCalculatorPage />)
    setStepper('競技場等級', 5)
    fireEvent.change(screen.getByTestId('save-boots'), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: '計算' }))
    const line = await screen.findByTestId('save-distance-line')
    expect(api.calculateSaveTroops).toHaveBeenCalledWith(expect.objectContaining({ tournament_square_level: 5, hero_bonus: 25 }))
    expect(chipKinds(line)).toEqual(['arenaBootsSpeed'])
    expect(screen.getAllByTestId('pending-verify-chip')).toHaveLength(1)
  })
})
