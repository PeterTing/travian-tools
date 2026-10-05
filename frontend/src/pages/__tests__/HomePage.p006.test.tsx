import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'

const pasteApi = vi.hoisted(() => ({
  preview: vi.fn(),
  listMovements: vi.fn().mockResolvedValue({ movements: [] }),
}))
vi.mock('@/services/pasteApi', () => ({ pasteApi }))

const syncApi = vi.hoisted(() => ({
  getLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
}))
vi.mock('@/services/syncApi', () => ({ syncApi }))

const villageApi = vi.hoisted(() => ({
  getAll: vi.fn().mockResolvedValue({
    villages: [
      {
        village_id: 'v-main',
        name: '主村',
        coordinate_x: 10,
        coordinate_y: -3,
      },
      {
        village_id: 'v-2',
        name: '二村',
        coordinate_x: 12,
        coordinate_y: -1,
      },
    ],
    total: 2,
  }),
}))
vi.mock('@/services/villageApi', () => ({ villageApi }))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({
    currentAccount: {
      account_id: 'acc-1',
      world_id: 'w-1',
      player_name: 'Tester',
      server_name: 'ts11',
      server_url: 'https://ts11.x1.international.travian.com',
    },
    loading: false,
  }),
}))

import HomePage from '../HomePage'

describe('HomePage P0-06 remaining', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    localStorage.clear()
    pasteApi.listMovements.mockReset().mockResolvedValue({ movements: [] })
    syncApi.getLogs.mockReset().mockResolvedValue({
      logs: [
        {
          log_id: 'l1',
          user_id: 'u1',
          sync_type: 'rally_point',
          account_id: 'acc-1',
          village_id: 'v-main',
          status: 'success',
          items_synced: 3,
          items_created: 3,
          items_updated: 0,
          conflicts_resolved: 0,
          message: null,
          error_details: null,
          started_at: new Date(Date.now() - 3 * 60_000).toISOString(),
          completed_at: new Date(Date.now() - 3 * 60_000).toISOString(),
        },
      ],
      total: 1,
    })
  })

  it('shows 最近上傳 as 類型 · 摘要 + relative time', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('recent-uploads')).toBeInTheDocument()
    const row = await screen.findByTestId('recent-upload-row')
    expect(row).toHaveTextContent('集結點 · 3 筆來襲')
    expect(row).toHaveTextContent('3 分鐘前')
  })

  it('shows empty state when no uploads', async () => {
    syncApi.getLogs.mockResolvedValueOnce({ logs: [], total: 0 })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('recent-uploads-empty')).toHaveTextContent(
      '還沒有上傳紀錄',
    )
  })

  it('filters incoming by village and persists choice', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    const filter = await screen.findByTestId('incoming-village-filter')
    const select = filter.querySelector('select')!
    fireEvent.change(select, { target: { value: 'v-2' } })
    await waitFor(() =>
      expect(pasteApi.listMovements).toHaveBeenCalledWith('acc-1', { villageId: 'v-2' }),
    )
    expect(localStorage.getItem('tt:incomingVillage:acc-1:w-1')).toBe('v-2')
  })
})
