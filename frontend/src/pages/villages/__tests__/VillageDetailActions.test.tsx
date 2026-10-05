import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import i18n from '@/i18n/i18n'

const reload = vi.hoisted(() => vi.fn(async () => undefined))
vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({ reload }),
}))
const villageApi = vi.hoisted(() => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(async () => undefined),
}))
vi.mock('@/services/villageApi', () => ({ villageApi }))
vi.mock('@/services/syncApi', () => ({
  syncApi: { getLastSync: vi.fn(async () => null), getStats: vi.fn(async () => null) },
}))

import VillageDetailPage from '../VillageDetailPage'

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={['/villages/v-2']}>
      <Routes>
        <Route path="/villages/:villageId" element={<VillageDetailPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  )

describe('village detail: edit and delete moved here from the list', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    villageApi.delete.mockClear()
    reload.mockClear()
    villageApi.getById.mockResolvedValue({
      village_id: 'v-2',
      account_id: 'acc-ts3',
      name: '二村',
      coordinate_x: 12,
      coordinate_y: -1,
      population: 540,
      village_type: null,
      is_capital: false,
      role: null,
      crop_net_per_hour: -320,
      last_updated: null,
      created_at: '2026-10-01T00:00:00',
      buildings: [],
      troops: [],
    })
  })

  it('opens the edit form with the village filled in', async () => {
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: '編輯' }))
    expect(await screen.findByDisplayValue('二村')).toBeInTheDocument()
  })

  it('deletes after confirming, refreshes the switcher counts and goes back to the list', async () => {
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: '刪除' }))
    expect(screen.getByText('確定要刪除此村莊嗎？此操作無法復原。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
    await waitFor(() => expect(villageApi.delete).toHaveBeenCalledWith('v-2'))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/villages'))
    expect(reload).toHaveBeenCalled()
  })
})
