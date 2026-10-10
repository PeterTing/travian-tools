import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import BuildingsPage from '../BuildingsPage'
import * as gameData from '@/data/gameData'

const list = [
  { building_id: 'main_building', name_zh: '村莊大樓', name_en: 'Main Building', category: 'infrastructure', max_level: 20 },
  { building_id: 'stable', name_zh: '馬廄', name_en: 'Stable', category: 'military', max_level: 20 },
]

vi.mock('@/services/gameApi', () => ({
  buildingsApi: {
    getBuildings: vi.fn(async () => ({ buildings: list, total: list.length })),
    getBuilding: vi.fn(async (id: string) => ({
      ...list.find(b => b.building_id === id),
      description_zh: '', description_en: '', prerequisites: [],
      levels: [{ level: 1, cost_wood: 1, cost_clay: 1, cost_iron: 1, cost_crop: 1, build_time_base: 1, population: 1, culture_points: 1, cp_per_day: 1 }],
    })),
  },
}))

describe('BuildingsPage ts11 verification marks', () => {
  // P0-23：全部建築都核對過了；這裡模擬「馬廄還沒核對」，確認灰標機制還在
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
    vi.spyOn(gameData, 'isBuildingVerified').mockImplementation((id: string) => id !== 'stable')
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('real data: every building is verified (official knowledge base, P0-23)', () => {
    vi.restoreAllMocks()
    for (const b of list) expect(gameData.isBuildingVerified(b.building_id), b.building_id).toBe(true)
  })

  it('shows one grey legend line at the top', async () => {
    render(<BuildingsPage />)
    expect(screen.getByTestId('building-verify-legend')).toHaveTextContent('除標「✓ 已核對」的建築外，數值皆未核對')
  })

  it('ts11-measured buildings get ✓, others get ONE 待驗證 chip by the name', async () => {
    render(<BuildingsPage />)
    const mb = (await screen.findByText('村莊大樓')).closest('p')!
    const st = screen.getByText('馬廄').closest('p')!
    expect(within(mb).getByTestId('verified-mark')).toBeInTheDocument()
    // 小字「✓ 已核對」，不只一個圖示（P0-23 設計師）
    expect(within(mb).getByTestId('verified-mark')).toHaveTextContent(/^✓ 已核對$/)
    expect(within(mb).getByTestId('verified-mark').className).toContain('text-[12px]')
    expect(within(mb).queryByTestId('pending-verify-chip')).toBeNull()
    expect(within(st).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    expect(within(st).queryByTestId('verified-mark')).toBeNull()
  })

  it('list: every name line is at least 44px and vertically centred (chip hit area stays on its own line), with or without a chip', async () => {
    render(<BuildingsPage />)
    await screen.findByText('馬廄')
    const lines = screen.getAllByTestId('building-list-name')
    expect(lines).toHaveLength(2)
    for (const l of lines) expect(l).toHaveClass('min-h-11', 'flex', 'items-center')
  })

  it('the ✓ mark has no hover-only title', async () => {
    render(<BuildingsPage />)
    expect(await screen.findByTestId('verified-mark')).not.toHaveAttribute('title')
  })

  it('detail view: one chip next to the name, none inside the level table', async () => {
    render(<BuildingsPage />)
    fireEvent.click(await screen.findByText('馬廄'))
    const name = await screen.findByTestId('building-detail-name')
    expect(within(name).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    const table = screen.getByRole('table')
    expect(within(table).queryByTestId('pending-verify-chip')).toBeNull()
  })

  it('tap ✓: two lines, the source named per building (stable: ts11 in-game help + official knowledge base)', async () => {
    render(<BuildingsPage />)
    const mb = (await screen.findByText('村莊大樓')).closest('p')!
    const mark = within(mb).getByTestId('verified-mark')
    expect(mark.tagName).toBe('BUTTON')
    expect(mark).toHaveAttribute('data-source', 'mainTs11')
    fireEvent.click(mark)
    expect(mark).toHaveAttribute('aria-expanded', 'true')
    // 效果也照官方知識庫核對過：第一行加「效果」
    expect(screen.getByTestId('pending-note-what')).toHaveTextContent('花費、時間、人口、CP、效果已核對。')
    // 第二行：知識庫沒錯，時間有乘村莊大樓加速（1 級 10000 = 2000 × 5），這裡列基本時間
    const src = screen.getByTestId('pending-note-source')
    expect(src).toHaveTextContent('1 級取自 ts11 遊戲內說明，2 級以上取自官方知識庫。')
    expect(src).toHaveTextContent('知識庫的時間有乘上村莊大樓加速（村莊大樓 1 級寫 10000 秒＝2000 × 5），這裡列的是沒加速的基本時間。')
    expect(src).not.toHaveTextContent('不同')
    fireEvent.click(mark)
    expect(screen.queryByTestId('pending-note-panel')).toBeNull()
  })
})

describe('BuildingsPage ✓ source notes (real data, P0-23)', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })
  it('every building names its source; only the main building uses ts11 build times', () => {
    expect(gameData.buildingSource('main_building')).toBe('mainTs11')
    expect(gameData.buildingSource('stable')).toBe('ts11L1Kb')
    expect(gameData.buildingSource('heros_mansion')).toBe('ts11L1Kb')
  })
  it('stable ✓ opens 「1 級取自 ts11 遊戲內說明，2 級以上取自官方知識庫。」 and does not select the building', async () => {
    render(<BuildingsPage />)
    const st = (await screen.findByText('馬廄')).closest('p')!
    fireEvent.click(within(st).getByTestId('verified-mark'))
    expect(screen.getByTestId('pending-note-source')).toHaveTextContent('1 級取自 ts11 遊戲內說明，2 級以上取自官方知識庫。')
    expect(screen.queryByTestId('building-detail-name')).toBeNull()
  })
})


describe('BuildingsPage effect column (official knowledge base, P0-23)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
    list.push({ building_id: 'rally_point', name_zh: '集結點', name_en: 'Rally Point', category: 'military', max_level: 20 })
  })
  afterEach(() => {
    list.splice(2)
    vi.restoreAllMocks()
  })

  it('real data: only buildings without a comparable knowledge base effect column are pending', () => {
    for (const id of ['academy', 'blacksmith', 'embassy', 'rally_point', 'treasury']) expect(gameData.isBuildingEffectVerified(id), id).toBe(false)
    for (const id of ['main_building', 'warehouse', 'great_warehouse', 'stonemasons_lodge', 'horse_drinking_trough', 'trade_office', 'woodcutter']) expect(gameData.isBuildingEffectVerified(id), id).toBe(true)
  })

  it('effect not verified: ONE chip by the 效果 heading, note under the header row; verified building: no chip', async () => {
    render(<BuildingsPage />)
    fireEvent.click(await screen.findByText('集結點'))
    const heading = await screen.findByTestId('building-effect-heading')
    const chip = within(heading).getByTestId('pending-verify-chip')
    expect(chip).toHaveAttribute('data-kind', 'buildingEffect')
    expect(screen.getAllByTestId('pending-verify-chip').filter((c) => c.getAttribute('data-kind') === 'buildingEffect')).toHaveLength(1)
    fireEvent.click(chip)
    const row = screen.getByTestId('pending-note-row')
    expect(row.querySelector('td')).toHaveAttribute('colspan', '9')
    expect(within(row).getByTestId('pending-note-what')).toHaveTextContent('這棟建築的效果還沒核對。')
    expect(within(row).getByTestId('pending-note-source')).toHaveTextContent('官方知識庫沒有可以對照的效果數字；目前的文字來源還在查。')
    // ✓ 第一行不寫「效果」
    fireEvent.click(within((screen.getAllByText('集結點')[0]!).closest('p')!).getByTestId('verified-mark'))
    expect(screen.getAllByTestId('pending-note-what').some((w) => w.textContent === '花費、時間、人口、CP已核對。')).toBe(true)
  })

  it('verified effect (main building): no chip by the 效果 heading', async () => {
    render(<BuildingsPage />)
    fireEvent.click(await screen.findByText('村莊大樓'))
    const heading = await screen.findByTestId('building-effect-heading')
    expect(within(heading).queryByTestId('pending-verify-chip')).toBeNull()
  })
})
