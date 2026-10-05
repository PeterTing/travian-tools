import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavList from '@/components/layout/NavList'
import { CALCULATOR_GROUPS } from '@/components/layout/navItems'

/** 計算器列表（手機底部「計算器」分頁）；戰鬥模擬 P1 重寫完成前不列 */
export default function CalculatorsIndexPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-4">
      <h1 className="text-xl font-bold">{t('nav.calculatorsPage.title')}</h1>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {CALCULATOR_GROUPS.map((group) => (
          <section key={group.titleKey} className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground">{t(group.titleKey)}</h2>
            <NavList links={group.links} pathname={pathname} />
          </section>
        ))}
      </div>
    </div>
  )
}
