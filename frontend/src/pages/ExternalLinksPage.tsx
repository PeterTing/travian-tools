import { useTranslation } from 'react-i18next'
import ExternalLinkList from '@/components/external/ExternalLinkList'

/** 資料 › 外部連結（電腦左側選單）；手機在「更多 › 外部工具」 */
export default function ExternalLinksPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-lg space-y-3 px-4 py-4">
      <h1 className="text-xl font-bold">{t('nav.externalLinks')}</h1>
      <p className="text-sm text-muted-foreground">{t('external.intro')}</p>
      <ExternalLinkList />
    </div>
  )
}
