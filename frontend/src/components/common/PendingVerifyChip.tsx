import { useTranslation } from 'react-i18next'

interface PendingVerifyChipProps {
  /** 顯示說明句「這個數值還沒在遊戲裡實測確認」 */
  withNote?: boolean
  /** 改寫說明句（例如指出是哪個欄位） */
  note?: string
  className?: string
}

/** 「待驗證」小灰標：還沒在 ts11 實測確認的數值。樣式之後統一。 */
export default function PendingVerifyChip({ withNote = false, note, className = '' }: PendingVerifyChipProps) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 align-middle ${className}`}>
      <span
        data-testid="pending-verify-chip"
        className="inline-block whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
        title={note ?? t('common.pendingVerifyNote')}
      >
        {t('common.pendingVerify')}
      </span>
      {withNote && <span className="text-xs text-gray-500">{note ?? t('common.pendingVerifyNote')}</span>}
    </span>
  )
}
