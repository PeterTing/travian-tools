import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import AppHeader from './AppHeader'
import BottomTabBar from './BottomTabBar'
import Sidebar from './Sidebar'

/**
 * RWD 外框（P0-11，照 P0 線框 v0.4）
 * - 手機優先：頂部（名稱＋帳號／世界）＋底部 5 個分頁
 * - ≥ 1024px：底部分頁換成左側選單
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2 focus:shadow"
      >
        {t('nav.skipToContent')}
      </a>
      <AppHeader />
      <div className="lg:flex">
        <Sidebar />
        {/* 手機：底部留出分頁的高度（含 safe area），內容不會被擋住；min-w-0 讓內容不會把版面撐寬 */}
        <main
          id="main-content"
          className="min-w-0 flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] lg:pb-0"
        >
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
