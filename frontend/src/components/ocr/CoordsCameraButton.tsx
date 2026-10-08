import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { OcrRequestError, ocrApi, type OcrCoordCandidate } from '@/services/ocrApi'
import { OcrBetaTag } from './OcrBetaTag'

interface Props {
  onPick: (x: number, y: number) => void
  size?: 'sm' | 'default'
  /** 入口（例如補座標頁）顯示「測試版」；辨識結果裡的按鈕不用重複標 */
  beta?: boolean
}

/** 座標欄位旁的相機按鈕：選一張截圖 → 讀出裡面的座標讓使用者挑（使用者按了才辨識） */
export function CoordsCameraButton({ onPick, size = 'sm', beta = false }: Props) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [candidates, setCandidates] = useState<OcrCoordCandidate[]>([])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError('')
    setCandidates([])
    try {
      const res = await ocrApi.recognizeCoords(file)
      if (res.candidates.length === 1 && res.candidates[0].status === 'ok') {
        onPick(res.candidates[0].x, res.candidates[0].y)
      } else {
        setCandidates(res.candidates)
      }
    } catch (e) {
      const code = e instanceof OcrRequestError ? e.code : ''
      if (code === 'OCR_IMAGE_TOO_LARGE') {
        // 圖片太大／辨識太久：顯示固定建議，不顯示通用錯誤
        setError(`${t('ocr.failed.titles.OCR_IMAGE_TOO_LARGE')}：${t('ocr.failed.bodies.OCR_IMAGE_TOO_LARGE')}`)
      } else if (code === 'OCR_TIMEOUT') {
        setError(t('ocr.camera.timeout'))
      } else {
        setError(e instanceof Error ? e.message : t('ocr.camera.failed'))
      }
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        data-testid="coords-camera-input"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <span className="inline-flex items-center gap-1">
        <Button
          type="button"
          size={size}
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
          aria-label={t('ocr.camera.label')}
          title={t('ocr.camera.label')}
          data-testid="coords-camera-btn"
        >
          {busy ? t('ocr.camera.busy') : '📷'}
        </Button>
        {beta && <OcrBetaTag />}
      </span>
      {candidates.length > 0 && (
        <span className="flex flex-wrap gap-1" data-testid="coords-camera-candidates">
          {candidates.map((c) => (
            <button
              key={`${c.x}|${c.y}`}
              type="button"
              className={`rounded-full border px-2 py-0.5 text-xs ${c.status === 'ok' ? '' : 'border-amber-400 bg-amber-50'}`}
              onClick={() => {
                onPick(c.x, c.y)
                setCandidates([])
              }}
            >
              {c.label}
            </button>
          ))}
        </span>
      )}
      {error && (
        <span className="text-xs text-destructive" data-testid="coords-camera-error">
          {error}
        </span>
      )}
    </span>
  )
}
