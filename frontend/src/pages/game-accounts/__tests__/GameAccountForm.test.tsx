import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import { makeAccount } from '@/test/accountFixtures'

const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))
vi.mock('@/services/gameAccountApi', () => ({ gameAccountApi: api }))
vi.mock('@/lib/accountDisplay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/accountDisplay')>()),
  browserTimeZone: () => 'Asia/Taipei',
}))

import GameAccountForm from '../GameAccountForm'

const fillRequired = () => {
  fireEvent.change(screen.getByLabelText(/伺服器網址/), {
    target: { value: 'https://ts3.x1.international.travian.com' },
  })
}

describe('GameAccountForm time display', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    api.create.mockReset().mockResolvedValue(makeAccount())
    api.update.mockReset().mockResolvedValue(makeAccount())
  })

  it('offers ask-later, server time and my local time with the browser zone', () => {
    render(<GameAccountForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    const select = screen.getByLabelText('遊戲裡顯示的時間') as HTMLSelectElement
    expect(select.value).toBe('')
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      '第一次貼上時再問',
      '伺服器時間',
      '我的本地時間（Asia/Taipei）',
    ])
  })

  it('sends null when left on 第一次貼上時再問', async () => {
    const onSuccess = vi.fn()
    render(<GameAccountForm onSuccess={onSuccess} onCancel={vi.fn()} />)
    fillRequired()
    fireEvent.click(screen.getByRole('button', { name: '儲存' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ time_display: null, local_timezone: null })
    )
  })

  it('sends the browser time zone with 我的本地時間', async () => {
    render(<GameAccountForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fillRequired()
    fireEvent.change(screen.getByLabelText('遊戲裡顯示的時間'), { target: { value: 'local' } })
    fireEvent.click(screen.getByRole('button', { name: '儲存' }))
    await waitFor(() => expect(api.create).toHaveBeenCalled())
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ time_display: 'local', local_timezone: 'Asia/Taipei' })
    )
  })

  it('keeps the saved zone and can switch to server time when editing', async () => {
    const account = makeAccount({ time_display: 'local', local_timezone: 'Europe/Berlin' })
    render(<GameAccountForm account={account} onSuccess={vi.fn()} onCancel={vi.fn()} />)
    const select = screen.getByLabelText('遊戲裡顯示的時間') as HTMLSelectElement
    expect(select.value).toBe('local')
    expect(select.selectedOptions[0].textContent).toBe('我的本地時間（Europe/Berlin）')
    fireEvent.change(select, { target: { value: 'server' } })
    fireEvent.click(screen.getByRole('button', { name: '儲存' }))
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    expect(api.update).toHaveBeenCalledWith(
      'acc-ts3',
      expect.objectContaining({ time_display: 'server', local_timezone: null })
    )
  })

  it('never asks for a game password', () => {
    const { container } = render(<GameAccountForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(container.querySelector('input[type="password"]')).toBeNull()
    expect(screen.queryByText(/密碼/)).toBeNull()
  })
})
