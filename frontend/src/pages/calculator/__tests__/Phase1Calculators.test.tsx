import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CropScouterPage from '../CropScouterPage'
import AttackPlannerPage from '../AttackPlannerPage'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'

vi.mock('@/services/advancedCalculatorApi', () => ({
  advancedCalculatorApi: {
    calculateCropScouter: vi.fn(),
    calculateTsOptimizer: vi.fn(),
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
})
