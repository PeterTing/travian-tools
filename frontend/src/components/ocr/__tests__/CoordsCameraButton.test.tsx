import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@/i18n/i18n'

vi.mock('@/services/ocrApi', () => ({ ocrApi: { recognizeCoords: vi.fn() } }))
import { CoordsCameraButton } from '@/components/ocr/CoordsCameraButton'

describe('CoordsCameraButton 測試版標籤', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('入口（beta）旁顯示「測試版」', () => {
    render(<CoordsCameraButton beta onPick={() => {}} />)
    expect(screen.getByTestId('coords-camera-btn')).toBeInTheDocument()
    expect(screen.getByTestId('ocr-beta-tag')).toHaveTextContent('測試版')
  })

  it('辨識結果裡的按鈕不重複標', () => {
    render(<CoordsCameraButton onPick={() => {}} />)
    expect(screen.queryByTestId('ocr-beta-tag')).toBeNull()
  })
})
