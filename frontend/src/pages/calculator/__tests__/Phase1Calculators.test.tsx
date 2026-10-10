import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import CropScouterPage from '../CropScouterPage'
import AttackPlannerPage from '../AttackPlannerPage'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'

vi.mock('@/services/advancedCalculatorApi', () => ({
  advancedCalculatorApi: {
    calculateTsOptimizer: vi.fn(),
  },
}))

const mockedApi = vi.mocked(advancedCalculatorApi)

describe('糧田判斷（以前的「首都類型反推」，稽核 2026-10-10）', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })
  const pick = (id: string, n: number) => fireEvent.change(screen.getByTestId(id), { target: { value: String(n) } })

  it('title and intro say 糧田判斷, nothing about scouting', () => {
    render(<CropScouterPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('糧田判斷')
    expect(document.body.textContent).not.toMatch(/偵察|偵查|反推|首都/)
  })

  it.each([
    [[3, 3, 3, 9], '9 糧田', '3-3-3-9'],
    [[4, 4, 4, 6], '6 糧田', '4-4-4-6'],
    [[1, 1, 1, 15], '15 糧田', '1-1-1-15'],
    [[4, 4, 3, 7], '7 糧田', '4-4-3-7'],
  ])('%j → %s', (c, label, layout) => {
    render(<CropScouterPage />)
    ;['wood', 'clay', 'iron', 'crop'].forEach((id, i) => pick(id, c[i]!))
    expect(screen.getByTestId('crop-fields-label')).toHaveTextContent(label)
    expect(screen.getByTestId('result')).toHaveTextContent(layout)
  })

  it('counts must add up to 18 (error below the fields, no result)', () => {
    render(<CropScouterPage />)
    ;['wood', 'clay', 'iron', 'crop'].forEach((id) => pick(id, 3))
    expect(screen.getByTestId('crop-fields-error')).toHaveTextContent('18')
    expect(screen.queryByTestId('crop-fields-label')).toBeNull()
  })

  it('inputs are dropdowns only (no typing)', () => {
    render(<CropScouterPage />)
    for (const id of ['wood', 'clay', 'iron', 'crop']) expect(screen.getByTestId(id).tagName).toBe('SELECT')
  })
})

describe('AttackPlannerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the TS optimizer directly', () => {
    render(<AttackPlannerPage />)
    expect(screen.getByTestId('ts-submit')).toBeInTheDocument()
  })

  it('no longer offers the retired fake-troops calculator', () => {
    render(<AttackPlannerPage />)
    expect(screen.queryByTestId('mode-fake')).not.toBeInTheDocument()
    expect(screen.queryByTestId('fake-submit')).not.toBeInTheDocument()
    expect(screen.queryByText(/佯攻/)).not.toBeInTheDocument()
  })

  const fillCoords = () => {
    fireEvent.change(screen.getByTestId('target-x'), { target: { value: '10' } })
    fireEvent.change(screen.getByTestId('target-y'), { target: { value: '10' } })
    fireEvent.change(screen.getByTestId('attacker-x'), { target: { value: '-40' } })
    fireEvent.change(screen.getByTestId('attacker-y'), { target: { value: '10' } })
  }

  it('unit speed and TS level are dropdowns; unit speed comes from the unit', async () => {
    render(<AttackPlannerPage />)
    const unit = screen.getByTestId('attacker-unit') as HTMLSelectElement
    expect(unit.tagName).toBe('SELECT')
    expect(within(screen.getByTestId('attacker-ts')).getByRole('combobox').tagName).toBe('SELECT')
    // 羅馬（預設部族）帝國騎士 equites_imperatoris 速度 14
    const option = Array.from(unit.options).find((o) => /14 格\/時/.test(o.text))!
    fireEvent.change(unit, { target: { value: option.value } })
    fillCoords()
    mockedApi.calculateTsOptimizer.mockResolvedValue({ target_arrival: '', results: [], warnings: [] })
    fireEvent.click(screen.getByTestId('ts-submit'))
    await waitFor(() => expect(mockedApi.calculateTsOptimizer).toHaveBeenCalled())
    const req = mockedApi.calculateTsOptimizer.mock.calls[0]![0]
    expect(req.attackers[0]!.unit_speed).toBe(14)
    expect(req.wave_spacing_seconds).toBe(1)
    expect(req.attackers[0]).not.toHaveProperty('unit_id')
  })

  it('shows the needed TS level: unchanged, raised, or unreachable', async () => {
    mockedApi.calculateTsOptimizer.mockResolvedValue({
      target_arrival: '2026-10-12T04:00:00Z',
      warnings: [],
      results: [
        { attacker_id: null, village_label: 'A', recommended_ts_level: 12, ts_level_changed: true, send_time: '2026-10-12T00:00:00Z', arrival_time: '2026-10-12T04:00:00Z', wave: 1, travel_time_formatted: '4h 0m 0s', distance: 50 },
      ],
    })
    render(<AttackPlannerPage />)
    fillCoords()
    fireEvent.click(screen.getByTestId('ts-submit'))
    await waitFor(() => expect(screen.getAllByTestId('ts-level')[0]).toHaveTextContent('要升到 12 級'))

    mockedApi.calculateTsOptimizer.mockResolvedValue({
      target_arrival: '2026-10-12T04:00:00Z',
      warnings: ['A：競技場升到 20 級也來不及'],
      results: [
        { attacker_id: null, village_label: 'A', recommended_ts_level: 20, unreachable: true, send_time: '2026-10-11T00:00:00Z', travel_time_formatted: '4h 0m 0s', distance: 50 },
      ],
    })
    fireEvent.click(screen.getByTestId('ts-submit'))
    await waitFor(() => expect(screen.getAllByTestId('ts-level')[0]).toHaveTextContent('20 級也來不及'))
  })
})
