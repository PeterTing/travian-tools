import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { makeAccount } from '@/test/accountFixtures'
import type { GameAccount, GameAccountUpdate } from '@/types/game'

const authApi = vi.hoisted(() => ({
  isAuthenticated: vi.fn(() => true),
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))
// 假後端：帳號存在記憶體裡，getAll(false) 只回啟用中的
const db = vi.hoisted(() => ({ accounts: [] as GameAccount[] }))
const gameAccountApi = vi.hoisted(() => ({
  getAll: vi.fn(async (includeInactive = false) => {
    const accounts = db.accounts.filter((a) => includeInactive || a.is_active)
    return { accounts: accounts.map((a) => ({ ...a })), total: accounts.length }
  }),
  create: vi.fn(),
  update: vi.fn(async (id: string, data: GameAccountUpdate) => {
    const account = db.accounts.find((a) => a.account_id === id)!
    Object.assign(account, data)
    return { ...account }
  }),
  delete: vi.fn(),
}))
vi.mock('@/services/authApi', () => ({ default: authApi }))
vi.mock('@/services/gameAccountApi', () => ({ gameAccountApi }))
vi.mock('@/services/gameWorldApi', () => ({
  gameWorldApi: { getAll: vi.fn(async () => ({ worlds: [], total: 0 })), update: vi.fn() },
}))
vi.mock('@/services/extensionBridge', () => ({
  shareLoginWithExtension: vi.fn(async () => undefined),
  clearExtensionLogin: vi.fn(async () => undefined),
  sendSelectedAccountToExtension: vi.fn(async () => 0),
}))

import App from '@/App'

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/game-accounts']}>
      <App />
    </MemoryRouter>
  )

const switcherRows = () => {
  fireEvent.click(screen.getByRole('button', { name: '目前世界：ts3' }))
  const sheet = screen.getByRole('dialog', { name: '切換帳號和世界' })
  const text = sheet.textContent ?? ''
  fireEvent.click(within(sheet).getByRole('button', { name: '關閉' }))
  return text
}

describe('deactivated accounts on the management page', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    localStorage.clear()
    gameAccountApi.update.mockClear()
    authApi.getMe.mockResolvedValue({ user_id: 'user-1', username: 'peter' })
    db.accounts = [
      makeAccount({ village_count: 3 }),
      makeAccount({
        account_id: 'acc-alt',
        player_name: '小號',
        server_name: 'ts5',
        tribe: 'teutons',
        village_count: 2,
        is_active: false,
      }),
    ]
  })

  it('lists them below the active ones in a collapsed 已停用（n） section', async () => {
    renderPage()
    const section = await screen.findByTestId('inactive-accounts')
    const toggle = within(section).getByRole('button', { name: /已停用（1）/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(section).getByText('小號')).not.toBeVisible()
    // 上面的卡片只有啟用中的
    expect(screen.getAllByRole('button', { name: '編輯遊戲帳號' })).toHaveLength(1)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(section).getByText('小號')).toBeVisible()
    expect(within(section).getByText('ts5 · 條頓 · 2 村')).toBeVisible()
    expect(within(section).getByRole('button', { name: '重新啟用' })).toBeVisible()
    expect(gameAccountApi.getAll).toHaveBeenCalledWith(true)
  })

  it('keeps them out of the switcher', async () => {
    renderPage()
    await screen.findByTestId('inactive-accounts')
    expect(gameAccountApi.getAll).toHaveBeenCalledWith(false)
    expect(switcherRows()).not.toContain('小號')
  })

  it('reactivating moves the row up and shows it in the switcher right away, deleting nothing', async () => {
    renderPage()
    const section = await screen.findByTestId('inactive-accounts')
    fireEvent.click(within(section).getByRole('button', { name: /已停用（1）/ }))
    fireEvent.click(within(section).getByRole('button', { name: '重新啟用' }))

    await waitFor(() => expect(screen.queryByTestId('inactive-accounts')).not.toBeInTheDocument())
    expect(gameAccountApi.update).toHaveBeenCalledWith('acc-alt', { is_active: true })
    expect(gameAccountApi.delete).not.toHaveBeenCalled()
    expect(screen.getAllByRole('button', { name: '編輯遊戲帳號' })).toHaveLength(2)
    await waitFor(() => expect(switcherRows()).toContain('小號'))
  })

  describe('when every account is deactivated', () => {
    beforeEach(() => {
      db.accounts = db.accounts.map((a) => ({ ...a, is_active: false }))
    })

    it('says 沒有啟用中的帳號 and opens the 已停用 section by default', async () => {
      renderPage()
      const empty = await screen.findByTestId('all-inactive')
      expect(empty).toHaveTextContent('沒有啟用中的帳號')
      expect(empty).toHaveTextContent('可以在下方『已停用』重新啟用，或新增一個遊戲帳號')
      // 不是「一個帳號都沒有」那個空狀態
      expect(screen.queryByText('尚未新增任何遊戲帳號')).not.toBeInTheDocument()
      expect(screen.queryAllByRole('button', { name: '編輯遊戲帳號' })).toHaveLength(0)

      const section = screen.getByTestId('inactive-accounts')
      const toggle = within(section).getByRole('button', { name: /已停用（2）/ })
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(within(section).getByText('PeterT')).toBeVisible()
      expect(within(section).getByText('小號')).toBeVisible()
      expect(within(section).getAllByRole('button', { name: '重新啟用' })).toHaveLength(2)

      // 還是可以自己收起來
      fireEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(within(section).getByText('小號')).not.toBeVisible()
    })

    it('keeps 新增遊戲帳號 reachable from the empty state', async () => {
      renderPage()
      const empty = await screen.findByTestId('all-inactive')
      fireEvent.click(within(empty).getByRole('button', { name: '新增遊戲帳號' }))
      expect(await screen.findByLabelText('遊戲裡顯示的時間')).toBeInTheDocument()
    })

    it('reactivating one brings its card back and the empty state goes away', async () => {
      renderPage()
      const section = await screen.findByTestId('inactive-accounts')
      const row = within(section).getByText('小號').closest('li')!
      fireEvent.click(within(row).getByRole('button', { name: '重新啟用' }))

      await waitFor(() => expect(screen.queryByTestId('all-inactive')).not.toBeInTheDocument())
      expect(gameAccountApi.update).toHaveBeenCalledWith('acc-alt', { is_active: true })
      expect(screen.getAllByRole('button', { name: '編輯遊戲帳號' })).toHaveLength(1)
      expect(within(screen.getByTestId('inactive-accounts')).getByRole('button', { name: /已停用（1）/ })).toBeInTheDocument()
    })
  })

  it('with no accounts at all, keeps the original 尚未新增任何遊戲帳號 empty state', async () => {
    db.accounts = []
    renderPage()
    expect(await screen.findByText('尚未新增任何遊戲帳號')).toBeInTheDocument()
    expect(screen.queryByTestId('all-inactive')).not.toBeInTheDocument()
    expect(screen.queryByTestId('inactive-accounts')).not.toBeInTheDocument()
  })

  describe('active account cards', () => {
    it('show the server name as the subtitle (not the URL)', async () => {
      db.accounts = [
        makeAccount({ server_name: 'ts3 亞洲服', server_url: 'https://ts3.x1.asia.travian.com' }),
        makeAccount({
          account_id: 'acc-ts7',
          player_name: '七服',
          server_name: null,
          server_url: 'https://ts7.x3.europe.travian.com',
        }),
        makeAccount({
          account_id: 'acc-blank',
          player_name: '空白名稱',
          server_name: '   ',
          server_url: 'https://ts9.x1.international.travian.com',
        }),
      ]
      renderPage()
      await waitFor(() => expect(screen.getAllByTestId('account-server')).toHaveLength(3))
      const subtitles = screen.getAllByTestId('account-server')
      expect(subtitles.map((el) => el.textContent)).toEqual(['ts3 亞洲服', 'ts7', 'ts9'])
      // 完整網址不當副標題，只放在 title（滑鼠移上去看得到）
      expect(subtitles[0]).toHaveAttribute('title', 'https://ts3.x1.asia.travian.com')
      expect(screen.queryByText('https://ts3.x1.asia.travian.com')).not.toBeInTheDocument()
    })
  })
})
