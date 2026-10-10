import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import TroopsPage from '../TroopsPage'

// 斯巴達、維京運載量（P0-23）：官方說明頁都沒有運載量 → 運載量那格一個「待驗證」，說明畫在那一列下面
const base = { category: 'infantry', attack: 45, defense_infantry: 22, defense_cavalry: 5, crop_consumption: 1, speed: 7, speed_source: 'official', speed_ref: 'S139' }
const rows = [
  { ...base, troop_id: 'thrall', name_zh: '奴僕', name_en: 'Thrall', tribe: 'vikings', carry_capacity: 50 },
  { ...base, troop_id: 'hoplite', name_zh: '重裝步兵', name_en: 'Hoplite', tribe: 'spartans', speed_source: 'official_pending', carry_capacity: 60 },
  { ...base, troop_id: 'legionnaire', name_zh: '古羅馬步兵', name_en: 'Legionnaire', tribe: 'romans', speed_source: 'ts11', speed_ref: 'manual/troop/1', carry_capacity: 50 },
]

vi.mock('@/services/gameApi', () => ({
  troopsApi: {
    getTroops: vi.fn(async () => ({ troops: rows, total: rows.length })),
    getTroop: vi.fn(async (_tribe: string, id: string) => ({
      ...rows.find((r) => r.troop_id === id), description_zh: '', description_en: '', training_building: 'barracks',
      academy_level_required: 1, cost_wood: 1, cost_clay: 1, cost_iron: 1, cost_crop: 1, total_cost: 4,
      attack_per_crop: 1, defense_infantry_per_crop: 1, defense_cavalry_per_crop: 1, attack_per_cost: 1,
    })),
  },
}))

describe('TroopsPage: Spartan / Viking carry capacity is 待驗證', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it.each([
    ['奴僕', '50', 'vikingCarry', '維京運載量還沒核對。', '官方說明頁 S139 沒有運載量；目前的數字是照同類兵種推估的，來源還在查。'],
    ['重裝步兵', '60', 'spartanCarry', '斯巴達運載量還沒核對。', '官方說明頁 S10、S187 都沒有運載量；目前用的是社群整理的數字。'],
  ])('%s: one %s chip in the carry cell; tap shows two lines under the row', async (name, carry, kind, what, source) => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText(name))
    const cell = await screen.findByTestId('troop-carry')
    expect(cell).toHaveTextContent(carry)
    const chips = within(cell).getAllByTestId('pending-verify-chip')
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveAttribute('data-kind', kind)
    fireEvent.click(chips[0])
    const row = screen.getByTestId('pending-note-row')
    expect(screen.getByTestId('troop-carry-row').nextElementSibling).toBe(row)
    expect(row.querySelector('td')).toHaveAttribute('colspan', '2')
    expect(within(row).getByTestId('pending-note-what')).toHaveTextContent(what)
    expect(within(row).getByTestId('pending-note-source')).toHaveTextContent(source)
  })

  it('ts11 tribes: no carry chip', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('古羅馬步兵'))
    const cell = await screen.findByTestId('troop-carry')
    expect(within(cell).queryByTestId('pending-verify-chip')).toBeNull()
  })
})
