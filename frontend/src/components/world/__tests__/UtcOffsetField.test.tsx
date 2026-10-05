import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import { UtcOffsetField } from '../UtcOffsetField'

describe('UtcOffsetField', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('collapses when value is set and expands on 更改', () => {
    const onDraftChange = vi.fn()
    const onEditingChange = vi.fn()
    render(
      <UtcOffsetField
        value={60}
        draft="60"
        onDraftChange={onDraftChange}
        editing={false}
        onEditingChange={onEditingChange}
        testIdPrefix="utc"
      />,
    )
    expect(screen.getByTestId('utc-summary')).toHaveTextContent('伺服器時差 UTC+1')
    fireEvent.click(screen.getByTestId('utc-change'))
    expect(onEditingChange).toHaveBeenCalledWith(true)
  })

  it('shows select when unset', () => {
    render(
      <UtcOffsetField value={null} draft="" onDraftChange={vi.fn()} testIdPrefix="utc" />,
    )
    expect(screen.getByTestId('utc-editor')).toBeInTheDocument()
    expect(screen.getByTestId('utc-select')).toBeInTheDocument()
  })
})

