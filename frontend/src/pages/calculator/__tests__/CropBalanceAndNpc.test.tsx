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
