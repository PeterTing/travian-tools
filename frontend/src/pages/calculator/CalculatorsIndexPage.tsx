import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { CALC_SEGMENTS, isLinkActive, type CalcSegmentId, type NavLink } from '@/components/layout/navItems'
import { PREF_KEYS, readPref, writePref } from '@/lib/localPrefs'

const SEGMENT_IDS = CALC_SEGMENTS.map((s) => s.id)

function initialSegment(): CalcSegmentId {
  const saved = readPref(PREF_KEYS.calcSegment) as CalcSegmentId | null
  return saved && SEGMENT_IDS.includes(saved) ? saved : 'development'
}

function CalcList({ links, pathname }: { links: NavLink[]; pathname: string }) {
  const { t } = useTranslation()
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-background" data-testid="calc-list">
      {links.map((link) => {
        const active = isLinkActive(pathname, link.to)
        return (
          <li key={link.to}>
            <Link
              to={link.to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[44px] items-center justify-between gap-2 px-3 py-2.5 text-sm ${
                active ? 'bg-orange-50 text-orange-600' : 'hover:bg-muted'
              }`}
            >
              <span className="min-w-0">
                <span className="block break-words font-medium">{t(link.labelKey)}</span>
                {link.descKey && (
                  <span className="block break-words text-xs text-muted-foreground">{t(link.descKey)}</span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** 計算器分頁：分段切 發展／打仗／防守／掠奪，記住上次選的那段；搜尋時跨四段找 */
export default function CalculatorsIndexPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState<CalcSegmentId>(initialSegment)

  const choose = (id: CalcSegmentId) => {
    setSegment(id)
    writePref(PREF_KEYS.calcSegment, id)
  }

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return CALC_SEGMENTS.flatMap((seg) => seg.links).filter((link) => {
      const label = String(t(link.labelKey)).toLowerCase()
      const desc = link.descKey ? String(t(link.descKey)).toLowerCase() : ''
      return label.includes(q) || desc.includes(q) || link.to.toLowerCase().includes(q)
    })
  }, [query, t])

  const current = CALC_SEGMENTS.find((s) => s.id === segment) ?? CALC_SEGMENTS[0]!

  return (
    <div className="mx-auto w-full max-w-3xl min-w-0 space-y-4 overflow-x-hidden px-4 py-4">
      <h1 className="text-xl font-bold">{t('nav.calculatorsPage.title')}</h1>

      <div
        role="tablist"
        aria-label={t('nav.calculatorsPage.segments')}
        className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1"
        data-testid="calc-segments"
      >
        {CALC_SEGMENTS.map((seg) => {
          const selected = seg.id === segment && !searchResults
          return (
            <button
              key={seg.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setQuery('')
                choose(seg.id)
              }}
              data-testid={`calc-segment-${seg.id}`}
              className={`min-h-[44px] rounded-md text-sm ${
                selected ? 'bg-background font-semibold text-orange-600 shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t(seg.titleKey)}
            </button>
          )
        })}
      </div>

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

      {searchResults ? (
        searchResults.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('nav.calculatorsPage.noResults')}</p>
        ) : (
          <CalcList links={searchResults} pathname={pathname} />
        )
      ) : (
        <section role="tabpanel" aria-label={t(current.titleKey)}>
          <CalcList links={current.links} pathname={pathname} />
        </section>
      )}
    </div>
  )
}
