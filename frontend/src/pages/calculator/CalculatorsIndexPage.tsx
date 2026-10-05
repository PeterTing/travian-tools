import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavList from '@/components/layout/NavList'
import { CALCULATOR_GROUPS, type NavLink } from '@/components/layout/navItems'

/** 計算器列表（手機底部「計算器」分頁）；戰鬥模擬 P1 重寫完成前不列 */
export default function CalculatorsIndexPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CALCULATOR_GROUPS
    return CALCULATOR_GROUPS.map((group) => {
      const links = group.links.filter((link: NavLink) => {
        const label = String(t(link.labelKey)).toLowerCase()
        return label.includes(q) || link.to.toLowerCase().includes(q)
      })
      return { ...group, links }
    }).filter((g) => g.links.length > 0)
  }, [query, t])

  return (
    <div className="mx-auto w-full max-w-3xl min-w-0 space-y-5 overflow-x-hidden px-4 py-4">
      <h1 className="text-xl font-bold">{t('nav.calculatorsPage.title')}</h1>

      <label className="block">
        <span className="sr-only">{t('nav.calculatorsPage.search')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('nav.calculatorsPage.searchPlaceholder')}
          data-testid="calculator-search"
          className="w-full min-w-0 rounded-full border border-input bg-background px-4 py-2 text-sm"
        />
      </label>

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('nav.calculatorsPage.noResults')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredGroups.map((group) => (
            <section key={group.titleKey} className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground">{t(group.titleKey)}</h2>
              <NavList links={group.links} pathname={pathname} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
