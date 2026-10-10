import { beforeAll, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import PendingVerifyChip, { PendingRow } from '../PendingVerifyChip'
import { splitClauses } from '@/lib/pendingNotes'
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
    // 收合時說明塊不存在：不能指向不存在的 id
    expect(chip).not.toHaveAttribute('aria-controls')
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
    expect(chip.getAttribute('aria-controls')).toBeTruthy()
    expect(panel.id).toBe(chip.getAttribute('aria-controls'))
    expect(document.getElementById(chip.getAttribute('aria-controls')!)).toBe(panel)
    expect(within(panel).getByTestId('pending-note-what')).toHaveTextContent('兵種花費、糧耗、訓練時間還沒在 ts11 遊戲內核對。')
    expect(within(panel).getByTestId('pending-note-source')).toHaveTextContent('目前用的是社群整理的數字，可能有誤差。')
    // 12px 以上、在版面裡（不是浮動提示）
    expect(panel).toHaveClass('text-xs', 'block')
    expect(panel.className).not.toMatch(/\b(absolute|fixed)\b/)
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    expect(chip).not.toHaveAttribute('aria-controls')
    expect(screen.queryByTestId('pending-note-panel')).toBeNull()
  })

  it('every aria-controls on the page points to an element that exists (rows, tables, standalone)', () => {
    page(
      <>
        <PendingRow><PendingVerifyChip kind="units" /> 一行</PendingRow>
        <table><tbody><PendingRow as="tr" tableColSpan={1}><td><PendingVerifyChip kind="cpThreshold" /></td></PendingRow></tbody></table>
        <PendingVerifyChip kind="building" />
      </>,
    )
    const chips = screen.getAllByTestId('pending-verify-chip')
    const check = () => {
      for (const c of chips) {
        const id = c.getAttribute('aria-controls')
        if (id) expect(document.getElementById(id), id).not.toBeNull()
      }
    }
    check()
    for (const c of chips) { fireEvent.click(c); check() }
  })

  it('splits a line into clauses so it only wraps at commas, semicolons or parentheses', () => {
    expect(splitClauses('斯巴達速度取自官方說明頁（頁面標示數字來自第三方計算器），反推 TS 不會算斯巴達兵種。')).toEqual([
      '斯巴達速度取自官方說明頁', '（頁面標示數字來自第三方計算器），', '反推 TS 不會算斯巴達兵種。',
    ])
    expect(splitClauses('Spartan speeds come from the official help page (which says so); reverse TS leaves them out.')).toEqual([
      'Spartan speeds come from the official help page ', '(which says so); ', 'reverse TS leaves them out.',
    ])
    expect(splitClauses('沒有標點的一句')).toEqual(['沒有標點的一句'])
    page(<PendingVerifyChip kind="autofillUnits" />)
    fireEvent.click(screen.getByTestId('pending-verify-chip'))
    const src = screen.getByTestId('pending-note-source')
    const segs = within(src).getAllByTestId('pending-note-clause')
    expect(segs.map((s) => s.textContent)).toEqual(['維京的數字取自官方說明頁 S139；', 'ts11 沒有維京，', '現在也沒有可以選維京的世界，', '遊戲內還看不到。'])
    for (const seg of segs) expect(seg).toHaveClass('inline-block')
    // 切段不改文字
    expect(src).toHaveTextContent(/^維京的數字取自官方說明頁 S139；ts11 沒有維京，現在也沒有可以選維京的世界，遊戲內還看不到。$/)
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
    expect(panels[0]).toHaveTextContent('建築數值還沒在 ts11 遊戲內核對。')
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

  it('alignment rule: text rows fit to the chip; narrow cells / tables fill the whole card or row', () => {
    const { unmount } = page(
      <PendingRow data-testid="row">
        文字 <PendingVerifyChip kind="units" />
      </PendingRow>,
    )
    fireEvent.click(screen.getByTestId('pending-verify-chip'))
    expect(screen.getByTestId('pending-note-panel')).toHaveClass('w-fit', 'max-w-full')
    unmount()

    const r2 = page(
      <PendingRow fill data-testid="grid">
        <div><PendingVerifyChip kind="unitSpeedOfficialPending" /></div>
      </PendingRow>,
    )
    fireEvent.click(screen.getByTestId('pending-verify-chip'))
    let panel = screen.getByTestId('pending-note-panel')
    expect(panel).toHaveClass('w-full')
    expect(panel).toHaveAttribute('data-fill', 'true')
    expect(panel.style.marginLeft).toBe('')
    r2.unmount()

    page(
      <table><tbody>
        <PendingRow as="tr" tableColSpan={2}><td>#3</td><td>1,000 <PendingVerifyChip kind="cpThreshold" /></td></PendingRow>
      </tbody></table>,
    )
    fireEvent.click(screen.getByTestId('pending-verify-chip'))
    panel = screen.getByTestId('pending-note-panel')
    expect(panel).toHaveClass('w-full')
    expect(panel.closest('td')).toHaveAttribute('colspan', '2')
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
