import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import i18n from '@/i18n/i18n'

const recognizeCoords = vi.hoisted(() => vi.fn())
vi.mock('@/services/ocrApi', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/ocrApi')>()
  return { ...mod, ocrApi: { ...mod.ocrApi, recognizeCoords } }
})
import { CoordsCameraButton } from '@/components/ocr/CoordsCameraButton'
import { OcrRequestError } from '@/services/ocrApi'

const shot = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'map.png', { type: 'image/png' })

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

describe('CoordsCameraButton 圖片太大／辨識太久', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('413 顯示固定建議，不顯示後端訊息', async () => {
    recognizeCoords.mockRejectedValueOnce(new OcrRequestError('OCR_IMAGE_TOO_LARGE', 'server text'))
    render(<CoordsCameraButton onPick={() => {}} />)
    fireEvent.change(screen.getByTestId('coords-camera-input'), { target: { files: [shot()] } })
    const err = await screen.findByTestId('coords-camera-error')
    expect(err).toHaveTextContent('圖片太大：請直接用手機截圖，不要放大或拼接')
    expect(err).not.toHaveTextContent('server text')
  })

  it('逾時顯示「辨識太久」', async () => {
    recognizeCoords.mockRejectedValueOnce(new OcrRequestError('OCR_TIMEOUT', 'server text'))
    render(<CoordsCameraButton onPick={() => {}} />)
    fireEvent.change(screen.getByTestId('coords-camera-input'), { target: { files: [shot()] } })
    const err = await screen.findByTestId('coords-camera-error')
    expect(err).toHaveTextContent('辨識太久，請再試一次')
    expect(err).not.toHaveTextContent('server text')
  })
})
