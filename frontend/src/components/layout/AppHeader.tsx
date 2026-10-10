import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import AccountWorldSwitcher from '@/components/account/AccountWorldSwitcher'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

/**
 * 頂部：網站名稱＋帳號 ▾＋世界 ▾（P0 線框：帳號和世界一直都在頂部）。
 * 手機上頂部只放這些，其他頁面都在底部分頁；使用者名稱和登出在「更多」。
 * 電腦版右邊多放使用者名稱和登出。
 */
export default function AppHeader() {
  const { t } = useTranslation()
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-14 items-center gap-2 px-3 lg:gap-4 lg:px-4">
        <Link to={ROUTES.HOME} className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-base font-bold lg:text-lg">
          {t('nav.title')}
        </Link>
        {isAuthenticated && (
          <div className="min-w-0 flex-1">
            <AccountWorldSwitcher />
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <div className="hidden items-center gap-3 lg:flex" data-testid="header-user">
              {/* 手機的浮動「＋ 貼上」在電腦改成頂列按鈕 */}
              <Link
                to={{ pathname: ROUTES.HOME, hash: 'paste' }}
                className="inline-flex h-11 items-center rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
                data-testid="header-paste"
              >
                ＋ {t('home.pasteFab')}
              </Link>
              <span className="max-w-[12rem] truncate text-sm text-muted-foreground">{user?.username}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                {t('auth.logout')}
              </Button>
            </div>
          ) : (
            <>
              <Link to={ROUTES.AUTH.LOGIN}>
                <Button variant="ghost" size="sm">
                  {t('auth.login')}
                </Button>
              </Link>
              <Link to={ROUTES.AUTH.REGISTER}>
                <Button size="sm">{t('auth.register')}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
