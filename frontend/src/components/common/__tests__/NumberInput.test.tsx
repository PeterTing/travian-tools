import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import NumberInput from '../NumberInput'
import { formatThousands, parseLooseInteger } from '@/lib/numberInput'

function Harness({ initial = 400 }: { initial?: number }) {
  const [v, setV] = useState(initial)
  return (
    <>
      <label htmlFor="n">量</label>
      <NumberInput id="n" value={v} onChange={setV} />
      <output data-testid="out">{Number.isNaN(v) ? 'NaN' : String(v)}</output>
    </>
  )
}

describe('NumberInput（共用數字欄位：去前導 0、千分位）', () => {
  it('parse / format helpers', () => {
    expect(parseLooseInteger('01000000')).toBe(1000000)
    expect(parseLooseInteger('1,000,000')).toBe(1000000)
    expect(parseLooseInteger('１２３')).toBe(123)
    expect(parseLooseInteger('')).toBeNaN()
    expect(parseLooseInteger('12a')).toBeNaN()
    expect(parseLooseInteger('-5')).toBeNaN()
    expect(formatThousands(1000000)).toBe('1,000,000')
    expect(formatThousands(0)).toBe('0')
    expect(formatThousands(NaN)).toBe('')
  })

  it('打 01000000：打字時照打、值已經是 1000000；離開欄位變 1,000,000', () => {
    render(<Harness />)
    const el = screen.getByLabelText('量') as HTMLInputElement
    expect(el.value).toBe('400')
    fireEvent.focus(el)
    fireEvent.change(el, { target: { value: '01000000' } })
    expect(el.value).toBe('01000000')
    expect(screen.getByTestId('out')).toHaveTextContent('1000000')
    fireEvent.blur(el)
    expect(el.value).toBe('1,000,000')
  })

  it('000 → 0；空白 → 空白（NaN，不補 0）', () => {
    render(<Harness />)
    const el = screen.getByLabelText('量') as HTMLInputElement
    fireEvent.focus(el)
    fireEvent.change(el, { target: { value: '000' } })
    fireEvent.blur(el)
    expect(el.value).toBe('0')
    fireEvent.focus(el)
    fireEvent.change(el, { target: { value: '' } })
    fireEvent.blur(el)
    expect(el.value).toBe('')
    expect(screen.getByTestId('out')).toHaveTextContent('NaN')
  })
})
