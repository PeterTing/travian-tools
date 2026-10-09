import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Home, LayoutGrid } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAccountData } from '@/contexts/AccountDataContext'
import { PREF_KEYS, readPref, writePref } from '@/lib/localPrefs'
import {
  CALC_SEGMENTS,
  DATA_LINKS,
  isLinkActive,
  MORE_LINKS,
  STATISTICS_LINKS,
  STRATEGY_LINKS,
  type NavLink,
} from './navItems'

interface SideGroup {
  id: string
  titleKey: string
  links: NavLink[]
}

/** 左側選單的組：發展、打仗、防守、掠奪、資料、攻略、更多 */
// eslint-disable-next-line react-refresh/only-export-components
export const SIDE_GROUPS: SideGroup[] = [
  ...CALC_SEGMENTS.map((s) => ({ id: s.id, titleKey: s.titleKey, links: s.links })),
  { id: 'data', titleKey: 'nav.groups.data', links: DATA_LINKS },
  { id: 'strategy', titleKey: 'nav.tabs.strategy', links: STRATEGY_LINKS },
  { id: 'more', titleKey: 'nav.tabs.more', links: [...MORE_LINKS, ...STATISTICS_LINKS] },
]

// 每列 44px 高
const itemClass = (active: boolean) =>
  `flex min-h-[44px] items-center gap-2 rounded-md px-2 text-sm ${
    active ? 'bg-orange-50 font-semibold text-orange-600' : 'text-foreground hover:bg-muted'
  }`

function RedDot({ testId }: { testId: string }) {
  const { t } = useTranslation()
  return (
    <span
      data-testid={testId}
      role="status"
      aria-label={t('nav.incomingDot')}
      className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-600"
    />
  )
}

function groupOf(pathname: string): string | null {
  return SIDE_GROUPS.find((g) => g.links.some((l) => isLinkActive(pathname, l.to)))?.id ?? null
}

/** 電腦版（≥ 1024px）的左側選單：同時只展開一組，記住上次開的那組 */
export default function Sidebar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { unarrivedIncoming } = useAccountData()
  const hasIncoming = unarrivedIncoming.length > 0
  const homeActive = isLinkActive(pathname, ROUTES.HOME) || pathname.startsWith('/paste/')
  const villagesActive = isLinkActive(pathname, ROUTES.VILLAGES.LIST)
  const [openId, setOpenId] = useState<string | null>(
    () => groupOf(pathname) ?? readPref(PREF_KEYS.sidebarGroup) ?? 'development'
  )

  // 走進某組裡的頁面時，自動打開那組（並記住）
  useEffect(() => {
    const g = groupOf(pathname)
    if (g) {
      setOpenId(g)
      writePref(PREF_KEYS.sidebarGroup, g)
    }
  }, [pathname])

  const toggle = (id: string) => {
    const next = openId === id ? null : id
    setOpenId(next)
    writePref(PREF_KEYS.sidebarGroup, next ?? '')
  }

  return (
    <nav
      aria-label={t('nav.sidebarLabel')}
      data-testid="sidebar"
      className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r bg-muted/30 px-3 pb-6 pt-3 lg:block"
    >
      <p className="mb-1 px-2 text-xs text-muted-foreground">{t('home.todayTitle')}</p>
      <ul>
        <li>
          <Link to={ROUTES.HOME} aria-current={homeActive ? 'page' : undefined} className={itemClass(homeActive)}>
            <Home className="h-4 w-4" aria-hidden="true" />
            {t('nav.tabs.home')}
            {hasIncoming && <RedDot testId="sidebar-home-dot" />}
          </Link>
        </li>
        <li>
          <Link
            to={ROUTES.VILLAGES.LIST}
            aria-current={villagesActive ? 'page' : undefined}
            className={itemClass(villagesActive)}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            {t('nav.tabs.villages')}
          </Link>
        </li>
      </ul>

      <ul className="mt-2 space-y-0.5">
        {SIDE_GROUPS.map((group) => {
          const open = openId === group.id
          const listId = `sidebar-group-${group.id}`
          return (
            <li key={group.id}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => toggle(group.id)}
                data-testid={`sidebar-group-${group.id}`}
                className={`${itemClass(false)} w-full justify-between font-medium`}
              >
                <span className="flex items-center gap-2">
                  {t(group.titleKey)}
                  {group.id === 'defense' && hasIncoming && <RedDot testId="sidebar-defense-dot" />}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {group.links.length}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {open && (
                <ul id={listId} className="ml-3 border-l pl-2">
                  {group.links.map((link) => {
                    const active = isLinkActive(pathname, link.to)
                    const isIncoming = link.to === ROUTES.CALCULATOR.INCOMING
                    return (
                      <li key={link.to}>
                        <Link
                          to={link.to}
                          aria-current={active ? 'page' : undefined}
                          className={`${itemClass(active)} justify-between`}
                        >
                          <span className="min-w-0 truncate">
                            {t(link.labelKey)}
                            {link.to === ROUTES.EXTERNAL_LINKS && ' ↗'}
                          </span>
                          {isIncoming && hasIncoming && (
                            <span
                              className="rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white"
                              data-testid="sidebar-incoming-count"
                            >
                              {unarrivedIncoming.length}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
