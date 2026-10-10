import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import TroopsPage from '../TroopsPage'

// 維京運載量（P0-23）：官方說明頁 S139 沒有運載量 → 運載量那格一個「待驗證」，說明畫在那一列下面
const base = { category: 'infantry', attack: 45, defense_infantry: 22, defense_cavalry: 5, crop_consumption: 1, speed: 7, speed_source: 'official', speed_ref: 'S139' }
const rows = [
  { ...base, troop_id: 'thrall', name_zh: '奴僕', name_en: 'Thrall', tribe: 'vikings' },
  { ...base, troop_id: 'legionnaire', name_zh: '古羅馬步兵', name_en: 'Legionnaire', tribe: 'romans', speed_source: 'ts11', speed_ref: 'manual/troop/1' },
]

vi.mock('@/services/gameApi', () => ({
  troopsApi: {
    getTroops: vi.fn(async () => ({ troops: rows, total: rows.length })),
    getTroop: vi.fn(async (_tribe: string, id: string) => ({
      ...rows.find((r) => r.troop_id === id), description_zh: '', description_en: '', carry_capacity: 55, training_building: 'barracks',
      academy_level_required: 1, cost_wood: 1, cost_clay: 1, cost_iron: 1, cost_crop: 1, total_cost: 4,
      attack_per_crop: 1, defense_infantry_per_crop: 1, defense_cavalry_per_crop: 1, attack_per_cost: 1,
    })),
  },
}))

describe('TroopsPage: Viking carry capacity is 待驗證', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it('Viking unit: one vikingCarry chip in the carry cell; tap shows two lines under the row', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('奴僕'))
    const cell = await screen.findByTestId('troop-carry')
    expect(cell).toHaveTextContent('55')
    const chip = within(cell).getByTestId('pending-verify-chip')
    expect(chip).toHaveAttribute('data-kind', 'vikingCarry')
    fireEvent.click(chip)
    const row = screen.getByTestId('pending-note-row')
    expect(screen.getByTestId('troop-carry-row').nextElementSibling).toBe(row)
    expect(row.querySelector('td')).toHaveAttribute('colspan', '2')
    expect(within(row).getByTestId('pending-note-what')).toHaveTextContent('維京運載量還沒核對。')
    expect(within(row).getByTestId('pending-note-source')).toHaveTextContent('官方說明頁 S139 沒有運載量；目前用的是社群整理的數字。')
  })

  it('other tribes: no carry chip', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('古羅馬步兵'))
    const cell = await screen.findByTestId('troop-carry')
    expect(within(cell).queryByTestId('pending-verify-chip')).toBeNull()
  })
})
