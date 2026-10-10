import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from '@/i18n/i18n'

const calcApi = vi.hoisted(() => ({
  calculateCropBalance: vi.fn(),
}))
const buildingsApi = vi.hoisted(() => ({
  getBuildings: vi.fn().mockResolvedValue({ buildings: [] }),
}))
const troopsApi = vi.hoisted(() => ({
  getTroops: vi.fn().mockResolvedValue({ troops: [] }),
}))
vi.mock('@/services/gameApi', () => ({
  calculatorApi: calcApi,
  buildingsApi,
  troopsApi,
}))
vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({ currentAccount: { server_speed: 1 } }),
}))

const npcApi = vi.hoisted(() => ({
  calculateNpc: vi.fn(),
}))
vi.mock('@/services/advancedCalculatorApi', () => ({
  advancedCalculatorApi: npcApi,
}))

import CropBalancePage from '../CropBalancePage'
import NpcCalculatorPage from '../NpcCalculatorPage'

describe('CropBalancePage follow-ups', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    calcApi.calculateCropBalance.mockReset()
    buildingsApi.getBuildings.mockResolvedValue({ buildings: [] })
    troopsApi.getTroops.mockResolvedValue({ troops: [] })
  })

  it('shows server_speed hint and separate hero production/consumption lines', async () => {
    calcApi.calculateCropBalance.mockResolvedValueOnce({
      population_consumption: 8,
      troop_consumption: 6,
      hero_consumption: 6,
      total_consumption: 14,
      crop_production: 98,
      hero_production: 42,
      balance: 84,
      status: 'surplus',
      warning_message: null,
      suggestions: [],
      server_speed: 1,
    })

    render(<CropBalancePage />)
    expect(await screen.findByTestId('crop-server-speed-hint')).toBeInTheDocument()
    // 人口預設直接填（稽核 2026-10-10）
    fireEvent.change(screen.getByTestId('crop-population'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: /計算糧食平衡/ }))
    await waitFor(() => expect(screen.getByTestId('hero-production-result')).toBeInTheDocument())
    expect(screen.getByTestId('hero-production-result')).toHaveTextContent('英雄產量')
    expect(screen.getByTestId('hero-production-result')).toHaveTextContent('42')
    expect(screen.getByTestId('hero-consumption-result')).toHaveTextContent('英雄消耗')
    expect(screen.getByTestId('hero-consumption-result')).toHaveTextContent('6')
  })
})

describe('NpcCalculatorPage i18n', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    npcApi.calculateNpc.mockReset()
  })

  it('renders Traditional Chinese strings from i18n (no hard-coded only)', async () => {
    render(<NpcCalculatorPage />)
    expect(screen.getByRole('heading', { name: 'NPC 計算器' })).toBeInTheDocument()
    expect(screen.getByText('將現有資源按指定比例重新分配（模擬 NPC 交易）。')).toBeInTheDocument()
    expect(screen.getByTestId('npc-submit')).toHaveTextContent('計算 NPC 分配')

    await i18n.changeLanguage('en')
    // re-render to pick up language
  })

  it('uses en strings after language switch', async () => {
    await i18n.changeLanguage('en')
    render(<NpcCalculatorPage />)
    expect(screen.getByRole('heading', { name: 'NPC Calculator' })).toBeInTheDocument()
    expect(screen.getByTestId('npc-submit')).toHaveTextContent('Calculate NPC allocation')
  })
})

describe('糧食平衡：直接填人口（稽核 2026-10-10）', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('zh-TW')
  })

  it('population is entered directly by default; empty → error under the field, not sent', async () => {
    render(<CropBalancePage />)
    await screen.findByTestId('crop-population')
    fireEvent.click(screen.getByRole('button', { name: /計算糧食平衡/ }))
    expect(screen.getByTestId('crop-population-error')).toHaveTextContent('請填村莊人口')
    expect(calcApi.calculateCropBalance).not.toHaveBeenCalled()
  })

  it('sends population and no buildings; hero eats 6 by default', async () => {
    calcApi.calculateCropBalance.mockResolvedValueOnce({
      population_consumption: 250, troop_consumption: 6, hero_consumption: 6, total_consumption: 256,
      crop_production: 400, hero_production: 0, balance: 144, status: 'balanced', warning_message: null, suggestions: [], server_speed: 1,
    })
    render(<CropBalancePage />)
    fireEvent.change(await screen.findByTestId('crop-population'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: /計算糧食平衡/ }))
    await waitFor(() => expect(calcApi.calculateCropBalance).toHaveBeenCalled())
    expect(calcApi.calculateCropBalance).toHaveBeenCalledWith(expect.objectContaining({ population: 250, buildings: [], hero_crop_consumption: 6 }))
    expect(await screen.findByTestId('crop-status-note')).toHaveTextContent('本站自訂')
  })

  it('by-buildings mode: level 99 → error under the list, not sent', async () => {
    buildingsApi.getBuildings.mockResolvedValueOnce({ buildings: [{ building_id: 'main_building', name_zh: '村莊大樓' }] })
    render(<CropBalancePage />)
    fireEvent.click(await screen.findByTestId('crop-pop-mode-buildings'))
    const pick = document.querySelector<HTMLSelectElement>('select:not([data-testid])')!
    fireEvent.change(pick, { target: { value: 'main_building' } })
    const level = document.querySelector<HTMLInputElement>('input[type="number"][max="20"]')!
    fireEvent.change(level, { target: { value: '99' } })
    fireEvent.click(screen.getByRole('button', { name: /計算糧食平衡/ }))
    expect(screen.getByTestId('crop-level-error')).toHaveTextContent('1–20')
    expect(calcApi.calculateCropBalance).not.toHaveBeenCalled()
  })
})

describe('NPC：負比例、全 0 擋下（稽核 2026-10-10）', () => {
  beforeEach(async () => {
    npcApi.calculateNpc.mockReset()
    await i18n.changeLanguage('zh-TW')
  })

  it('negative ratio → error under that field, not sent', () => {
    render(<NpcCalculatorPage />)
    fireEvent.change(screen.getByTestId('npc-ratio-iron'), { target: { value: '-1' } })
    fireEvent.click(screen.getByTestId('npc-submit'))
    expect(screen.getByTestId('npc-ratio-iron-error')).toHaveTextContent('比例不能是負數')
    expect(npcApi.calculateNpc).not.toHaveBeenCalled()
  })

  it('all ratios 0 → one error under the ratios, not sent', () => {
    render(<NpcCalculatorPage />)
    for (const k of ['wood', 'clay', 'iron', 'crop']) fireEvent.change(screen.getByTestId(`npc-ratio-${k}`), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('npc-submit'))
    expect(screen.getByTestId('npc-ratios-error')).toHaveTextContent('至少要有一個大於 0')
    expect(npcApi.calculateNpc).not.toHaveBeenCalled()
  })

  it('backend 422 on desired_ratios shows under the ratios', async () => {
    npcApi.calculateNpc.mockRejectedValueOnce({ response: { status: 422, data: { detail: [{ loc: ['body', 'desired_ratios'], msg: 'Value error, 比例不能是負數' }] } } })
    render(<NpcCalculatorPage />)
    fireEvent.click(screen.getByTestId('npc-submit'))
    expect(await screen.findByTestId('npc-ratios-error')).toHaveTextContent('比例不能是負數')
  })

  it('ratios accept a building cost (no max 10)', () => {
    render(<NpcCalculatorPage />)
    expect(screen.getByTestId('npc-ratio-wood')).not.toHaveAttribute('max')
    expect(screen.getByTestId('npc-ratio-hint')).toHaveTextContent('花費')
  })
})
