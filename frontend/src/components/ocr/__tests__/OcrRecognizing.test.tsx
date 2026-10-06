import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import { OCR_SLOW_AFTER_MS, OcrRecognizing } from '../OcrRecognizing'

describe('OcrRecognizing (②\')', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows progress, then 「比平常久，再等一下」 after 5 s, and cancels', () => {
    vi.useFakeTimers()
    const onCancel = vi.fn()
    render(
      <OcrRecognizing previews={['blob:1', 'blob:2']} startedAt={Date.now()} onCancel={onCancel} />,
    )
    expect(screen.getByTestId('ocr-recognizing-title')).toHaveTextContent('辨識中…約 2–3 秒')
    expect(screen.getAllByTestId('ocr-preview')).toHaveLength(2)
    expect(screen.getByText(/重疊的那幾筆自動去掉/)).toBeInTheDocument()
    expect(screen.getByText(/多等 3–5 秒/)).toBeInTheDocument()
    const start = Number(screen.getByTestId('ocr-progress').getAttribute('aria-valuenow'))

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    const mid = Number(screen.getByTestId('ocr-progress').getAttribute('aria-valuenow'))
    expect(mid).toBeGreaterThan(start)
    expect(screen.getByTestId('ocr-recognizing-title')).toHaveTextContent('辨識中')

    act(() => {
      vi.advanceTimersByTime(OCR_SLOW_AFTER_MS)
    })
    expect(screen.getByTestId('ocr-recognizing-title')).toHaveTextContent('比平常久，再等一下')

    fireEvent.click(screen.getByText('取消'))
    expect(onCancel).toHaveBeenCalled()
  })
})
