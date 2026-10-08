import { useTranslation } from 'react-i18next'

/**
 * 截圖辨識入口旁的「測試版」標籤。
 * 拿掉時機見 TICKETS P1-11：第一次有真實來襲截圖、重算讀錯率之後。
 */
export function OcrBetaTag() {
  const { t } = useTranslation()
  return (
    <span
      className="inline-flex h-fit shrink-0 items-center whitespace-nowrap rounded-full border border-sky-300 bg-sky-50 px-1.5 py-px text-[11px] font-medium leading-4 text-sky-800"
      title={t('ocr.beta.hint')}
      data-testid="ocr-beta-tag"
    >
      {t('ocr.beta.label')}
    </span>
  )
}
