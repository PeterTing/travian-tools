import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CropScouterPage from '../CropScouterPage'
import AttackPlannerPage from '../AttackPlannerPage'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'

vi.mock('@/services/advancedCalculatorApi', () => ({
  advancedCalculatorApi: {
    calculateCropScouter: vi.fn(),
    calculateTsOptimizer: vi.fn(),
    calculateFakeTroops: vi.fn(),
  },
}))

const mockedApi = vi.mocked(advancedCalculatorApi)

describe('CropScouterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('detects 15c from heavy crop production', async () => {
    mockedApi.calculateCropScouter.mockResolvedValueOnce({
      matches: [
        {
          cropper_type: '15c',
          likelihood: 0.95,
          reasoning: 'Crop production is 9× average',
        },
      ],
      dominant_resource: 'crop',
      wood_to_crop_ratio: 0.111,
    })

    render(<CropScouterPage />)
    fireEvent.change(screen.getByTestId('wood'), { target: { value: '1000' } })
    fireEvent.change(screen.getByTestId('clay'), { target: { value: '1000' } })
    fireEvent.change(screen.getByTestId('iron'), { target: { value: '1000' } })
    fireEvent.change(screen.getByTestId('crop'), { target: { value: '9000' } })
    fireEvent.change(screen.getByTestId('population'), { target: { value: '600' } })
    fireEvent.click(screen.getByTestId('submit'))

    await waitFor(() => expect(screen.getByTestId('result')).toBeInTheDocument())
    expect(screen.getByTestId('result').textContent).toContain('15c')
    expect(screen.getByTestId('result').textContent).toContain('crop')
  })
})

describe('AttackPlannerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to TS optimizer tab', () => {
    render(<AttackPlannerPage />)
    // TS optimizer form present
    expect(screen.getByTestId('ts-submit')).toBeInTheDocument()
  })

  it('switches to fake troops tab', async () => {
    render(<AttackPlannerPage />)
    fireEvent.click(screen.getByTestId('mode-fake'))
    await waitFor(() =>
      expect(screen.getByTestId('fake-submit')).toBeInTheDocument(),
    )
  })

  it('fake troops calls API with tribe', async () => {
    mockedApi.calculateFakeTroops.mockResolvedValueOnce({
      min_infantry: 25,
      min_cavalry: 5,
      min_catapults: 10,
      min_rams: 5,
      total_population_cost: 115,
      reasoning: 'Target 500 / romans',
    })

    render(<AttackPlannerPage />)
    fireEvent.click(screen.getByTestId('mode-fake'))
    await waitFor(() =>
      expect(screen.getByTestId('fake-submit')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByTestId('fake-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('fake-result')).toBeInTheDocument(),
    )
    expect(mockedApi.calculateFakeTroops).toHaveBeenCalledWith(
      expect.objectContaining({
        attacker_tribe: 'romans',
      }),
    )
  })
})
