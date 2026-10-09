import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import TroopsPage from '../TroopsPage'

type Row = { troop_id: string; name_zh: string; name_en: string; tribe: string; speed: number | null; speed_source: string; speed_ref: string | null }

const rows: Row[] = [
  { troop_id: 'legionnaire', name_zh: '古羅馬步兵', name_en: 'Legionnaire', tribe: 'romans', speed: 6, speed_source: 'ts11', speed_ref: 'manual/troop/1' },
  { troop_id: 'hoplite', name_zh: '重裝步兵', name_en: 'Hoplite', tribe: 'spartans', speed: 6, speed_source: 'official_pending', speed_ref: 'https://support.travian.com/en/articles/187' },
  { troop_id: 'spartan_ram', name_zh: '衝撞車', name_en: 'Ram', tribe: 'spartans', speed: null, speed_source: 'pending', speed_ref: null },
]

const list = rows.map(r => ({
  ...r, category: 'infantry', attack: 1, defense_infantry: 1, defense_cavalry: 1, crop_consumption: 1,
}))

vi.mock('@/services/gameApi', () => ({
  troopsApi: {
    getTroops: vi.fn(async () => ({ troops: list, total: list.length })),
    getTroop: vi.fn(async (_tribe: string, id: string) => ({
      ...list.find(t => t.troop_id === id),
      description_zh: '', description_en: '', carry_capacity: 1, training_building: 'barracks',
      academy_level_required: 1, cost_wood: 1, cost_clay: 1, cost_iron: 1, cost_crop: 1, total_cost: 4,
      attack_per_crop: 1, defense_infantry_per_crop: 1, defense_cavalry_per_crop: 1, attack_per_cost: 1,
    })),
  },
}))

const SOURCE_TEXT = '官方說明頁，數字標示取自第三方計算器'

describe('TroopsPage speed 待驗證 chips (P0-15)', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it('list: pending/null speeds get one chip, verified speeds get none', async () => {
    render(<TroopsPage />)
    const hop = (await screen.findByText('重裝步兵')).closest('div')!
    const ram = screen.getByText('衝撞車').closest('div')!
    const leg = screen.getByText('古羅馬步兵').closest('div')!
    expect(within(hop).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    expect(within(hop).getByTestId('troop-list-speed')).toHaveTextContent('速度 6')
    expect(within(ram).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    expect(within(ram).getByTestId('troop-list-speed')).toHaveTextContent('速度 —')
    expect(within(leg).queryByTestId('pending-verify-chip')).toBeNull()
  })

  it('detail, official_pending: keeps the number, shows chip and the source line below the stats', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('重裝步兵'))
    const speed = await screen.findByTestId('troop-speed')
    expect(speed).toHaveTextContent('6')
    expect(within(speed).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    expect(screen.getByTestId('troop-speed-official-pending-source')).toHaveTextContent(SOURCE_TEXT)
  })

  it('detail, speed null: shows — with chip and no official source line', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('衝撞車'))
    const speed = await screen.findByTestId('troop-speed')
    expect(speed).toHaveTextContent('—')
    expect(within(speed).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    expect(screen.getByTestId('troop-speed-source')).toHaveTextContent('待驗證')
    expect(screen.queryByTestId('troop-speed-official-pending-source')).toBeNull()
  })

  it('detail, ts11: plain number, no chip', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('古羅馬步兵'))
    const speed = await screen.findByTestId('troop-speed')
    expect(within(speed).queryByTestId('pending-verify-chip')).toBeNull()
    expect(screen.queryByText(SOURCE_TEXT)).toBeNull()
  })
})
