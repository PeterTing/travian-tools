import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import InterceptionCalculatorPage from '../InterceptionCalculatorPage'
import AttackPlannerPage from '../AttackPlannerPage'
import PathSpeedTsCalculatorPage from '../PathSpeedTsCalculatorPage'
import SaveTroopsCalculatorPage from '../SaveTroopsCalculatorPage'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import { speedPendingKinds } from '@/lib/pendingNotes'

// 競技場 2026-10-11 核對過（ARENA_SPEED_VERIFIED；靴子仍待驗證）：這裡測「全部待驗證時」灰標放的位置，
// 所以把 speedPendingKinds 換成只選種類的 speedKindsFor（真實資料不放灰標，見 verifiedChips2026-10-11.test.tsx）
vi.mock('@/lib/pendingNotes', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/lib/pendingNotes')>()
  return { ...m, speedPendingKinds: m.speedKindsFor, FIELD_LEVEL_ZERO_VERIFIED: false }
})

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
// 座標預設空白、空白不送出（2026-10-10 座標框修正）：按計算前把每一格座標填上（以前預設 0，這裡填 0 送出的值跟以前一樣）
const fillCoords = () => {
  for (const el of document.querySelectorAll<HTMLInputElement>('input[data-testid$="-x"], input[data-testid$="-y"]')) {
    if (el.value === '') fireEvent.change(el, { target: { value: '0' } })
  }
  // 攔截頁的到達時間預設空白（稽核 2026-10-10：以前預設 12:00:00）
  const arrival = document.querySelector<HTMLInputElement>('[data-testid="intercept-arrival"]')
  if (arrival && arrival.value === '') fireEvent.change(arrival, { target: { value: '12:00:00' } })
}
const chipKinds = (el: HTMLElement) => within(el).queryAllByTestId('pending-verify-chip').map((c) => c.getAttribute('data-kind'))
// 競技場等級是下拉選單（Peter 10/10：等級一律用下拉選單）
const setStepper = (label: string, v: number) => {
  fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value: String(v) } })
}

describe('speedPendingKinds（P0-21：全站共用，同行軍時間頁）', () => {
  it('real module: arena alone is verified (2026-10-11); boots still pending (S71 only, #45 幕僚長)', async () => {
    const real = await vi.importActual<typeof import('@/lib/pendingNotes')>('@/lib/pendingNotes')
    expect(real.ARENA_SPEED_VERIFIED).toBe(true)
    expect(real.BOOTS_SPEED_VERIFIED).toBe(false)
    expect(real.speedPendingKinds(3, 0)).toEqual([])
    expect(real.speedPendingKinds(20, 0)).toEqual([])
    expect(real.speedPendingKinds(0, 0)).toEqual([])
    expect(real.speedPendingKinds(0, 25)).toEqual(['heroBootsSpeed'])
    expect(real.speedPendingKinds(3, 25)).toEqual(['arenaBootsSpeed'])
    expect(real.speedPendingKinds(20, 75)).toEqual(['arenaBootsSpeed'])
    // 改回待驗證時選的種類
    expect(real.speedKindsFor(3, 0)).toEqual(['arenaSpeed'])
    expect(real.speedKindsFor(0, 25)).toEqual(['heroBootsSpeed'])
    expect(real.speedKindsFor(3, 25)).toEqual(['arenaBootsSpeed'])
    expect(real.speedKindsFor(0, 0)).toEqual([])
  })

  it('if flipped back to pending: arena only / boots only / both / none', () => {
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
    render(<MemoryRouter><InterceptionCalculatorPage /></MemoryRouter>)
    setStepper('攻方競技場等級', 5)
    fireEvent.change(screen.getByTestId('attacker-boots'), { target: { value: '25' } })
    fireEvent.change(screen.getByTestId('catcher-boots'), { target: { value: '20' } })
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    const ret = await screen.findByTestId('intercept-return-label')
    expect(api.calculateInterception).toHaveBeenCalledWith(expect.objectContaining({ attacker_ts_level: 5, attacker_hero_bonus: 25, catcher_hero_bonus: 20, catcher_ts_level: 0 }))
    expect(chipKinds(ret)).toEqual(['arenaBootsSpeed'])
    expect(chipKinds(screen.getByTestId('intercept-travel-label'))).toEqual(['heroBootsSpeed'])
    // 發送時間卡：依序列出攻方（回到家時間）、攔截方（行進時間）的種類
    expect(chipKinds(screen.getByTestId('intercept-send-label'))).toEqual(['arenaBootsSpeed heroBootsSpeed'])
    expect(screen.getAllByTestId('pending-verify-chip')).toHaveLength(3)
    // 欄位名稱寫明是哪一方（設計師）
    for (const l of ['攻方英雄靴子速度加成（%）', '攔截方英雄靴子速度加成（%）']) expect(screen.getByText(l)).toBeInTheDocument()
    for (const l of ['攻方競技場等級', '攔截方競技場等級']) expect((screen.getByRole('combobox', { name: l }) as HTMLElement).tagName).toBe('SELECT')
  })

  it('interception: all zero → no chip', async () => {
    api.calculateInterception.mockResolvedValue({
      attacker_return_time: '19:08:34', send_time: '16:38:34', travel_time_formatted: '3h 0m 0s', distance_to_attacker: 30,
    })
    render(<MemoryRouter><InterceptionCalculatorPage /></MemoryRouter>)
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    await screen.findByTestId('intercept-return-label')
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
  })

  it('TS optimizer: boots field per attacker; one chip per result card / row on its title (village), none on the travel row', async () => {
    api.calculateTsOptimizer.mockResolvedValue({
      target_arrival: '2030-01-01T12:00:00+00:00',
      results: [{ attacker_id: 'x', village_label: '攻擊者 1', recommended_ts_level: 0, send_time: '2030-01-01T06:26:40+00:00', travel_time_formatted: '5:33:20', distance: 50 }],
      warnings: [],
    })
    render(<AttackPlannerPage />)
    expect(screen.getAllByText('英雄靴子速度加成（%）').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByTestId('attacker-boots'), { target: { value: '25' } })
    fillCoords()
    fireEvent.click(screen.getByTestId('ts-submit'))
    const title = await screen.findByTestId('ts-card-title')
    expect(api.calculateTsOptimizer).toHaveBeenCalledWith(expect.objectContaining({ attackers: [expect.objectContaining({ hero_bonus: 25, ts_level: 0 })] }))
    expect(title).toHaveTextContent('攻擊者 1')
    expect(chipKinds(title)).toEqual(['heroBootsSpeed'])
    expect(chipKinds(screen.getByTestId('ts-row-title'))).toEqual(['heroBootsSpeed'])
    expect(chipKinds(screen.getByTestId('ts-travel-card'))).toEqual([])
    expect(chipKinds(screen.getByTestId('ts-travel'))).toEqual([])
  })

  it('TS optimizer: two attackers with the same name — each result maps back by attacker_id, not by name (P0-17 i)', async () => {
    api.calculateTsOptimizer.mockImplementation(async (req) => {
      const [a, b] = req.attackers
      // 伺服器回傳的順序和輸入相反，名稱一樣：只能靠 attacker_id 對回去
      return {
        target_arrival: '2030-01-01T12:00:00+00:00',
        results: [
          { attacker_id: b!.attacker_id, village_label: '01', recommended_ts_level: 0, send_time: '2030-01-01T07:00:00+00:00', travel_time_formatted: '5:00:00', distance: 30 },
          { attacker_id: a!.attacker_id, village_label: '01', recommended_ts_level: 0, send_time: '2030-01-01T08:00:00+00:00', travel_time_formatted: '4:00:00', distance: 10 },
        ],
        warnings: [],
      }
    })
    render(<AttackPlannerPage />)
    fireEvent.click(screen.getByRole('button', { name: /加攻擊者/ }))
    const rows = screen.getAllByTestId('attacker-row')
    expect(rows).toHaveLength(2)
    for (const r of rows) fireEvent.change(within(r).getAllByRole('textbox')[0]!, { target: { value: '01' } })
    // 只有第二個攻擊者有靴子
    fireEvent.change(within(rows[1]!).getByTestId('attacker-boots'), { target: { value: '25' } })
    fillCoords()
    fireEvent.click(screen.getByTestId('ts-submit'))
    const titles = await screen.findAllByTestId('ts-card-title')
    const sent = api.calculateTsOptimizer.mock.calls[0]![0].attackers
    expect(sent.map((a) => a.village_label)).toEqual(['01', '01'])
    expect(new Set(sent.map((a) => a.attacker_id)).size).toBe(2)
    // 第一張卡是第二個攻擊者（有靴子）→ 靴子灰標；第二張卡是第一個攻擊者 → 沒有
    expect(chipKinds(titles[0]!)).toEqual(['heroBootsSpeed'])
    expect(chipKinds(titles[1]!)).toEqual([])
    const rowTitles = screen.getAllByTestId('ts-row-title')
    expect(chipKinds(rowTitles[0]!)).toEqual(['heroBootsSpeed'])
    expect(chipKinds(rowTitles[1]!)).toEqual([])
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
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))
    const cells = await screen.findAllByTestId('reverse-travel')
    expect(cells.map(chipKinds)).toEqual([['arenaSpeed'], []])

    fireEvent.change(screen.getByTestId('reverse-boots'), { target: { value: '25' } })
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))
    expect(api.calculatePathSpeedTs).toHaveBeenLastCalledWith(expect.objectContaining({ hero_bonus: 25 }))
    await vi.waitFor(() => expect(screen.getAllByTestId('reverse-travel').map(chipKinds)).toEqual([['arenaBootsSpeed'], ['heroBootsSpeed']]))
    expect(screen.getByText('英雄靴子速度加成（%）')).toBeInTheDocument()
  })

  it('save troops: one chip beside the 「計算結果」 section title, none in the sentence or beside the big distance', async () => {
    api.calculateSaveTroops.mockResolvedValue({ ideal_distance: 38, send_time_formatted: '4h 0m 0s', return_time_formatted: '8h 0m 0s' })
    render(<SaveTroopsCalculatorPage />)
    setStepper('競技場等級', 5)
    fireEvent.change(screen.getByTestId('save-boots'), { target: { value: '25' } })
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '計算' }))
    const line = await screen.findByTestId('save-distance-line')
    expect(api.calculateSaveTroops).toHaveBeenCalledWith(expect.objectContaining({ tournament_square_level: 5, hero_bonus: 25 }))
    expect(chipKinds(line)).toEqual([])
    const title = screen.getByTestId('save-result-title')
    expect(title).toHaveTextContent('計算結果')
    expect(chipKinds(title)).toEqual(['arenaBootsSpeed'])
    expect(screen.getAllByTestId('pending-verify-chip')).toHaveLength(1)
  })
})

describe('新欄位不填：送出的值跟以前一樣（新欄位都是 0，後端預設也是 0；PM）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('interception', async () => {
    api.calculateInterception.mockResolvedValue({ attacker_return_time: '0', send_time: '0', travel_time_formatted: '0', distance_to_attacker: 0 })
    render(<MemoryRouter><InterceptionCalculatorPage /></MemoryRouter>)
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    await screen.findByTestId('intercept-return-label')
    expect(api.calculateInterception).toHaveBeenCalledWith(expect.objectContaining({ attacker_ts_level: 0, attacker_hero_bonus: 0, catcher_hero_bonus: 0, catcher_ts_level: 0 }))
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
  })

  it('TS optimizer', async () => {
    api.calculateTsOptimizer.mockResolvedValue({ target_arrival: '', results: [], warnings: [] })
    render(<AttackPlannerPage />)
    fillCoords()
    fireEvent.click(screen.getByTestId('ts-submit'))
    await screen.findByTestId('ts-result')
    expect(api.calculateTsOptimizer).toHaveBeenCalledWith(expect.objectContaining({ attackers: [expect.objectContaining({ hero_bonus: 0, ts_level: 0 })] }))
  })

  it('reverse TS', async () => {
    api.calculatePathSpeedTs.mockResolvedValue({ distance: 0, possible_matches: [], unverified_units: [] })
    render(<PathSpeedTsCalculatorPage />)
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))
    await screen.findByText(/沒有對得上的兵種/)
    expect(api.calculatePathSpeedTs).toHaveBeenCalledWith(expect.objectContaining({ hero_bonus: 0 }))
  })

  it('save troops', async () => {
    api.calculateSaveTroops.mockResolvedValue({ ideal_distance: 28, send_time_formatted: '4h 0m 0s', return_time_formatted: '8h 0m 0s' })
    render(<SaveTroopsCalculatorPage />)
    fillCoords()
    fireEvent.click(screen.getByRole('button', { name: '計算' }))
    await screen.findByTestId('save-distance-line')
    expect(api.calculateSaveTroops).toHaveBeenCalledWith(expect.objectContaining({ tournament_square_level: 0, hero_bonus: 0 }))
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
  })
})
