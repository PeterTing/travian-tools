import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ocrApi, type OcrCoordCandidate } from '@/services/ocrApi'

interface Props {
  onPick: (x: number, y: number) => void
  size?: 'sm' | 'default'
}

/** 座標欄位旁的相機按鈕：選一張截圖 → 讀出裡面的座標讓使用者挑（使用者按了才辨識） */
export function CoordsCameraButton({ onPick, size = 'sm' }: Props) {
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
      setError(e instanceof Error ? e.message : t('ocr.camera.failed'))
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
