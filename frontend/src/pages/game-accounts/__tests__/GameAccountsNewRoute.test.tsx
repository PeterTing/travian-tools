import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { makeAccount } from '@/test/accountFixtures'

const authApi = vi.hoisted(() => ({
  isAuthenticated: vi.fn(() => true),
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))
const gameAccountApi = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))
vi.mock('@/services/authApi', () => ({ default: authApi }))
vi.mock('@/services/gameAccountApi', () => ({ gameAccountApi }))
vi.mock('@/services/extensionBridge', () => ({
  shareLoginWithExtension: vi.fn(async () => undefined),
  clearExtensionLogin: vi.fn(async () => undefined),
}))

import App from '@/App'

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>
  )

describe('/game-accounts/new', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    localStorage.clear()
    authApi.getMe.mockResolvedValue({ user_id: 'user-1', username: 'peter' })
    gameAccountApi.getAll.mockResolvedValue({ accounts: [makeAccount()], total: 1 })
  })

  it('opens the add form straight away', async () => {
    renderAt('/game-accounts/new')
    expect(await screen.findByLabelText('遊戲裡顯示的時間')).toBeInTheDocument()
    expect(screen.getAllByText('新增遊戲帳號').length).toBeGreaterThan(0)
  })

  it('returns to the account list on cancel', async () => {
    renderAt('/game-accounts/new')
    fireEvent.click(await screen.findByRole('button', { name: '取消' }))
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/game-accounts$/)
    expect(await screen.findByRole('heading', { name: '遊戲帳號管理' })).toBeInTheDocument()
  })

  it('shows the account and world chips in the top bar', async () => {
    renderAt('/game-accounts')
    expect(await screen.findByRole('button', { name: '目前帳號：PeterT' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '目前世界：ts3' })).toBeInTheDocument()
  })
})
