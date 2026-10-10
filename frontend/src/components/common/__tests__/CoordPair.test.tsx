import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import CoordPair from '../CoordPair'
import { EMPTY_COORD, type CoordText } from '@/lib/coords'

// ts11 複製原文：review/realtest/clip/03-153811.txt 第 44 行
const TS11_COPIED = '\u202d(\u202d33\u202c|\u202d\u2212\u202d4\u202c\u202c)\u202c'

function Harness({ initial = EMPTY_COORD, required, showErrors, radius }: { initial?: CoordText; required?: boolean; showErrors?: boolean; radius?: number }) {
  const [v, setV] = useState(initial)
  return (
    <>
      <CoordPair value={v} onChange={setV} testId="c" required={required} showErrors={showErrors} radius={radius} />
      <output data-testid="state">{JSON.stringify(v)}</output>
    </>
  )
}

const x = () => screen.getByTestId('c-x') as HTMLInputElement
const y = () => screen.getByTestId('c-y') as HTMLInputElement

describe('CoordPair', () => {
  it('defaults to empty (no 0), placeholder X / Y, full keyboard text input, 16px / 44px', () => {
    render(<Harness />)
    expect(x().value).toBe('')
    expect(y().value).toBe('')
    expect(x().placeholder).toBe('X')
    expect(y().placeholder).toBe('Y')
    for (const el of [x(), y()]) {
      expect(el.type).toBe('text')
      expect(el.inputMode).toBe('text')
      expect(el).toHaveClass('h-11', 'text-base')
    }
    // 還沒碰過不標紅
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('"-" is typable and -4 is accepted', () => {
    render(<Harness />)
    fireEvent.change(x(), { target: { value: '-' } })
    expect(x().value).toBe('-')
    // 正在打負號：還不標紅
    expect(screen.queryByTestId('c-x-error')).toBeNull()
    fireEvent.change(x(), { target: { value: '-4' } })
    expect(x().value).toBe('-4')
    expect(screen.queryByTestId('c-x-error')).toBeNull()
  })

  it('typing U+2212 / bidi characters is cleaned up', () => {
    render(<Harness />)
    fireEvent.change(y(), { target: { value: '\u202d\u2212\u202d4\u202c' } })
    expect(y().value).toBe('-4')
  })

  it('empty: red error under the field after leaving it (12px red, red border); never filled with 0', () => {
    render(<Harness />)
    fireEvent.blur(x())
    const err = screen.getByTestId('c-x-error')
    expect(err).toHaveTextContent('請輸入 \u2212200–200 的整數')
    expect(err).toHaveClass('text-xs', 'text-red-600')
    expect(x()).toHaveClass('border-red-600')
    expect(x()).toHaveAttribute('aria-invalid', 'true')
    expect(x().value).toBe('')
  })

  it('showErrors (after pressing calculate) marks untouched empty fields', () => {
    render(<Harness showErrors />)
    expect(screen.getByTestId('c-x-error')).toBeInTheDocument()
    expect(screen.getByTestId('c-y-error')).toBeInTheDocument()
  })

  it('range bounds: -200 and 200 OK, -201 / 201 red; radius from the world', () => {
    render(<Harness />)
    fireEvent.change(x(), { target: { value: '-200' } })
    fireEvent.change(y(), { target: { value: '200' } })
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(x(), { target: { value: '-201' } })
    fireEvent.change(y(), { target: { value: '201' } })
    expect(screen.getByTestId('c-x-error')).toBeInTheDocument()
    expect(screen.getByTestId('c-y-error')).toBeInTheDocument()
  })

  it('custom radius (world map size) changes the bounds and message', () => {
    render(<Harness radius={400} />)
    fireEvent.change(x(), { target: { value: '-350' } })
    expect(screen.queryByTestId('c-x-error')).toBeNull()
    fireEvent.change(x(), { target: { value: '401' } })
    expect(screen.getByTestId('c-x-error')).toHaveTextContent('請輸入 \u2212400–400 的整數')
  })

  it('non-numeric is red', () => {
    render(<Harness />)
    fireEvent.change(x(), { target: { value: 'abc' } })
    expect(screen.getByTestId('c-x-error')).toBeInTheDocument()
  })

  it('pasting "(33|-4)" into X splits into X and Y', () => {
    render(<Harness />)
    fireEvent.paste(x(), { clipboardData: { getData: () => '(33|-4)' } })
    expect(x().value).toBe('33')
    expect(y().value).toBe('-4')
  })

  it('pasting the real ts11 copied string (bidi + U+2212) splits too, replacing what was there', () => {
    render(<Harness initial={{ x: '7', y: '' }} />)
    fireEvent.paste(x(), { clipboardData: { getData: () => TS11_COPIED } })
    expect(x().value).toBe('33')
    expect(y().value).toBe('-4')
    expect(screen.getByTestId('state')).toHaveTextContent('{"x":"33","y":"-4"}')
  })

  it('"33 | -4" arriving through change (e.g. autofill) also splits', () => {
    render(<Harness />)
    fireEvent.change(x(), { target: { value: '33 | -4' } })
    expect(x().value).toBe('33')
    expect(y().value).toBe('-4')
  })

  it('pasting a single number is left to the browser (no split)', () => {
    render(<Harness />)
    fireEvent.paste(x(), { clipboardData: { getData: () => '-4' } })
    expect(y().value).toBe('')
  })

  it('required=false: both empty is fine; only one filled is an error', () => {
    render(<Harness required={false} showErrors />)
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(x(), { target: { value: '5' } })
    expect(screen.getByTestId('c-y-error')).toBeInTheDocument()
  })
})
