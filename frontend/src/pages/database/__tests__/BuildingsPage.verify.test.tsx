import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import BuildingsPage from '../BuildingsPage'

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
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it('shows one grey legend line at the top', async () => {
    render(<BuildingsPage />)
    expect(screen.getByTestId('building-verify-legend')).toHaveTextContent('除標 ✓ 的建築外，數值皆未在 ts11 實測')
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

  it('detail view: one chip next to the name, none inside the level table', async () => {
    render(<BuildingsPage />)
    fireEvent.click(await screen.findByText('馬廄'))
    const name = await screen.findByTestId('building-detail-name')
    expect(within(name).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    const table = screen.getByRole('table')
    expect(within(table).queryByTestId('pending-verify-chip')).toBeNull()
  })
})
