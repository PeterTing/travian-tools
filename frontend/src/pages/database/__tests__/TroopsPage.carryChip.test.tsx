import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import TroopsPage from '../TroopsPage'

// 運載量留空（null）時：那格「—」（aria-label 未提供）＋緊跟一個「待驗證」，說明畫在那一列下面（留空那條路還在，用 API 回 null 測）。
// 維京 2026-10-11 起：Fandom、Siegewise 兩份一致 → 數字＋「✓ 已核對」，點開兩行（第二行出處）；斯巴達 ASIA x1 遊戲內說明。
const base = { category: 'infantry', attack: 45, defense_infantry: 22, defense_cavalry: 5, crop_consumption: 1, speed: 7, speed_source: 'official', speed_ref: 'S139' }
const rows = [
  { ...base, troop_id: 'thrall', name_zh: '奴僕', name_en: 'Thrall', tribe: 'vikings', carry_capacity: null },
  { ...base, troop_id: 'berserker', name_zh: '狂戰士', name_en: 'Berserker', tribe: 'vikings', carry_capacity: 75 },
  { ...base, troop_id: 'hoplite', name_zh: '裝甲步兵', name_en: 'Hoplite', tribe: 'spartans', speed: 6, speed_source: 'asia_x1', speed_ref: 'asia_x1/help/spartans/1', carry_capacity: 60, carry_source: 'asia_x1' },
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

describe('TroopsPage: carry capacity cell', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it.each([
    ['奴僕（Thrall）', 'vikingCarry', '維京運載量還沒核對，先不顯示', '官方說明頁 S139 沒有運載量'],
  ])('%s with empty (null) carry: shows 「—」 (aria-label 未提供, right-aligned), one %s chip right after; tap shows two lines under the row', async (name, kind, what, source) => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText(name))
    const cell = await screen.findByTestId('troop-carry')
    expect(cell).toHaveClass('text-right')
    const empty = within(cell).getByTestId('troop-carry-empty')
    expect(empty).toHaveTextContent(/^—$/)
    expect(empty).toHaveAttribute('aria-label', '未提供')
    expect(cell.textContent).not.toMatch(/\d/)
    const chips = within(cell).getAllByTestId('pending-verify-chip')
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveAttribute('data-kind', kind)
    expect(empty.nextElementSibling).toBe(chips[0])
    fireEvent.click(chips[0])
    const row = screen.getByTestId('pending-note-row')
    expect(screen.getByTestId('troop-carry-row').nextElementSibling).toBe(row)
    expect(row.querySelector('td')).toHaveAttribute('colspan', '2')
    expect(within(row).getByTestId('pending-note-what')).toHaveTextContent(what)
    expect(within(row).getByTestId('pending-note-source')).toHaveTextContent(source)
  })

  it.each([['古羅馬步兵', '50'], ['裝甲步兵', '60']])('%s (ts11 / ASIA x1): carry number, no carry chip', async (name, carry) => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText(name))
    const cell = await screen.findByTestId('troop-carry')
    expect(cell).toHaveTextContent(carry)
    expect(within(cell).queryByTestId('pending-verify-chip')).toBeNull()
    expect(within(cell).queryByTestId('troop-carry-verified-mark')).toBeNull()
  })

  it('Viking (two matching sources): number, no 待驗證 chip, 「✓ 已核對」 opens two lines with the source', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('狂戰士（Berserker）'))
    const cell = await screen.findByTestId('troop-carry')
    expect(cell).toHaveTextContent(/^75/)
    expect(within(cell).queryByTestId('troop-carry-empty')).toBeNull()
    expect(within(cell).queryByTestId('pending-verify-chip')).toBeNull()
    const mark = within(cell).getByTestId('troop-carry-verified-mark')
    expect(mark).toHaveTextContent(/^✓ 已核對$/)
    expect(mark).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(mark)
    expect(mark).toHaveAttribute('aria-expanded', 'true')
    const row = screen.getByTestId('troop-carry-verified-row')
    expect(screen.getByTestId('troop-carry-row').nextElementSibling).toBe(row)
    expect(row.querySelector('td')).toHaveAttribute('colspan', '2')
    expect(within(row).getByTestId('pending-note-what')).toHaveTextContent('維京運載量已核對（官方未寫運載量）。')
    expect(within(row).getByTestId('pending-note-source')).toHaveTextContent(/^出處：Fandom、Siegewise 兩份來源一致（官方未寫運載量）$/)
    fireEvent.click(mark)
    expect(screen.queryByTestId('troop-carry-verified-row')).toBeNull()
  })
})
