import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import PendingVerifyChip, { PendingRow } from '../PendingVerifyChip'

// 可以橫向捲動的表格（設計師，P0-23）：說明在那一列下面，sticky left 0、寬度＝捲動容器看得到的寬度
describe('chip note inside a horizontally scrollable table', () => {
  beforeAll(async () => { await i18n.changeLanguage('zh-TW') })

  function renderTable(scrollable: boolean) {
    render(
      <div data-testid="scroller" style={scrollable ? { overflowX: 'auto' } : undefined}>
        <table style={{ width: 577 }}>
          <tbody>
            <PendingRow as="tr" tableColSpan={9}>
              <td>0</td>
              <td>3 <PendingVerifyChip kind="fieldLevelZero" /></td>
            </PendingRow>
          </tbody>
        </table>
      </div>,
    )
    const scroller = screen.getByTestId('scroller')
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 358 })
    fireEvent.click(screen.getByTestId('pending-verify-chip'))
  }

  it('note sits in the next row, sticks to the left edge and is as wide as the visible part', () => {
    renderTable(true)
    const row = screen.getByTestId('pending-note-row')
    expect(row.querySelector('td')).toHaveAttribute('colspan', '9')
    const sticky = screen.getByTestId('pending-note-sticky')
    expect(sticky).toHaveClass('sticky', 'left-0')
    expect(sticky.style.width).toBe('358px')
    expect(sticky.style.maxWidth).toBe('358px')
    expect(sticky).toContainElement(screen.getByTestId('pending-note-panel'))
    expect(screen.getByTestId('pending-note-what')).toHaveTextContent('資源田 0 級的產量待驗證。')
  })

  it('not in a scroll container: no fixed width (fills the cell as before)', () => {
    renderTable(false)
    expect(screen.getByTestId('pending-note-sticky').style.width).toBe('')
  })
})
