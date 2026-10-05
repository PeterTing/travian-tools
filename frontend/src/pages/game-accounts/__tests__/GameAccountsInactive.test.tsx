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
})
