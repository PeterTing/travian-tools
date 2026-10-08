import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import { OCR_PROGRESS_CAP, ocrProgress } from '@/lib/ocrProgress'
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
    expect(
      screen.getByText('伺服器閒置後的第一張可能要等 15 秒左右，之後會快很多。'),
    ).toBeInTheDocument()
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

  it('progress keeps moving but stays below full while waiting (cold start ~13 s)', () => {
    vi.useFakeTimers()
    render(<OcrRecognizing previews={['blob:1']} startedAt={Date.now()} onCancel={() => {}} />)
    const read = () => Number(screen.getByTestId('ocr-progress').getAttribute('aria-valuenow'))
    const seen: number[] = [read()]
    for (const ms of [5000, 5000, 3000, 7000, 40000]) {
      act(() => {
        vi.advanceTimersByTime(ms)
      })
      seen.push(read())
    }
    // 0／5／10／13／20／60 秒
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1])
    expect(seen[1]).toBeLessThan(70) // 5 秒時不再接近滿格
    expect(seen[2]).toBeGreaterThan(seen[1])
    expect(seen[2]).toBeLessThan(OCR_PROGRESS_CAP) // 10 秒還在動
    expect(Math.max(...seen)).toBeLessThanOrEqual(OCR_PROGRESS_CAP)
    expect(screen.getByTestId('ocr-progress').style.width).not.toBe('100%')
  })

  it('ocrProgress eases toward the 90% cap and never reaches 100%', () => {
    expect(ocrProgress(0)).toBe(5)
    expect(ocrProgress(-100)).toBe(5)
    expect(ocrProgress(5000)).toBe(59)
    expect(ocrProgress(10_000)).toBe(78)
    expect(ocrProgress(13_000)).toBe(84)
    expect(ocrProgress(15_000)).toBe(86)
    expect(ocrProgress(60_000)).toBe(OCR_PROGRESS_CAP)
    expect(ocrProgress(10 * 60_000)).toBe(OCR_PROGRESS_CAP)
  })
})
