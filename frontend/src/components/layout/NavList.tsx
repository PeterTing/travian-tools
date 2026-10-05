import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { isLinkActive, type NavLink } from './navItems'

/** 線框的「清單」樣式：圓角外框、每列一個連結、右邊一個 ›；目前這頁標橘色 */
export default function NavList({ links, pathname }: { links: NavLink[]; pathname: string }) {
  const { t } = useTranslation()
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-background">
      {links.map((link) => {
        const active = isLinkActive(pathname, link.to)
        return (
          <li key={link.to}>
            <Link
              to={link.to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[44px] items-center justify-between gap-2 px-3 py-2 text-sm ${
                active ? 'bg-orange-50 font-semibold text-orange-600' : 'hover:bg-muted'
              }`}
            >
              <span className="min-w-0 break-words">{t(link.labelKey)}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
