import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/** 進度條最多跑 5 秒；超過就改說「比平常久，再等一下」（設計稿 ②'） */
export const OCR_SLOW_AFTER_MS = 5000

interface Props {
  previews: string[]
  startedAt: number
  onCancel: () => void
}

export function OcrRecognizing({ previews, startedAt, onCancel }: Props) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [])

  const elapsed = Math.max(0, now - startedAt)
  const slow = elapsed >= OCR_SLOW_AFTER_MS
  const pct = slow ? 100 : Math.round(5 + (elapsed / OCR_SLOW_AFTER_MS) * 90)

  return (
    <div className="space-y-3" data-testid="ocr-recognizing" aria-busy="true">
      <div className="flex gap-2">
        {previews.map((src, i) => (
          <div
            key={src}
            className="h-36 flex-1 overflow-hidden rounded-lg border bg-muted"
            data-testid="ocr-preview"
          >
            <img
              src={src}
              alt={t('ocr.recognizing.shotAlt', { n: i + 1 })}
              className="h-full w-full object-cover object-top"
            />
          </div>
        ))}
      </div>
      <div
        className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-950"
        role="status"
      >
        <div className="font-medium" data-testid="ocr-recognizing-title">
          {slow ? t('ocr.recognizing.slow') : t('ocr.recognizing.title')}
        </div>
        {previews.length > 1 && (
          <div className="text-xs text-green-900">{t('ocr.recognizing.merge')}</div>
        )}
        <div className="mt-2 h-1.5 rounded-full bg-green-100">
          <div
            className={`h-1.5 rounded-full bg-green-600 transition-[width] duration-200 ${slow ? 'animate-pulse' : ''}`}
            style={{ width: `${pct}%` }}
            data-testid="ocr-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          />
        </div>
        <div className="mt-1 text-xs text-green-900">{t('ocr.recognizing.coldStart')}</div>
      </div>
      <p className="text-xs text-muted-foreground">{t('ocr.recognizing.clockTip')}</p>
      <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
        {t('ocr.recognizing.cancel')}
      </Button>
    </div>
  )
}
