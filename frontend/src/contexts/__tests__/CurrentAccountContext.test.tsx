import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { makeAccount } from '@/test/accountFixtures'

const auth = vi.hoisted(() => ({
  state: { user: { user_id: 'user-1' } as { user_id: string } | null, isAuthenticated: true },
}))
const getAll = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.state }))
const resend = vi.hoisted(() => vi.fn())
vi.mock('@/services/gameAccountApi', () => ({ gameAccountApi: { getAll } }))
vi.mock('@/services/extensionBridge', () => ({ resendAccountsToExtension: resend }))

import { CurrentAccountProvider, useCurrentAccount } from '../CurrentAccountContext'
import { currentAccountStorageKey } from '@/services/currentAccountStore'

const ts3 = makeAccount()
const ts5 = makeAccount({ account_id: 'acc-ts5', server_name: 'ts5', tribe: 'teutons' })

let ctx: ReturnType<typeof useCurrentAccount>
function Probe() {
  ctx = useCurrentAccount()
  return <p data-testid="current">{ctx.currentAccount?.account_id ?? 'none'}</p>
}

const renderProvider = () =>
  render(
    <CurrentAccountProvider>
      <Probe />
    </CurrentAccountProvider>
  )

describe('CurrentAccountContext', () => {
  beforeEach(() => {
    localStorage.clear()
    getAll.mockReset()
    resend.mockReset().mockResolvedValue(0)
    auth.state = { user: { user_id: 'user-1' }, isAuthenticated: true }
  })

  it('defaults to the first active account and only lists active ones', async () => {
    getAll.mockResolvedValue({ accounts: [ts3, ts5], total: 2 })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('acc-ts3'))
    expect(getAll).toHaveBeenCalledWith(false)
  })

  it('remembers the selection per site user', async () => {
    getAll.mockResolvedValue({ accounts: [ts3, ts5], total: 2 })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('acc-ts3'))
    act(() => ctx.selectAccount('acc-ts5'))
    expect(screen.getByTestId('current')).toHaveTextContent('acc-ts5')
    expect(localStorage.getItem(currentAccountStorageKey('user-1'))).toBe('acc-ts5')
    expect(localStorage.getItem(currentAccountStorageKey('user-2'))).toBeNull()
  })

  it('tells the extension when the site selection changes (its 「存到」 default follows)', async () => {
    getAll.mockResolvedValue({ accounts: [ts3, ts5], total: 2 })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('acc-ts3'))
    expect(resend).not.toHaveBeenCalled()
    act(() => ctx.selectAccount('acc-ts5'))
    expect(resend).toHaveBeenCalledTimes(1)
  })

  it('restores the remembered account on the next visit', async () => {
    localStorage.setItem(currentAccountStorageKey('user-1'), 'acc-ts5')
    getAll.mockResolvedValue({ accounts: [ts3, ts5], total: 2 })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('acc-ts5'))
  })

  it('falls back to the first account when the remembered one is gone', async () => {
    localStorage.setItem(currentAccountStorageKey('user-1'), 'deleted-account')
    getAll.mockResolvedValue({ accounts: [ts5], total: 1 })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('acc-ts5'))
  })

  it('picks up a new account after reload()', async () => {
    getAll.mockResolvedValueOnce({ accounts: [], total: 0 })
    renderProvider()
    await waitFor(() => expect(ctx.loading).toBe(false))
    expect(screen.getByTestId('current')).toHaveTextContent('none')
    getAll.mockResolvedValueOnce({ accounts: [ts3], total: 1 })
    await act(() => ctx.reload())
    expect(screen.getByTestId('current')).toHaveTextContent('acc-ts3')
  })

  it('does not load anything when logged out', async () => {
    auth.state = { user: null, isAuthenticated: false }
    renderProvider()
    await waitFor(() => expect(ctx.loading).toBe(false))
    expect(getAll).not.toHaveBeenCalled()
    expect(screen.getByTestId('current')).toHaveTextContent('none')
  })
})
