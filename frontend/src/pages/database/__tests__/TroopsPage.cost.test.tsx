import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import TroopsPage from '../TroopsPage'

type Row = { troop_id: string; name_zh: string; name_en: string; tribe: string; speed: number | null; speed_source: string; speed_ref: string | null }

const rows: Row[] = [
  { troop_id: 'legionnaire', name_zh: '古羅馬步兵', name_en: 'Legionnaire', tribe: 'romans', speed: 6, speed_source: 'ts11', speed_ref: 'manual/troop/1' },
  { troop_id: 'hoplite', name_zh: '重裝步兵', name_en: 'Hoplite', tribe: 'spartans', speed: 6, speed_source: 'official_pending', speed_ref: 'https://support.travian.com/en/articles/187' },
  { troop_id: 'berserker', name_zh: '狂戰士', name_en: 'Berserker', tribe: 'vikings', speed: 5, speed_source: 'ts11', speed_ref: 'manual/troop/63' },
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


describe('TroopsPage: one 「待驗證」 chip for unit costs / upkeep / training time (P0-17)', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it.each([['重裝步兵（Hoplite）']])('%s: exactly one units chip, next to the 「訓練成本」 heading (Spartans: no first-hand source)', async (name) => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText(name))
    const heading = await screen.findByTestId('troop-cost-heading')
    expect(heading.tagName).toBe('H3')
    expect(heading).toHaveTextContent('訓練成本')
    expect(within(heading).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    // 只有一個：訓練成本表、基本資訊（糧耗）裡沒有每列的灰標
    const section = screen.getByTestId('troop-cost-section')
    expect(within(section).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    expect(within(section).getByRole('table').querySelector('[data-testid="pending-verify-chip"]')).toBeNull()
  })

  it.each([
    ['古羅馬步兵', 'Roman costs read from the ts11 in-game help, P0-18'],
    ['狂戰士（Berserker）', 'Viking costs / upkeep / training time from official S139, P0-23'],
  ])('%s: no units chip (%s)', async (name) => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText(name))
    const section = await screen.findByTestId('troop-cost-section')
    expect(within(section).getByRole('heading', { name: '訓練成本' })).toBeInTheDocument()
    expect(screen.queryByTestId('troop-cost-heading')).toBeNull()
    expect(within(section).queryByTestId('pending-verify-chip')).toBeNull()
  })

  it('tap: the units copy opens below the heading and fills the whole section', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('重裝步兵（Hoplite）'))
    const heading = await screen.findByTestId('troop-cost-heading')
    fireEvent.click(within(heading).getByTestId('pending-verify-chip'))
    const panel = screen.getByTestId('pending-note-panel')
    expect(heading.nextElementSibling).toBe(panel)
    expect(panel).toHaveClass('w-full')
    expect(screen.getByTestId('pending-note-what')).toHaveTextContent('兵種花費、糧耗、訓練時間還沒在 ts11 遊戲內核對。')
    expect(screen.getByTestId('pending-note-source')).toHaveTextContent('目前用的是社群整理的數字，可能有誤差。')
  })

  it('基本資訊 shows tribe / type / training building in 繁體中文', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('狂戰士（Berserker）'))
    await screen.findByTestId('troop-cost-section')
    for (const zh of ['維京人', '步兵', '兵營']) expect(screen.getByText(zh, { selector: 'td' })).toBeInTheDocument()
    for (const en of ['vikings', 'infantry', 'barracks']) expect(screen.queryByText(en, { selector: 'td' })).toBeNull()
  })
})
