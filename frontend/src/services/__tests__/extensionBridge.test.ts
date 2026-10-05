import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()
const get = vi.fn()
vi.mock('../api', () => ({
  default: {
    post: (...args: unknown[]) => post(...args),
    get: (...args: unknown[]) => get(...args),
  },
}))

import {
  EXTENSION_MESSAGE,
  clearExtensionLogin,
  getExtensionIds,
  resendAccountsToExtension,
  sendSelectedAccountToExtension,
  shareLoginWithExtension,
} from '../extensionBridge'
import { currentAccountStorageKey } from '../currentAccountStore'

const EXT_ID = 'abcdefghijklmnopabcdefghijklmnop'

type Callback = (response?: { success?: boolean }) => void

function installChrome(handler: (id: string, message: { type: string }) => { success?: boolean } | undefined) {
  const runtime = {
    lastError: undefined as { message?: string } | undefined,
    sendMessage: vi.fn((id: string, message: { type: string }, cb: Callback) => {
      const response = handler(id, message)
      runtime.lastError = response === undefined ? { message: 'not installed' } : undefined
      cb(response)
    }),
  }
  ;(globalThis as { chrome?: unknown }).chrome = { runtime }
  return runtime
}

describe('extensionBridge', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_EXTENSION_ID', EXT_ID)
    post.mockReset()
    get.mockReset()
    get.mockResolvedValue({
      data: {
        accounts: [
          { account_id: 'a1', player_name: 'PeterT', server_name: 'ts3', server_url: 'https://ts3.example' },
          { account_id: 'a2', player_name: null, server_name: null, server_url: 'https://ts5.example' },
        ],
        total: 2,
      },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete (globalThis as { chrome?: unknown }).chrome
  })

  it('parses only valid extension ids', () => {
    expect(getExtensionIds(` ${EXT_ID}, bad-id ,`)).toEqual([EXT_ID])
    expect(getExtensionIds('')).toEqual([])
    // 沒傳參數時讀 VITE_EXTENSION_ID
    expect(getExtensionIds()).toEqual([EXT_ID])
  })

  it('does nothing without the chrome runtime or an extension id', async () => {
    expect(await shareLoginWithExtension()).toBe(0)
    vi.stubEnv('VITE_EXTENSION_ID', '')
    const runtime = installChrome(() => ({ success: true }))
    expect(await shareLoginWithExtension()).toBe(0)
    expect(runtime.sendMessage).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
  })

  it('does not mint a token when the extension is not installed', async () => {
    installChrome(() => undefined)
    expect(await shareLoginWithExtension()).toBe(0)
    expect(post).not.toHaveBeenCalled()
  })

  it('mints a short-lived token and hands it (with expiry) to the extension', async () => {
    post.mockResolvedValue({
      data: {
        access_token: 'ext.jwt.token',
        token_type: 'bearer',
        expires_at: '2026-10-05T11:00:00Z',
        expires_in: 28800,
        user: { user_id: 'u1', username: 'petert', email: 'p@example.com' },
      },
    })
    const runtime = installChrome(() => ({ success: true }))

    expect(await shareLoginWithExtension()).toBe(1)
    expect(post).toHaveBeenCalledWith('/auth/extension-token')
    const messages = runtime.sendMessage.mock.calls.map((call) => call[1])
    expect(messages[0]).toEqual({ type: EXTENSION_MESSAGE.PING })
    expect(messages[1]).toEqual({
      type: EXTENSION_MESSAGE.SET,
      access_token: 'ext.jwt.token',
      expires_at: '2026-10-05T11:00:00Z',
      user: { username: 'petert', email: 'p@example.com' },
      accounts: [
        { account_id: 'a1', label: 'PeterT · ts3' },
        { account_id: 'a2', label: '未命名 · https://ts5.example' },
      ],
      // 沒有記住的選擇時，和頂部切換一樣預設第一個
      selected_account_id: 'a1',
    })
  })

  it('defaults 「存到」 to the account currently selected on the site', async () => {
    localStorage.setItem(currentAccountStorageKey('u1'), 'a2')
    post.mockResolvedValue({
      data: {
        access_token: 'ext.jwt.token',
        token_type: 'bearer',
        expires_at: '2026-10-05T11:00:00Z',
        expires_in: 28800,
        user: { user_id: 'u1', username: 'petert', email: 'p@example.com' },
      },
    })
    const runtime = installChrome(() => ({ success: true }))
    expect(await shareLoginWithExtension()).toBe(1)
    expect(runtime.sendMessage.mock.calls[1][1]).toMatchObject({ selected_account_id: 'a2' })
    // 只讀不寫：交給擴充不會改到網站的選擇
    expect(localStorage.getItem(currentAccountStorageKey('u1'))).toBe('a2')
  })

  it('falls back to the first account when the remembered one is gone', async () => {
    localStorage.setItem(currentAccountStorageKey('u1'), 'deleted')
    post.mockResolvedValue({
      data: {
        access_token: 'ext.jwt.token',
        token_type: 'bearer',
        expires_at: '2026-10-05T11:00:00Z',
        expires_in: 28800,
        user: { user_id: 'u1', username: 'petert', email: 'p@example.com' },
      },
    })
    const runtime = installChrome(() => ({ success: true }))
    await shareLoginWithExtension()
    expect(runtime.sendMessage.mock.calls[1][1]).toMatchObject({ selected_account_id: 'a1' })
  })

  it('still hands over the token when the account list cannot be loaded', async () => {
    get.mockRejectedValue(new Error('500'))
    post.mockResolvedValue({
      data: {
        access_token: 't.t.t',
        token_type: 'bearer',
        expires_at: '2026-10-05T11:00:00Z',
        expires_in: 60,
        user: { user_id: 'u1', username: 'petert', email: 'p@example.com' },
      },
    })
    const runtime = installChrome(() => ({ success: true }))
    expect(await shareLoginWithExtension()).toBe(1)
    expect(runtime.sendMessage.mock.calls[1][1]).toMatchObject({ accounts: [], selected_account_id: null })
  })

  it('swallows backend errors so site login still works', async () => {
    post.mockRejectedValue(new Error('500'))
    installChrome(() => ({ success: true }))
    expect(await shareLoginWithExtension()).toBe(0)
  })

  it('tells the extension to clear its credential on logout', async () => {
    const runtime = installChrome(() => ({ success: true }))
    await clearExtensionLogin()
    expect(runtime.sendMessage).toHaveBeenCalledWith(
      EXT_ID,
      { type: EXTENSION_MESSAGE.CLEAR },
      expect.any(Function)
    )
  })

  it('resendAccountsToExtension hands over the fresh account list', async () => {
    post.mockResolvedValue({
      data: {
        access_token: 'ext.jwt.token2',
        token_type: 'bearer',
        expires_at: '2026-10-05T12:00:00Z',
        expires_in: 28800,
        user: { user_id: 'u1', username: 'petert', email: 'p@example.com' },
      },
    })
    get.mockResolvedValue({
      data: {
        accounts: [{ account_id: 'a9', player_name: 'New', server_name: 'ts9', server_url: 'x' }],
        total: 1,
      },
    })
    const runtime = installChrome(() => ({ success: true }))
    expect(await resendAccountsToExtension()).toBe(1)
    expect(runtime.sendMessage.mock.calls[1][1]).toMatchObject({
      type: EXTENSION_MESSAGE.SET,
      accounts: [{ account_id: 'a9', label: 'New · ts9' }],
    })
  })

  it('switching accounts only sends the selected account id: no new token, no API call', async () => {
    const runtime = installChrome(() => ({ success: true }))
    expect(await sendSelectedAccountToExtension('a2')).toBe(1)
    expect(post).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
    expect(runtime.sendMessage).toHaveBeenCalledTimes(1)
    const message = runtime.sendMessage.mock.calls[0][1] as Record<string, unknown>
    expect(message).toEqual({ type: EXTENSION_MESSAGE.SELECT, selected_account_id: 'a2' })
    expect(message).not.toHaveProperty('access_token')
  })

  it('switching accounts does nothing without the extension', async () => {
    expect(await sendSelectedAccountToExtension('a2')).toBe(0)
    const runtime = installChrome(() => undefined)
    expect(await sendSelectedAccountToExtension('a2')).toBe(0)
    expect(runtime.sendMessage).toHaveBeenCalledTimes(1)
    expect(post).not.toHaveBeenCalled()
  })
})
