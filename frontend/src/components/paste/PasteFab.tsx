import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * 手機右下角「＋ 貼上」（電腦版在頂列，這裡 lg 以上隱藏）。
 * 只放在首頁（貼上卡捲出畫面上方時）和村莊頁；計算器和其他頁不放。
 * 用到它的頁面，內容底部要留 PASTE_FAB_CLEARANCE（按鈕高 48px + 16px），捲到底才不會被蓋住。
 */
export const PASTE_FAB_CLEARANCE = 'pb-[calc(48px+16px)] lg:pb-6'

const FAB_CLASS =
  'fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] right-4 z-30 inline-flex min-h-[48px] items-center gap-1 rounded-full bg-orange-600 px-5 text-sm font-semibold text-white shadow-lg lg:hidden'

/** onClick 給首頁用（直接捲到貼上框）；沒給就連到首頁的貼上框 */
export default function PasteFab({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslation()
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={FAB_CLASS} data-testid="paste-fab">
        ＋ {t('home.pasteFab')}
      </button>
    )
  }
  return (
    <Link to="/#paste" className={FAB_CLASS} data-testid="paste-fab">
      ＋ {t('home.pasteFab')}
    </Link>
  )
}
