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

// 斯巴達數字卡片下面的出處：兩行（P0-23 PM）
const SOURCE_LINES = ['斯巴達的數字還沒核對', '出處：官方說明頁 S187，頁面上註明數字取自第三方']

describe('TroopsPage speed 待驗證 chips (P0-15)', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it('list: pending/null speeds get a non-clickable 「待驗證」 label (row is clickable: no nested button, #35), verified speeds none', async () => {
    render(<TroopsPage />)
    const row = (text: string) => screen.getAllByTestId('troop-list-row').find(r => r.textContent!.includes(text))!
    await screen.findByText('重裝步兵（Hoplite）')
    const hop = row('重裝步兵（Hoplite）')
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
    // 名稱一個（中文暫譯）＋速度一個；字樣 aria-hidden，整列 aria-label 寫出來
    expect(within(hop).getAllByTestId('pending-verify-label')).toHaveLength(2)
    for (const l of within(hop).getAllByTestId('pending-verify-label')) {
      expect(l).toHaveAttribute('aria-hidden', 'true')
      expect(l.tagName).toBe('SPAN')
    }
    expect(hop).toHaveAttribute('aria-label', '重裝步兵（Hoplite），中文名為暫譯，速度待驗證')
    expect(leg).toHaveAttribute('aria-label', '古羅馬步兵')
    expect(within(leg).queryByTestId('pending-verify-label')).toBeNull()
  })

  it('detail, official_pending: keeps the number, shows chip and the source line below the stats', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('重裝步兵（Hoplite）'))
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
})
