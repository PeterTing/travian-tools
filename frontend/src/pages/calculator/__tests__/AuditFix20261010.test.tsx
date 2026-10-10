// 稽核 2026-10-10 修正：各頁跟「已帶入」列、欄位錯誤寫在欄位下方、拿掉沒出處的說法
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import type { Village } from '@/types/game'

const fill = vi.hoisted(() => ({ value: null as unknown as AutoFillValue }))
vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  return { ...mod, useAutoFill: () => fill.value }
})
vi.mock('@/services/advancedCalculatorApi', () => ({
  advancedCalculatorApi: {
    calculateInterception: vi.fn(),
    calculatePathSpeedTs: vi.fn(),
    calculateSaveTroops: vi.fn(),
  },
}))
const gameApi = vi.hoisted(() => ({
  calculateBuildingUpgrade: vi.fn(),
  getBuildings: vi.fn(),
}))
vi.mock('@/services/gameApi', () => ({
  calculatorApi: { calculateBuildingUpgrade: gameApi.calculateBuildingUpgrade },
  buildingsApi: { getBuildings: gameApi.getBuildings },
}))

import InterceptionCalculatorPage from '../InterceptionCalculatorPage'
import SaveTroopsCalculatorPage, { OFFLINE_HOUR_OPTIONS } from '../SaveTroopsCalculatorPage'
import PathSpeedTsCalculatorPage from '../PathSpeedTsCalculatorPage'
import BuildingCalculatorPage from '../BuildingCalculatorPage'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'

const api = vi.mocked(advancedCalculatorApi)
const village = { village_id: 'v1', name: '01', coordinate_x: -12, coordinate_y: 34, population: 300 } as unknown as Village
const fillWith = (speed: 1 | 2 | 3 | 5 | 10, v: Village | null = null): AutoFillValue => ({
  account: null, village: v, villages: v ? [v] : [], speed, tribe: 'gauls', accountSpeed: 1, accountTribe: null,
  offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined, selectVillage: () => undefined,
})
const setCoords = (prefix: string, x: string, y: string) => {
  fireEvent.change(screen.getByTestId(`${prefix}-x`), { target: { value: x } })
  fireEvent.change(screen.getByTestId(`${prefix}-y`), { target: { value: y } })
}

beforeAll(async () => {
  await i18n.changeLanguage('zh-TW')
})
beforeEach(() => {
  vi.clearAllMocks()
  fill.value = fillWith(1)
})

describe('攔截計算', () => {
  const page = (url = '/calculator/interception') => render(<MemoryRouter initialEntries={[url]}><InterceptionCalculatorPage /></MemoryRouter>)

  it('uses the top-bar speed and the selected village as the catcher; offers 1/2/3/5/10', () => {
    fill.value = fillWith(5, village)
    page()
    const sel = screen.getByTestId('intercept-server-speed') as HTMLSelectElement
    expect(sel.value).toBe('5')
    expect(Array.from(sel.options).map((o) => o.value)).toEqual(['1', '2', '3', '5', '10'])
    expect((screen.getByTestId('catcher-x') as HTMLInputElement).value).toBe('-12')
    expect((screen.getByTestId('catcher-y') as HTMLInputElement).value).toBe('34')
  })

  it('bad time → error under the field, not sent', () => {
    page()
    setCoords('attacker', '1', '1'); setCoords('defender', '2', '2'); setCoords('catcher', '3', '3')
    fireEvent.change(screen.getByTestId('intercept-arrival'), { target: { value: '25:99' } })
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    expect(screen.getByTestId('intercept-arrival-error')).toHaveTextContent('時:分:秒')
    expect(api.calculateInterception).not.toHaveBeenCalled()
  })

  it('backend 422 on the time shows under the field', async () => {
    api.calculateInterception.mockRejectedValueOnce({ response: { status: 422, data: { detail: [{ loc: ['body', 'attack_arrival_time'], msg: 'Value error, 請輸入 時:分:秒' }] } } })
    page()
    setCoords('attacker', '1', '1'); setCoords('defender', '2', '2'); setCoords('catcher', '3', '3')
    fireEvent.change(screen.getByTestId('intercept-arrival'), { target: { value: '23:00:00' } })
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    expect(await screen.findByTestId('intercept-arrival-error')).toHaveTextContent('請輸入 時:分:秒')
  })

  it('shows 「（明天）」 when the return crosses midnight', async () => {
    api.calculateInterception.mockResolvedValueOnce({
      attacker_return_time: '01:15:00', send_time: '23:15:00', travel_time_formatted: '2h 0m 0s', distance_to_attacker: 20,
      return_day_offset: 1, send_day_offset: 0,
    })
    page('/calculator/interception?arrival=22:00:00&ax=1&ay=2&dx=3&dy=4')
    expect((screen.getByTestId('intercept-arrival') as HTMLInputElement).value).toBe('22:00:00')
    expect((screen.getByTestId('attacker-x') as HTMLInputElement).value).toBe('1')
    setCoords('catcher', '5', '5')
    fireEvent.click(screen.getByRole('button', { name: '計算攔截時間' }))
    expect(await screen.findByTestId('intercept-return-time')).toHaveTextContent('01:15:00（明天）')
    expect(screen.getByTestId('intercept-send-time')).not.toHaveTextContent('明天')
  })

  it('unit speeds come from unit dropdowns (no typing)', () => {
    page()
    expect(screen.getByTestId('attacker-unit-unit').tagName).toBe('SELECT')
    expect(screen.getByTestId('catcher-unit-unit').tagName).toBe('SELECT')
  })
})

describe('躲兵', () => {
  it('no claim about reinforcements / scouts returning by themselves', async () => {
    api.calculateSaveTroops.mockResolvedValueOnce({ ideal_distance: 28, send_time_formatted: '4h 0m 0s', return_time_formatted: '8h 0m 0s' })
    render(<SaveTroopsCalculatorPage />)
    expect(document.body.textContent).not.toMatch(/增援|偵察|自動返回|空地/)
    fireEvent.click(screen.getByRole('button', { name: '計算' }))
    const line = await screen.findByTestId('save-distance-line')
    expect(line).toHaveTextContent('約 28 格')
    expect(document.body.textContent).not.toMatch(/增援|偵察|自動返回|空地/)
  })

  it('offline hours, unit and server speed are dropdowns; speed follows the top bar', async () => {
    fill.value = fillWith(3)
    api.calculateSaveTroops.mockResolvedValueOnce({ ideal_distance: 28, send_time_formatted: '4h 0m 0s', return_time_formatted: '8h 0m 0s' })
    render(<SaveTroopsCalculatorPage />)
    const hours = screen.getByTestId('save-offline-hours') as HTMLSelectElement
    expect(hours.tagName).toBe('SELECT')
    expect(OFFLINE_HOUR_OPTIONS[0]).toBe(0.5)
    expect(OFFLINE_HOUR_OPTIONS[OFFLINE_HOUR_OPTIONS.length - 1]).toBe(48)
    fireEvent.change(hours, { target: { value: '10' } })
    expect(screen.getByTestId('save-unit-unit').tagName).toBe('SELECT')
    expect((screen.getByTestId('save-server-speed') as HTMLSelectElement).value).toBe('3')
    fireEvent.click(screen.getByRole('button', { name: '計算' }))
    await waitFor(() => expect(api.calculateSaveTroops).toHaveBeenCalled())
    const req = api.calculateSaveTroops.mock.calls[0]![0]
    expect(req).toMatchObject({ offline_hours: 10, server_speed: 3 })
    // 高盧（帶入的部族）第一個兵種：方陣兵 7 格/時
    expect(req.unit_speed).toBe(7)
    expect(req).not.toHaveProperty('village_x')
  })

  it('warns when the distance is beyond the map', async () => {
    api.calculateSaveTroops.mockResolvedValueOnce({
      ideal_distance: 500, send_time_formatted: '24h 0m 0s', return_time_formatted: '48h 0m 0s', max_map_distance: 282.8, exceeds_map: true,
    })
    render(<SaveTroopsCalculatorPage />)
    fireEvent.click(screen.getByRole('button', { name: '計算' }))
    expect(await screen.findByTestId('save-exceeds-map')).toHaveTextContent('282.8')
  })
})

describe('反推敵方兵種／競技場', () => {
  it('target defaults to the selected village; speed follows the top bar; artifact + tolerance are sent', async () => {
    fill.value = fillWith(10, village)
    api.calculatePathSpeedTs.mockResolvedValueOnce({ distance: 10, possible_matches: [], unverified_units: [], ts_irrelevant: true })
    render(<PathSpeedTsCalculatorPage />)
    expect((screen.getByTestId('target-x') as HTMLInputElement).value).toBe('-12')
    expect((screen.getByTestId('reverse-server-speed') as HTMLSelectElement).value).toBe('10')
    setCoords('attacker', '0', '0')
    fireEvent.change(screen.getByTestId('reverse-artifact'), { target: { value: 'account_1_5x' } })
    fireEvent.change(screen.getByTestId('reverse-tolerance'), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: '反推速度 + TS' }))
    await waitFor(() => expect(api.calculatePathSpeedTs).toHaveBeenCalled())
    expect(api.calculatePathSpeedTs).toHaveBeenCalledWith(expect.objectContaining({
      server_speed: 10, artifact_bonus: 'account_1_5x', tolerance_seconds: 60, target_x: -12, target_y: 34,
    }))
    expect(await screen.findByText(/±60 秒誤差內沒有對得上的兵種/)).toBeInTheDocument()
  })
})

describe('建築計算', () => {
  beforeEach(() => {
    gameApi.getBuildings.mockResolvedValue({ buildings: [{ building_id: 'main_building', name_zh: '村莊大樓', name_en: 'Main Building', max_level: 20 }] })
  })

  it('speed follows the top bar; backend Chinese error is shown as is', async () => {
    fill.value = fillWith(2)
    gameApi.calculateBuildingUpgrade.mockRejectedValueOnce({ response: { status: 400, data: { detail: '目標等級要比目前等級高' } } })
    render(<BuildingCalculatorPage />)
    await waitFor(() => expect(screen.getByTestId('mb-self-note')).toBeInTheDocument())
    expect((screen.getByTestId('building-server-speed') as HTMLSelectElement).value).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: /計算/ }))
    expect(await screen.findByText('目標等級要比目前等級高')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Failed to/)
  })
})
