import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CalcResultPanel from './CalcResultPanel'

describe('CalcResultPanel', () => {
  it('keeps details collapsed on phone until expanded', () => {
    // jsdom has no matchMedia by default in some setups — vitest setup may polyfill
    window.matchMedia = ((query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      })) as typeof window.matchMedia

    render(
      <CalcResultPanel lang="zh" primary="6.46 天" secondary="成本 5,425">
        <div data-testid="detail-row">明細列</div>
      </CalcResultPanel>,
    )
    expect(screen.getByTestId('calc-result-primary')).toHaveTextContent('6.46 天')
    expect(screen.getByTestId('calc-result-secondary')).toHaveTextContent('成本 5,425')
    expect(screen.getByTestId('calc-result-details')).not.toBeVisible()
    const btn = screen.getByTestId('calc-result-toggle')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('calc-result-details')).toBeVisible()
  })
})
