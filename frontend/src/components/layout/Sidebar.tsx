import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Home, LayoutGrid } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import {
  CALCULATOR_GROUPS,
  isLinkActive,
  MORE_GROUPS,
  MORE_LINKS,
  STRATEGY_LINKS,
  type NavGroup,
  type NavLink,
} from './navItems'

const itemClass = (active: boolean) =>
  `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
    active ? 'bg-orange-50 font-semibold text-orange-600' : 'text-foreground hover:bg-muted'
  }`

function SideLink({ link, pathname }: { link: NavLink; pathname: string }) {
  const { t } = useTranslation()
  const active = isLinkActive(pathname, link.to)
  return (
    <li>
      <Link to={link.to} aria-current={active ? 'page' : undefined} className={itemClass(active)}>
        {t(link.labelKey)}
      </Link>
    </li>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="mb-1 mt-4 px-2 text-xs text-muted-foreground">{children}</p>
}

/** 數據庫、統計各有好幾頁，平常收起來；目前在裡面的某一頁時自動展開 */
function CollapsibleGroup({ group, pathname }: { group: NavGroup; pathname: string }) {
  const { t } = useTranslation()
  const containsActive = group.links.some((l) => isLinkActive(pathname, l.to))
  const [open, setOpen] = useState(containsActive)
  useEffect(() => {
    if (containsActive) setOpen(true)
  }, [containsActive])
  const listId = `sidebar-group-${group.titleKey.replace(/\W/g, '-')}`

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`${itemClass(false)} w-full justify-between`}
      >
        {t(group.titleKey)}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul id={listId} className="ml-3 border-l pl-2">
          {group.links.map((link) => (
            <SideLink key={link.to} link={link} pathname={pathname} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** 電腦版（≥ 1024px）的左側選單；內容跟手機底部分頁＋「更多」一樣 */
export default function Sidebar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const homeActive = isLinkActive(pathname, ROUTES.HOME) || pathname.startsWith('/paste/')
  const villagesActive = isLinkActive(pathname, ROUTES.VILLAGES.LIST)

  return (
    <nav
      aria-label={t('nav.sidebarLabel')}
      data-testid="sidebar"
      className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r bg-muted/30 px-3 pb-6 pt-3 lg:block"
    >
      <ul>
        <li>
          <Link to={ROUTES.HOME} aria-current={homeActive ? 'page' : undefined} className={itemClass(homeActive)}>
            <Home className="h-4 w-4" aria-hidden="true" />
            {t('nav.tabs.home')}
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

      <SectionTitle>{t('nav.tabs.calculators')}</SectionTitle>
      <ul>
        {CALCULATOR_GROUPS.flatMap((g) => g.links).map((link) => (
          <SideLink key={link.to} link={link} pathname={pathname} />
        ))}
      </ul>

      <SectionTitle>{t('nav.tabs.strategy')}</SectionTitle>
      <ul>
        {STRATEGY_LINKS.map((link) => (
          <SideLink key={link.to} link={link} pathname={pathname} />
        ))}
      </ul>

      <SectionTitle>{t('nav.tabs.more')}</SectionTitle>
      <ul>
        {MORE_LINKS.map((link) => (
          <SideLink key={link.to} link={link} pathname={pathname} />
        ))}
        {MORE_GROUPS.map((group) => (
          <CollapsibleGroup key={group.titleKey} group={group} pathname={pathname} />
        ))}
      </ul>
    </nav>
  )
}
