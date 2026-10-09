import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import TroopsPage from '../TroopsPage'

// 模擬資料：只有在測試裡把部族設成已核對（真實資料 7 族都是 false）
vi.mock('@/data/unitCostVerified.json', () => ({ default: { tribes: { romans: true } } }))

vi.mock('@/services/gameApi', () => {
  const row = { troop_id: 'legionnaire', name_zh: '古羅馬步兵', name_en: 'Legionnaire', tribe: 'romans', category: 'infantry',
    attack: 1, defense_infantry: 1, defense_cavalry: 1, crop_consumption: 1, speed: 6, speed_source: 'ts11', speed_ref: 'manual/troop/1' }
  return {
    troopsApi: {
      getTroops: vi.fn(async () => ({ troops: [row], total: 1 })),
      getTroop: vi.fn(async () => ({
        ...row, description_zh: '', description_en: '', carry_capacity: 1, training_building: 'barracks',
        academy_level_required: 1, cost_wood: 1, cost_clay: 1, cost_iron: 1, cost_crop: 1, total_cost: 4,
        attack_per_crop: 1, defense_infantry_per_crop: 1, defense_cavalry_per_crop: 1, attack_per_cost: 1,
      })),
    },
  }
})

describe('TroopsPage: a cost-verified tribe has no units chip (mock data only)', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it('flag true → plain 「訓練成本」 heading, no chip', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('古羅馬步兵'))
    expect(await screen.findByText('訓練成本')).toBeInTheDocument()
    expect(screen.queryByTestId('troop-cost-heading')).toBeNull()
    expect(screen.queryAllByTestId('pending-verify-chip')).toHaveLength(0)
  })
})
