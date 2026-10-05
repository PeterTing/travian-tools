import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { makeAccount } from '@/test/accountFixtures'

const getAll = vi.hoisted(() => vi.fn())
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { user_id: 'user-1' }, isAuthenticated: true }),
}))
vi.mock('@/services/gameAccountApi', () => ({ gameAccountApi: { getAll } }))

import { CurrentAccountProvider } from '@/contexts/CurrentAccountContext'
import { currentAccountStorageKey } from '@/services/currentAccountStore'
import AccountWorldSwitcher from '../AccountWorldSwitcher'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString()
const ts3 = makeAccount({ village_count: 8, last_updated: minutesAgo(2) })
const ts5 = makeAccount({
  account_id: 'acc-ts5',
  server_name: 'ts5',
  tribe: 'teutons',
  village_count: 3,
  last_updated: minutesAgo(60 * 30),
})
const alt = makeAccount({
  account_id: 'acc-alt',
  player_name: '小號',
  tribe: 'romans',
  village_count: 1,
  last_updated: minutesAgo(60 * 24 * 3 + 5),
})

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

const renderSwitcher = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <CurrentAccountProvider>
        <AccountWorldSwitcher />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </CurrentAccountProvider>
    </MemoryRouter>
  )

describe('AccountWorldSwitcher', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    localStorage.clear()
    getAll.mockReset()
  })

  it('shows the current nickname and world as two chips', async () => {
    getAll.mockResolvedValue({ accounts: [ts3, ts5, alt], total: 3 })
    renderSwitcher()
    expect(await screen.findByRole('button', { name: '目前帳號：PeterT' })).toHaveTextContent('▾ PeterT')
    expect(screen.getByRole('button', { name: '目前世界：ts3' })).toHaveTextContent('▾ ts3')
  })

  it('opens the 切換帳號和世界 sheet from either chip', async () => {
    getAll.mockResolvedValue({ accounts: [ts3, ts5, alt], total: 3 })
    renderSwitcher()
    fireEvent.click(await screen.findByRole('button', { name: '目前世界：ts3' }))
    const sheet = screen.getByRole('dialog', { name: '切換帳號和世界' })
    expect(within(sheet).getByText('每個組合的資料完全分開。')).toBeInTheDocument()
    expect(within(sheet).getByText('高盧 · 8 村 · 2 分鐘前更新')).toBeInTheDocument()
    expect(within(sheet).getByText('條頓 · 3 村 · 昨天更新')).toBeInTheDocument()
    expect(within(sheet).getByText('羅馬 · 1 村 · 3 天前')).toBeInTheDocument()
    expect(within(sheet).getByText('新增時只填世界、部族和遊戲內名稱，不會要求遊戲密碼。')).toBeInTheDocument()
    // 目前這組打勾
    const rows = within(sheet).getAllByRole('button', { current: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('PeterT · ts3')
    expect(within(rows[0]).getByLabelText('目前選擇')).toHaveTextContent('✓')
  })

  it('switches to another account and world and remembers it', async () => {
    getAll.mockResolvedValue({ accounts: [ts3, ts5, alt], total: 3 })
    renderSwitcher()
    fireEvent.click(await screen.findByRole('button', { name: '目前帳號：PeterT' }))
    fireEvent.click(screen.getByText('條頓 · 3 村 · 昨天更新'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '目前世界：ts5' })).toBeInTheDocument()
    expect(localStorage.getItem(currentAccountStorageKey('user-1'))).toBe('acc-ts5')
  })

  it('closes on the backdrop and on Escape', async () => {
    getAll.mockResolvedValue({ accounts: [ts3], total: 1 })
    renderSwitcher()
    fireEvent.click(await screen.findByRole('button', { name: '目前帳號：PeterT' }))
    fireEvent.click(screen.getByTestId('switcher-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '目前帳號：PeterT' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the sheet outside the sticky header so the bottom tab bar cannot cover it (P0-11)', async () => {
    getAll.mockResolvedValue({ accounts: [ts3], total: 1 })
    renderSwitcher()
    const chip = await screen.findByRole('button', { name: '目前帳號：PeterT' })
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    const overlay = screen.getByRole('dialog').parentElement
    // 直接掛在 body 底下，不在頂部（sticky、自己一層）裡面
    expect(overlay?.parentElement).toBe(document.body)
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-[60]')
  })

  it('goes to /game-accounts/new from ＋ 新增帳號或世界', async () => {
    getAll.mockResolvedValue({ accounts: [ts3], total: 1 })
    renderSwitcher()
    fireEvent.click(await screen.findByRole('button', { name: '目前帳號：PeterT' }))
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增帳號或世界' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/game-accounts/new')
  })

  it('offers 新增遊戲帳號 when there is no account yet', async () => {
    getAll.mockResolvedValue({ accounts: [], total: 0 })
    renderSwitcher()
    await waitFor(() => expect(getAll).toHaveBeenCalled())
    fireEvent.click(await screen.findByRole('button', { name: '＋ 新增遊戲帳號' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/game-accounts/new')
  })
})
