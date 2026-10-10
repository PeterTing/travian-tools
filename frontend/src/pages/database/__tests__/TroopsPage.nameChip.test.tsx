import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import TroopsPage from '../TroopsPage'

// 斯巴達、維京的中文名是暫譯（P0-23 後續）：顯示「中文暫譯（官方英文名）」＋一個 unitNameZhPending 灰標；
// 官方說明頁沒寫英文名的（斯巴達破城槌、弩炮、開拓者）只顯示中文＋灰標；ts11 有的族不標
const base = { category: 'infantry', attack: 1, defense_infantry: 1, defense_cavalry: 1, crop_consumption: 1, speed: 7, speed_source: 'ts11', speed_ref: 'x', carry_capacity: 50 }
const rows = [
  { ...base, troop_id: 'thrall', name_zh: '奴僕', name_en: 'Thrall', tribe: 'vikings' },
  { ...base, troop_id: 'hoplite', name_zh: '重裝步兵', name_en: 'Hoplite', tribe: 'spartans' },
  { ...base, troop_id: 'ballista', name_zh: '弩炮', name_en: 'Ballista', tribe: 'spartans', category: 'siege' },
  { ...base, troop_id: 'legionnaire', name_zh: '古羅馬步兵', name_en: 'Legionnaire', tribe: 'romans' },
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

function nameChips(el: HTMLElement) {
  return within(el).queryAllByTestId('pending-verify-chip').filter((c) => c.dataset.kind === 'unitNameZhPending')
}

describe('TroopsPage: Spartan / Viking names are 「中文暫譯（官方英文名）」 + 待驗證', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it.each([['奴僕（Thrall）'], ['重裝步兵（Hoplite）'], ['弩炮']])('list: %s with a non-clickable 「待驗證」 label right after the name (no nested button, #35)', async (text) => {
    render(<TroopsPage />)
    const name = await screen.findByText(text)
    expect(name).toHaveAttribute('data-testid', 'troop-name')
    const row = name.closest('[data-testid="troop-list-row"]') as HTMLElement
    expect(row.querySelector('button')).toBeNull()
    expect(nameChips(row)).toHaveLength(0)
    const label = name.nextElementSibling as HTMLElement
    expect(label).toHaveAttribute('data-testid', 'pending-verify-label')
    expect(label).toHaveAttribute('aria-hidden', 'true')
    expect(row.getAttribute('aria-label')).toContain(`${text}，中文名為暫譯`)
  })

  it('detail heading keeps the clickable chip; tap shows the two lines', async () => {
    render(<TroopsPage />)
    fireEvent.click(await screen.findByText('奴僕（Thrall）'))
    const h2 = await screen.findByRole('heading', { level: 2, name: /奴僕（Thrall）/ })
    const chips = nameChips(h2)
    expect(chips).toHaveLength(1)
    expect(chips[0]!.tagName).toBe('BUTTON')
    fireEvent.click(chips[0]!)
    expect(screen.getByTestId('pending-note-what')).toHaveTextContent('中文名稱是暫譯，還沒核對')
    expect(screen.getByTestId('pending-note-source')).toHaveTextContent('括號裡是官方英文名')
  })

  it('ts11 tribes: in-game name, no name chip', async () => {
    render(<TroopsPage />)
    const name = await screen.findByText('古羅馬步兵')
    expect(nameChips(name.parentElement!)).toHaveLength(0)
    expect(within(name.parentElement!).queryByTestId('pending-verify-label')).toBeNull()
  })

  it('English UI: official English name only, no chip', async () => {
    await i18n.changeLanguage('en')
    render(<TroopsPage />)
    const name = await screen.findByText('Thrall')
    expect(nameChips(name)).toHaveLength(0)
    expect(screen.queryByText('奴僕（Thrall）')).toBeNull()
  })
})
