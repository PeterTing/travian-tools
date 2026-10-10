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
    expect(screen.getByTestId('building-verify-legend')).toHaveTextContent('除標 ✓ 的建築外，數值皆未核對')
  })

  it('ts11-measured buildings get ✓, others get ONE 待驗證 chip by the name', async () => {
    render(<BuildingsPage />)
    const mb = (await screen.findByText('村莊大樓')).closest('p')!
    const st = screen.getByText('馬廄').closest('p')!
    expect(within(mb).getByTestId('verified-mark')).toBeInTheDocument()
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
    expect(screen.getByTestId('pending-note-what')).toHaveTextContent('花費、時間、人口、文化點已核對。')
    expect(screen.getByTestId('pending-note-source')).toHaveTextContent(/建造時間取自 ts11 遊戲內說明（官方知識庫 1 級的時間跟遊戲內不同）/)
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

