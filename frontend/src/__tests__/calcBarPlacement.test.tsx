import { beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { ROUTES } from '@/constants/routes'
import appSource from '@/App.tsx?raw'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}))
// 頁面掛載時會打 API；這裡只看版面，全部回空資料
vi.mock('@/services/gameApi', () => {
  const empty = () => new Proxy({}, { get: () => async () => ({ buildings: [], troops: [] }) })
  return { calculatorApi: empty(), buildingsApi: empty(), troopsApi: empty(), default: empty() }
})

vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({
    accounts: [],
    currentAccount: null,
    loading: false,
    selectAccount: vi.fn(),
    reload: async () => undefined,
  }),
}))

import { AppContent } from '@/App'

/** App.tsx 裡所有包了 CalcFrame 的路由（從原始碼讀，新增頁面時也會被這個測試涵蓋） */
function framedRoutes(): string[] {
  const out: string[] = []
  const re = /path=(?:"([^"]+)"|\{([A-Z_.]+)\})\s+element=\{<CalcFrame/g
  for (const m of appSource.matchAll(re)) {
    if (m[1]) out.push(m[1])
    else if (m[2] === 'ROUTES.CALCULATOR.FIELDS') out.push(ROUTES.CALCULATOR.FIELDS)
    else throw new Error(`unknown route constant ${m[2]}`)
  }
  // CP 與開村 自己畫列（要把假設寫在列上），也一起檢查
  return [...out, '/calculator/passive-cp']
}

const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING

describe('「已帶入」列的位置', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    if (!window.matchMedia) {
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia
    }
  })

  it('covers every calculator wrapped in CalcFrame', () => {
    const routes = framedRoutes()
    expect(routes).toContain('/calculator/path')
    expect(routes).toContain('/calculator/attack-planner')
    expect(routes.length).toBeGreaterThanOrEqual(18)
    expect(routes).toContain('/calculator/passive-cp')
  })

  it.each(framedRoutes())('%s: below the page title, above the first input', async (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppContent />
      </MemoryRouter>,
    )
    const bar = await screen.findByTestId('autofill-bar')
    expect(screen.getAllByTestId('autofill-bar')).toHaveLength(1)
    const main = bar.closest('main') ?? document.body

    const title = main.querySelector('h1, h2')
    expect(title, 'page title').not.toBeNull()
    expect(title!.compareDocumentPosition(bar) & FOLLOWING).toBeTruthy()

    const firstInput = Array.from(main.querySelectorAll('input, select, textarea')).find(
      (el) => !bar.contains(el) && (el as HTMLInputElement).type !== 'hidden',
    )
    if (firstInput) expect(bar.compareDocumentPosition(firstInput) & FOLLOWING).toBeTruthy()
    // 計算器頁不放「＋ 貼上」浮動按鈕（電腦頂列的還在）
    expect(screen.queryByTestId('paste-fab')).not.toBeInTheDocument()
    cleanup()
  })
})
