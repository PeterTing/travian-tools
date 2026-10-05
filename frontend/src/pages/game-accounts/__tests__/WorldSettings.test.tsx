import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'

const api = vi.hoisted(() => ({ getAll: vi.fn(), update: vi.fn() }))
vi.mock('@/services/gameWorldApi', () => ({ gameWorldApi: api }))

import WorldSettings from '../WorldSettings'

const ts3 = {
  world_id: 'w-ts3',
  server_url: 'https://ts3.x1.asia.travian.com',
  utc_offset: null,
  account_count: 2,
}

describe('WorldSettings (UTC offset on the world)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    api.getAll.mockReset().mockResolvedValue({ worlds: [ts3], total: 1 })
    api.update.mockReset()
  })

  it('shows an unset offset as 照伺服器時間顯示，不換算', async () => {
    render(<WorldSettings />)
    const select = (await screen.findByLabelText('伺服器時區（UTC 時差）')) as HTMLSelectElement
    expect(select.value).toBe('')
    expect(select.selectedOptions[0].textContent).toBe('未設定（照伺服器時間顯示，不換算）')
    expect(screen.getByText('ts3 亞洲服')).toBeInTheDocument()
    expect(screen.getByText(/2 個帳號/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '儲存' })).toBeDisabled()
  })

  it('saves a manual offset in minutes and can clear it again', async () => {
    api.update.mockResolvedValueOnce({ ...ts3, utc_offset: 60 })
    render(<WorldSettings />)
    const select = await screen.findByLabelText('伺服器時區（UTC 時差）')
    fireEvent.change(select, { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: '儲存' }))
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('w-ts3', { utc_offset: 60 }))
    expect(await screen.findByText('已儲存')).toBeInTheDocument()

    api.update.mockResolvedValueOnce({ ...ts3, utc_offset: null })
    fireEvent.change(select, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '儲存' }))
    await waitFor(() => expect(api.update).toHaveBeenLastCalledWith('w-ts3', { utc_offset: null }))
  })

  it('lists offsets like UTC+1 and UTC+5:45', async () => {
    render(<WorldSettings />)
    const select = await screen.findByLabelText('伺服器時區（UTC 時差）')
    const options = within(select).getAllByRole('option').map((o) => o.textContent)
    expect(options).toContain('UTC+1')
    expect(options).toContain('UTC+5:45')
    expect(options).toContain('UTC−3:30')
  })

  it('explains what to do before any account exists', async () => {
    api.getAll.mockResolvedValue({ worlds: [], total: 0 })
    render(<WorldSettings />)
    expect(await screen.findByText('新增遊戲帳號後，這裡會出現它所在的世界。')).toBeInTheDocument()
  })
})
