import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import NavList from '@/components/layout/NavList'
import { MORE_GROUPS, MORE_LINKS } from '@/components/layout/navItems'
import { ROUTES } from '@/constants/routes'

/** 手機底部「更多」：地圖、帳號管理、數據庫、統計，最下面是登入的使用者和登出 */
export default function MorePage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-4 py-4">
      <h1 className="text-xl font-bold">{t('nav.more.title')}</h1>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground">{t('nav.more.tools')}</h2>
        <NavList links={MORE_LINKS} pathname={pathname} />
      </section>

      {MORE_GROUPS.map((group) => (
        <section key={group.titleKey} className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground">{t(group.titleKey)}</h2>
          <NavList links={group.links} pathname={pathname} />
        </section>
      ))}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground">{t('nav.more.account')}</h2>
        {isAuthenticated ? (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="break-words text-sm" data-testid="more-signed-in">
              {t('nav.more.signedInAs', { name: user?.username ?? '' })}
            </p>
            <Button variant="outline" className="w-full" onClick={logout}>
              {t('auth.logout')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Link to={ROUTES.AUTH.LOGIN}>
              <Button variant="outline" className="w-full">
                {t('auth.login')}
              </Button>
            </Link>
            <Link to={ROUTES.AUTH.REGISTER}>
              <Button className="w-full">{t('auth.register')}</Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
