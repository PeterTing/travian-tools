import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
}))
const resend = vi.hoisted(() => vi.fn())

vi.mock('../api', () => ({ default: api }))
vi.mock('../extensionBridge', () => ({ resendAccountsToExtension: resend }))

import { gameAccountApi } from '../gameAccountApi'

const account = { account_id: 'a1', player_name: 'PeterT', server_name: 'ts3' }

describe('gameAccountApi → extension 「存到」 list', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset())
    resend.mockReset()
    resend.mockResolvedValue(1)
  })

  it('resends the account list after adding an account', async () => {
    api.post.mockResolvedValue({ data: account })
    await gameAccountApi.create({ server_url: 'https://ts3.x1.asia.travian.com' } as never)
    expect(api.post).toHaveBeenCalledWith('/game-accounts', expect.anything())
    expect(resend).toHaveBeenCalledTimes(1)
  })

  it('resends the account list after editing an account', async () => {
    api.put.mockResolvedValue({ data: { ...account, player_name: 'Peter' } })
    await gameAccountApi.update('a1', { player_name: 'Peter' } as never)
    expect(resend).toHaveBeenCalledTimes(1)
  })

  it('resends the account list after deleting an account', async () => {
    api.delete.mockResolvedValue({})
    await gameAccountApi.delete('a1')
    expect(api.delete).toHaveBeenCalledWith('/game-accounts/a1')
    expect(resend).toHaveBeenCalledTimes(1)
  })

  it('does not resend when the change failed', async () => {
    api.post.mockRejectedValue(new Error('400'))
    api.put.mockRejectedValue(new Error('404'))
    api.delete.mockRejectedValue(new Error('404'))
    await expect(gameAccountApi.create({} as never)).rejects.toThrow()
    await expect(gameAccountApi.update('a1', {} as never)).rejects.toThrow()
    await expect(gameAccountApi.delete('a1')).rejects.toThrow()
    expect(resend).not.toHaveBeenCalled()
  })

  it('does not resend on reads', async () => {
    api.get.mockResolvedValue({ data: { accounts: [account], total: 1 } })
    await gameAccountApi.getAll()
    await gameAccountApi.getById('a1')
    expect(resend).not.toHaveBeenCalled()
  })

  it('a failing extension handover never breaks the account change', async () => {
    resend.mockRejectedValue(new Error('extension gone'))
    api.delete.mockResolvedValue({})
    await expect(gameAccountApi.delete('a1')).resolves.toBeUndefined()
  })
})
