import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Calculator, Home, LayoutGrid, MoreHorizontal, type LucideIcon } from 'lucide-react'
import { useAccountData } from '@/contexts/AccountDataContext'
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
  // 有未抵達的來襲：「首頁」加紅點（不放數字，數字留在首頁的來襲卡）
  const { unarrivedIncoming } = useAccountData()
  const hasIncoming = unarrivedIncoming.length > 0

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
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tab.id === 'home' && hasIncoming && (
                    <span
                      data-testid="tab-home-dot"
                      role="status"
                      aria-label={t('nav.incomingDot')}
                      className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-red-600"
                    />
                  )}
                </span>
                {t(tab.labelKey)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
