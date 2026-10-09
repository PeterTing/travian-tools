/**
 * 手機底部分頁列的高度：h-14（3.5rem）＋上邊框 1px＋iPhone safe area。
 * BottomTabBar 照這個高度畫；AppShell 的 <main> 底部留「分頁列高度＋16px」，
 * 所有頁面捲到最底時，最後一個按鈕或輸入框都在分頁列上方至少 16px，不會被蓋住。
 */
export const BOTTOM_NAV_HEIGHT = 'calc(3.5rem + 1px + env(safe-area-inset-bottom))'

/** 給 <main> 用（Tailwind 要完整字串才產生 class） */
export const BOTTOM_NAV_CLEARANCE = 'pb-[calc(3.5rem+1px+env(safe-area-inset-bottom)+16px)] lg:pb-0'
