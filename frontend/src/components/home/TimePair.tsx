import { useTranslation } from 'react-i18next'
import { localZoneLabel, serverAndLocal } from '@/lib/serverTime'

/**
 * 時間以伺服器時間為主，下面一行小字本地時間；跨日加「（明天）」（IA v2.2 定案 5）。
 * 世界還沒有時差（還沒貼過頁面）時只顯示本地時間。
 */
export default function TimePair({
  date,
  utcOffset,
  now,
  inline = false,
  testId,
}: {
  date: Date
  utcOffset: number | null | undefined
  now: Date
  inline?: boolean
  testId?: string
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'zh'
  const time = serverAndLocal(date, utcOffset, now)
  const zone = localZoneLabel(lang)
  const local = (
    <span className="text-xs text-muted-foreground" data-testid={testId ? `${testId}-local` : undefined}>
      {t('time.local')} {time.local}
      {zone && `（${zone}）`}
      {time.localTomorrow && t('time.tomorrow')}
    </span>
  )
  return (
    <span className={inline ? 'inline-flex flex-wrap items-baseline gap-x-2' : 'flex flex-col'} data-testid={testId}>
      {time.server != null && (
        <span className="font-medium tabular-nums" data-testid={testId ? `${testId}-server` : undefined}>
          {t('time.server')} {time.server}
        </span>
      )}
      {local}
    </span>
  )
}
