import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface Props {
  code: string
  message: string
  onRetry: () => void
  onDismiss: () => void
}

/**
 * 辨識失敗：明確說原因與下一步，不會存任何東西（P0-05 規則）
 * 圖片太大、辨識太久這類有固定建議的錯誤用 `ocr.failed.bodies.<code>`，不顯示後端或通用訊息
 */
export function OcrFailed({ code, message, onRetry, onDismiss }: Props) {
  const { t } = useTranslation()
  const title = t(`ocr.failed.titles.${code}`, { defaultValue: t('ocr.failed.title') })
  const body = t(`ocr.failed.bodies.${code}`, { defaultValue: message })
  return (
    <div
      className="space-y-2 rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-950"
      role="alert"
      data-testid="ocr-failed"
      data-code={code}
    >
      <div className="font-medium">{title}</div>
      <p data-testid="ocr-failed-message">{body}</p>
      <p className="text-xs text-red-900">{t('ocr.failed.nothingSaved')}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" size="sm" onClick={onRetry} data-testid="ocr-retry">
          {t('ocr.failed.retry')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
          {t('ocr.failed.usePaste')}
        </Button>
      </div>
    </div>
  )
}
