import { beforeAll, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import PendingVerifyChip, { PendingRow } from '../PendingVerifyChip'
import { PendingNoteGroupProvider } from '../PendingNoteGroup'

const page = (children: ReactNode) => render(<PendingNoteGroupProvider>{children}</PendingNoteGroupProvider>)

describe('「待驗證」灰標（P0-17）', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('is a real button with aria-expanded / aria-controls, an ⓘ hint and no title tooltip', () => {
    page(<PendingVerifyChip kind="units" />)
    const chip = screen.getByRole('button', { name: /待驗證/ })
    expect(chip).toBe(screen.getByTestId('pending-verify-chip'))
    expect(chip).toHaveAttribute('type', 'button')
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    expect(chip.getAttribute('aria-controls')).toBeTruthy()
    expect(chip).toHaveTextContent('ⓘ')
    expect(chip).not.toHaveAttribute('title')
    expect(screen.queryByTestId('pending-note-panel')).toBeNull()
  })

  it('tap opens a two-line panel that aria-controls points to; tapping again closes it', () => {
    page(<PendingVerifyChip kind="units" />)
    const chip = screen.getByTestId('pending-verify-chip')
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByTestId('pending-note-panel')
    expect(panel.id).toBe(chip.getAttribute('aria-controls'))
    expect(within(panel).getByTestId('pending-note-what')).toHaveTextContent('兵種花費、糧耗、訓練時間還沒在 ts11 遊戲內核對。')
    expect(within(panel).getByTestId('pending-note-source')).toHaveTextContent('目前用的是社群整理的數字，可能有誤差。')
    // 12px 以上、在版面裡（不是浮動提示）
    expect(panel).toHaveClass('text-xs', 'block')
    expect(panel.className).not.toMatch(/\b(absolute|fixed)\b/)
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('pending-note-panel')).toBeNull()
  })

  it('only one open per page: opening another closes the previous', () => {
    page(
      <>
        <PendingRow data-testid="row-a">
          <PendingVerifyChip kind="units" /> 兵種
        </PendingRow>
        <p>
          建築 <PendingVerifyChip kind="building" />
        </p>
      </>,
    )
    const [a, b] = screen.getAllByTestId('pending-verify-chip')
    fireEvent.click(a!)
    expect(a).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(b!)
    expect(a).toHaveAttribute('aria-expanded', 'false')
    expect(b).toHaveAttribute('aria-expanded', 'true')
    const panels = screen.getAllByTestId('pending-note-panel')
    expect(panels).toHaveLength(1)
    expect(panels[0]).toHaveTextContent('這棟建築的花費和建造時間還沒在 ts11 實際確認。')
  })

  it('in a row, the panel goes below the whole row (after it), not between the chip and the text', () => {
    page(
      <PendingRow data-testid="row">
        <PendingVerifyChip kind="units" />
        <span>後面的字</span>
      </PendingRow>,
    )
    fireEvent.click(screen.getByTestId('pending-verify-chip'))
    const row = screen.getByTestId('row')
    const panel = screen.getByTestId('pending-note-panel')
    expect(row.contains(panel)).toBe(false)
    expect(row.nextElementSibling).toBe(panel)
  })

  it('does not expand on hover or focus, and has no close button / tap outside to close', () => {
    page(
      <>
        <PendingVerifyChip kind="cpThreshold" />
        <p data-testid="outside">外面</p>
      </>,
    )
    const chip = screen.getByTestId('pending-verify-chip')
    fireEvent.mouseEnter(chip)
    fireEvent.mouseOver(chip)
    fireEvent.focus(chip)
    expect(screen.queryByTestId('pending-note-panel')).toBeNull()
    fireEvent.click(chip)
    expect(within(screen.getByTestId('pending-note-panel')).queryByRole('button')).toBeNull()
    fireEvent.click(screen.getByTestId('outside'))
    fireEvent.mouseLeave(chip)
    expect(screen.getByTestId('pending-note-panel')).toBeInTheDocument()
  })

  it('tap target is extended to 44×44 with a transparent ::before; the visual chip is unchanged', () => {
    page(<PendingVerifyChip kind="units" />)
    const chip = screen.getByTestId('pending-verify-chip')
    expect(chip).toHaveClass('relative', 'before:absolute', 'before:h-11', 'before:min-w-[44px]', "before:content-['']")
    expect(chip).toHaveClass('rounded-full', 'bg-gray-100', 'px-2', 'py-0.5', 'text-xs')
  })

  it('a tap inside a clickable list item does not also select that item', () => {
    let selected = 0
    page(
      <div onClick={() => { selected++ }}>
        <PendingVerifyChip kind="building" />
      </div>,
    )
    fireEvent.click(screen.getByTestId('pending-verify-chip'))
    expect(selected).toBe(0)
    expect(screen.getByTestId('pending-note-panel')).toBeInTheDocument()
  })

  it('English copy comes from the same table', async () => {
    await i18n.changeLanguage('en')
    page(<PendingVerifyChip kind="units" />)
    fireEvent.click(screen.getByTestId('pending-verify-chip'))
    expect(screen.getByTestId('pending-note-source')).toHaveTextContent('community-compiled')
    await i18n.changeLanguage('zh-TW')
  })
})
