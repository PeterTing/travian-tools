import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Calculator, Home, LayoutGrid, MoreHorizontal, type LucideIcon } from 'lucide-react'
import { activeTabFor, TABS, type TabId } from './navItems'

const ICONS: Record<TabId, LucideIcon> = {
  home: Home,
  villages: LayoutGrid,
  calculators: Calculator,
  strategy: BookOpen,
  more: MoreHorizontal,
}

/**
 * 手機和平板的底部分頁（< 1024px）；電腦版換成左側選單。
 * 固定在畫面底部，避開 iPhone 的 Home 指示條（safe-area-inset-bottom）；
 * 主要內容另外留了同樣高度的底部空間，不會被擋住。
 */
export default function BottomTabBar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const active = activeTabFor(pathname)

  return (
    <nav
      aria-label={t('nav.tabBarLabel')}
      data-testid="bottom-tab-bar"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const Icon = ICONS[tab.id]
          const isActive = tab.id === active
          return (
            <li key={tab.id}>
              <Link
                to={tab.to}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[11px] ${
                  isActive ? 'font-semibold text-orange-600' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {t(tab.labelKey)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
