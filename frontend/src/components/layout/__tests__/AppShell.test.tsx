import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import i18n from '@/i18n/i18n'

const auth = vi.hoisted(() => ({
  user: { user_id: 'u1', username: 'peter_rwd' } as { user_id: string; username: string } | null,
  isAuthenticated: true,
  logout: vi.fn(),
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('@/components/account/AccountWorldSwitcher', () => ({
  default: () => (
    <div data-testid="account-world-chips">
      <button type="button">▾ PeterT</button>
      <button type="button">▾ ts3</button>
    </div>
  ),
}))

import AppShell from '../AppShell'
import { activeTabFor, CALCULATOR_GROUPS, MORE_GROUPS, MORE_LINKS, STRATEGY_LINKS } from '../navItems'
import MorePage from '@/pages/MorePage'
import CalculatorsIndexPage from '@/pages/calculator/CalculatorsIndexPage'

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

const renderShell = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <Routes>
          <Route path="/more" element={<MorePage />} />
          <Route path="/calculator" element={<CalculatorsIndexPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </AppShell>
    </MemoryRouter>
  )

const tabBar = () => screen.getByRole('navigation', { name: '主要分頁' })
const sidebar = () => screen.getByRole('navigation', { name: '主選單' })

/** 這些入口在 P0 一律不能出現（AI、執行已移除；知識庫 P1；戰鬥模擬 P1 重寫前隱藏） */
const FORBIDDEN = [/AI/, /執行/, /知識庫/, /戰鬥模擬/, /健康檢查/]
const FORBIDDEN_HREFS = ['/calculator/battle', '/strategy/health-check', '/ai', '/execution', '/knowledge']

function expectNoForbiddenEntries(container: HTMLElement) {
  for (const pattern of FORBIDDEN) {
    expect(within(container).queryAllByText(pattern)).toEqual([])
  }
  const hrefs = within(container)
    .queryAllByRole('link')
    .map((a) => a.getAttribute('href') ?? '')
  for (const bad of FORBIDDEN_HREFS) {
    expect(hrefs.filter((h) => h.startsWith(bad))).toEqual([])
  }
}

describe('AppShell (P0-11 RWD 外框)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    auth.user = { user_id: 'u1', username: 'peter_rwd' }
    auth.isAuthenticated = true
    auth.logout.mockReset()
  })

  it('phone: bottom tab bar has exactly 首頁／村莊／計算器／攻略／更多, fixed and hidden from 1024px', () => {
    renderShell('/')
    const bar = tabBar()
    const labels = within(bar)
      .getAllByRole('link')
      .map((a) => a.textContent)
    expect(labels).toEqual(['首頁', '村莊', '計算器', '攻略', '更多'])
    expect(within(bar).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/villages',
      '/calculator',
      '/strategy/opening',
      '/more',
    ])
    // 只在 < 1024px 出現；固定在底部並避開 Home 指示條
    expect(bar).toHaveClass('fixed', 'bottom-0', 'lg:hidden', 'pb-[env(safe-area-inset-bottom)]')
  })

  it('phone: the old top menu row is gone — the sidebar only shows from 1024px', () => {
    renderShell('/')
    expect(sidebar()).toHaveClass('hidden', 'lg:block')
    // 頂部只剩名稱和帳號／世界切換；使用者名稱和登出在電腦版才放頂部
    const header = screen.getByRole('banner')
    expect(within(header).getByText('Travian Tools')).toBeInTheDocument()
    expect(within(header).getByTestId('account-world-chips')).toBeInTheDocument()
    expect(within(header).getByTestId('header-user')).toHaveClass('hidden', 'lg:flex')
    expect(within(header).queryByText('數據庫')).not.toBeInTheDocument()
    expect(within(header).queryByText('計算器')).not.toBeInTheDocument()
  })

  it('leaves room at the bottom of the content for the tab bar (phone only)', () => {
    renderShell('/')
    const main = screen.getByRole('main')
    expect(main.className).toContain('pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)]')
    expect(main).toHaveClass('lg:pb-0', 'min-w-0')
  })

  it.each([
    ['/', '首頁'],
    ['/paste/confirm/d1', '首頁'],
    ['/villages', '村莊'],
    ['/villages/v1', '村莊'],
    ['/calculator', '計算器'],
    ['/calculator/path', '計算器'],
    ['/strategy/opening', '攻略'],
    ['/more', '更多'],
    ['/game-accounts', '更多'],
    ['/map-sql', '更多'],
    ['/database/troops', '更多'],
    ['/statistics/players', '更多'],
  ])('highlights the current tab at %s → %s', (path, label) => {
    renderShell(path)
    const current = within(tabBar())
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual([label])
  })

  it('no tab is highlighted on the login page', () => {
    expect(activeTabFor('/login')).toBeNull()
    expect(activeTabFor('/register')).toBeNull()
  })

  it('has no AI／執行／知識庫／戰鬥模擬 entries in the tab bar, sidebar, 更多 or 計算器 list', () => {
    const { unmount } = renderShell('/more')
    expectNoForbiddenEntries(tabBar())
    expectNoForbiddenEntries(sidebar())
    // 側邊選單收起的群組也要檢查
    fireEvent.click(within(sidebar()).getByRole('button', { name: '數據庫' }))
    fireEvent.click(within(sidebar()).getByRole('button', { name: '統計' }))
    expectNoForbiddenEntries(sidebar())
    expectNoForbiddenEntries(screen.getByRole('main'))
    unmount()

    renderShell('/calculator')
    expectNoForbiddenEntries(screen.getByRole('main'))
    expectNoForbiddenEntries(document.body)
  })

  it('tapping 更多 opens the 更多 page with the remaining items, user name and 登出', () => {
    renderShell('/')
    fireEvent.click(within(tabBar()).getByRole('link', { name: '更多' }))
    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 1, name: '更多' })).toBeInTheDocument()
    for (const name of ['Map.sql 分析器', '遊戲帳號管理', '建築數據', '兵種數據', '資源田數據', '伺服器總覽', '玩家排名', '不活躍搜尋']) {
      expect(within(main).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(within(main).getByText('目前登入：peter_rwd')).toBeInTheDocument()
    fireEvent.click(within(main).getByRole('button', { name: '登出' }))
    expect(auth.logout).toHaveBeenCalledTimes(1)
    expect(within(tabBar()).getByRole('link', { name: '更多' })).toHaveAttribute('aria-current', 'page')
  })

  it('navigating from 更多 goes to the page and moves the highlight', () => {
    renderShell('/more')
    fireEvent.click(within(screen.getByRole('main')).getByRole('link', { name: '遊戲帳號管理' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/game-accounts')
    expect(within(tabBar()).getByRole('link', { name: '更多' })).toHaveAttribute('aria-current', 'page')
    expect(within(sidebar()).getByRole('link', { name: '遊戲帳號管理' })).toHaveAttribute('aria-current', 'page')
  })

  it('更多 offers 登入／註冊 when signed out', () => {
    auth.user = null
    auth.isAuthenticated = false
    renderShell('/more')
    const main = screen.getByRole('main')
    expect(within(main).getByRole('link', { name: '登入' })).toHaveAttribute('href', '/login')
    expect(within(main).getByRole('link', { name: '註冊' })).toHaveAttribute('href', '/register')
    expect(screen.queryByTestId('account-world-chips')).not.toBeInTheDocument()
  })

  it('計算器 tab lists the calculators grouped 打仗／發展, without 戰鬥模擬', () => {
    renderShell('/calculator')
    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 2, name: '打仗' })).toBeInTheDocument()
    expect(within(main).getByRole('heading', { level: 2, name: '發展' })).toBeInTheDocument()
    expect(within(main).getByRole('link', { name: '移動時間' })).toHaveAttribute('href', '/calculator/path')
    expect(within(main).getAllByRole('link')).toHaveLength(18)
  })

  it('desktop sidebar has the same content as the tabs + 更多', () => {
    renderShell('/')
    const side = sidebar()
    for (const group of MORE_GROUPS) {
      fireEvent.click(within(side).getByRole('button', { name: i18n.t(group.titleKey) }))
    }
    const hrefs = new Set(within(side).getAllByRole('link').map((a) => a.getAttribute('href')))
    const expected = [
      '/',
      '/villages',
      ...CALCULATOR_GROUPS.flatMap((g) => g.links.map((l) => l.to)),
      ...STRATEGY_LINKS.map((l) => l.to),
      ...MORE_LINKS.map((l) => l.to),
      ...MORE_GROUPS.flatMap((g) => g.links.map((l) => l.to)),
    ]
    expect([...hrefs].sort()).toEqual([...new Set(expected)].sort())
  })

  it('sidebar groups 數據庫／統計 collapse, toggle with aria-expanded and open on their own pages', () => {
    const { unmount } = renderShell('/')
    const toggle = within(sidebar()).getByRole('button', { name: '統計' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(sidebar()).queryByRole('link', { name: '玩家排名' })).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(sidebar()).getByRole('link', { name: '玩家排名' })).toBeInTheDocument()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    unmount()

    renderShell('/statistics/players')
    expect(within(sidebar()).getByRole('button', { name: '統計' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(sidebar()).getByRole('link', { name: '玩家排名' })).toHaveAttribute('aria-current', 'page')
    expect(within(sidebar()).getByRole('button', { name: '數據庫' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('uses English labels when the language is en', async () => {
    await act(async () => {
      await i18n.changeLanguage('en')
    })
    try {
      renderShell('/')
      const labels = within(screen.getByRole('navigation', { name: 'Main tabs' }))
        .getAllByRole('link')
        .map((a) => a.textContent)
      expect(labels).toEqual(['Home', 'Villages', 'Calculators', 'Guide', 'More'])
    } finally {
      await act(async () => {
        await i18n.changeLanguage('zh-TW')
      })
    }
  })
})
