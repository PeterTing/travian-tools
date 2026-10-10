import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import TroopsPage from '../TroopsPage'

type Row = { troop_id: string; name_zh: string; name_en: string; tribe: string; speed: number | null; speed_source: string; speed_ref: string | null }

const rows: Row[] = [
  { troop_id: 'legionnaire', name_zh: '古羅馬步兵', name_en: 'Legionnaire', tribe: 'romans', speed: 6, speed_source: 'ts11', speed_ref: 'manual/troop/1' },
  // 斯巴達 2026-10-11 起全部是 asia_x1；official_pending／pending 這兩條路還在（之後新兵種用），這裡用假資料測
  { troop_id: 'hoplite', name_zh: '裝甲步兵', name_en: 'Hoplite', tribe: 'spartans', speed: 6, speed_source: 'official_pending', speed_ref: 'https://support.travian.com/en/articles/187' },
  { troop_id: 'spartan_ram', name_zh: '破城槌', name_en: 'Ram', tribe: 'spartans', speed: null, speed_source: 'pending', speed_ref: null },
  { troop_id: 'shieldsman', name_zh: '盾牌手', name_en: 'Shieldsman', tribe: 'spartans', speed: 8, speed_source: 'asia_x1', speed_ref: 'asia_x1/help/spartans/3' },
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

// official_pending 數字卡片下面的出處：兩行（P0-23 PM）
const SOURCE_LINES = ['這個兵種的速度還沒核對', '出處：官方說明頁 S187，頁面上註明數字取自第三方']

describe('TroopsPage speed 待驗證 chips (P0-15)', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it('list: pending/null speeds get a non-clickable 「待驗證」 label (row is clickable: no nested button, #35), verified speeds none', async () => {
    render(<TroopsPage />)
    const row = (text: string) => screen.getAllByTestId('troop-list-row').find(r => r.textContent!.includes(text))!
    await screen.findByText('裝甲步兵')
    const hop = row('裝甲步兵')
    const ram = row('破城槌')
    const leg = row('古羅馬步兵')
    for (const r of [hop, ram, leg]) {
      expect(r.querySelector('button')).toBeNull()
      expect(within(r).queryByTestId('pending-verify-chip')).toBeNull()
    }
    const hopSpeed = within(hop).getByTestId('troop-list-speed')
    expect(hopSpeed).toHaveTextContent('速度 6')
    expect(within(hopSpeed).getAllByTestId('pending-verify-label')).toHaveLength(1)
    expect(within(ram).getByTestId('troop-list-speed')).toHaveTextContent('速度 —')
    expect(within(within(ram).getByTestId('troop-list-speed')).getAllByTestId('pending-verify-label')).toHaveLength(1)
    // 斯巴達中文名已是遊戲內名稱：只有速度一個；字樣 aria-hidden，整列 aria-label 寫出來
    expect(within(hop).getAllByTestId('pending-verify-label')).toHaveLength(1)
    for (const l of within(hop).getAllByTestId('pending-verify-label')) {
      expect(l).toHaveAttribute('aria-hidden', 'true')
      expect(l.tagName).toBe('SPAN')
    }
    expect(hop).toHaveAttribute('aria-label', '裝甲步兵，速度待驗證')
    const shd = row('盾牌手')
    expect(shd).toHaveAttribute('aria-label', '盾牌手')
    expect(within(shd).queryByTestId('pending-verify-label')).toBeNull()
    expect(leg).toHaveAttribute('aria-label', '古羅馬步兵')
    expect(within(leg).queryByTestId('pending-verify-label')).toBeNull()
  })

  it('detail, official_pending: keeps the number, shows chip and the source line below the stats', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('裝甲步兵'))
    const speed = await screen.findByTestId('troop-speed')
    expect(speed).toHaveTextContent('6')
    expect(within(speed).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    const src = screen.getByTestId('troop-speed-official-pending-source')
    expect(src.innerHTML.split('<br>').map((x) => x.trim())).toEqual(SOURCE_LINES)
    // 卡片裡不再重複「官方說明頁（待驗證）」；出處只寫在卡片下面那行和灰標說明
    expect(screen.queryByTestId('troop-speed-source')).toBeNull()
    expect(screen.queryByText('官方說明頁（待驗證）')).toBeNull()
  })

  it('detail, speed null: shows — with chip and no official source line', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('破城槌'))
    const speed = await screen.findByTestId('troop-speed')
    expect(speed).toHaveTextContent('—')
    expect(within(speed).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    // 卡片裡不再另寫一行「待驗證」（只重複灰標）
    expect(screen.queryByTestId('troop-speed-source')).toBeNull()
    expect(screen.queryByTestId('troop-speed-official-pending-source')).toBeNull()
  })

  it('detail, ts11: plain number, no chip', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('古羅馬步兵'))
    const speed = await screen.findByTestId('troop-speed')
    expect(within(speed).queryByTestId('pending-verify-chip')).toBeNull()
    expect(screen.getByTestId('troop-speed-source')).toHaveTextContent('ts11 遊戲內說明')
    expect(screen.queryByText(SOURCE_LINES[1]!)).toBeNull()
  })

  it('detail, asia_x1 (Spartans, 2026-10-11): plain number, no chip, source 「ASIA x1 遊戲內說明實測」', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('盾牌手'))
    const speed = await screen.findByTestId('troop-speed')
    expect(speed).toHaveTextContent('8')
    expect(within(speed).queryByTestId('pending-verify-chip')).toBeNull()
    expect(screen.getByTestId('troop-speed-source')).toHaveTextContent('ASIA x1 遊戲內說明實測')
    expect(screen.queryByTestId('troop-speed-official-pending-source')).toBeNull()
  })
})
