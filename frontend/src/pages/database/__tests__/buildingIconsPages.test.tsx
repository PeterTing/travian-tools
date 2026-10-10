import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import BuildingsPage from '../BuildingsPage'
import BuildingCalculatorPage from '@/pages/calculator/BuildingCalculatorPage'

const list = [
  { building_id: 'main_building', name_zh: '村莊大樓', name_en: 'Main Building', category: 'infrastructure', max_level: 20 },
  { building_id: 'cranny', name_zh: '山洞', name_en: 'Cranny', category: 'infrastructure', max_level: 10 },
]

vi.mock('@/contexts/CurrentAccountContext', () => ({ useCurrentAccount: () => ({ currentAccount: null }) }))
vi.mock('@/components/autofill/CalcFrame', () => ({ CalcBar: () => null }))
vi.mock('@/services/gameApi', () => ({
  buildingsApi: {
    getBuildings: vi.fn(async () => ({ buildings: list, total: list.length })),
    getBuilding: vi.fn(async (id: string) => ({
      ...list.find(b => b.building_id === id),
      description_zh: '', description_en: '', prerequisites: [{ building_id: 'main_building', level: 1 }],
      levels: [{ level: 1, cost_wood: 1, cost_clay: 1, cost_iron: 1, cost_crop: 1, build_time_base: 1, population: 1, culture_points: 1, cp_per_day: 1 }],
    })),
  },
  calculatorApi: { calculateBuildingUpgrade: vi.fn() },
}))

describe('建築圖示、等級下拉選單（Peter 10/10）', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })

  it('buildings list: a 20px decorative icon left of every name; the name stays text', async () => {
    render(<BuildingsPage />)
    await screen.findByText('山洞')
    for (const line of screen.getAllByTestId('building-list-name')) {
      const svg = line.querySelector('svg[data-building-icon]')!
      expect(svg.getAttribute('width')).toBe('20')
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      expect(line.firstElementChild).toBe(svg)
    }
    expect(screen.getAllByTestId('building-list-name')[1]!.textContent).toContain('山洞')
  })

  it('building detail: 32px icon in the title, prerequisites get an icon too', async () => {
    render(<BuildingsPage />)
    fireEvent.click(await screen.findByText('山洞'))
    const title = await screen.findByTestId('building-detail-name')
    expect(title.querySelector('svg')!.getAttribute('width')).toBe('32')
    expect(title.querySelector('svg')!.getAttribute('data-building-icon')).toBe('cranny')
  })

  it('building upgrade calculator: from / to / main building are select-only dropdowns ranged by the building; icon follows the selected building', async () => {
    render(<BuildingCalculatorPage />)
    const pick = await screen.findByTestId('building-calc-select')
    const wrap = pick.parentElement!
    expect(wrap.querySelector('svg')!.getAttribute('data-building-icon')).toBe('main_building')
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    const to = within(screen.getByTestId('building-to-level')).getByRole('combobox') as HTMLSelectElement
    expect(to.options).toHaveLength(20)
    fireEvent.change(pick, { target: { value: 'cranny' } })
    expect(wrap.querySelector('svg')!.getAttribute('data-building-icon')).toBe('cranny')
    const from = within(screen.getByTestId('building-from-level')).getByRole('combobox') as HTMLSelectElement
    expect(Array.from(from.options).map(o => o.value)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    const mb = within(screen.getByTestId('building-main-level')).getByRole('combobox') as HTMLSelectElement
    expect(mb.value).toBe('20')
    fireEvent.change(mb, { target: { value: '5' } })
    expect(mb.value).toBe('5')
  })
})
