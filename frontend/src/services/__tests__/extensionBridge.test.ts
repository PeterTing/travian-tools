import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()
vi.mock('../api', () => ({ default: { post: (...args: unknown[]) => post(...args) } }))

import {
  EXTENSION_MESSAGE,
  clearExtensionLogin,
  getExtensionIds,
  shareLoginWithExtension,
} from '../extensionBridge'

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
    vi.stubEnv('VITE_EXTENSION_ID', EXT_ID)
    post.mockReset()
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
    })
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
})
