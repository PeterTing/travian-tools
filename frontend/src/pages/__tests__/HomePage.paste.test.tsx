import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'

const pasteApi = vi.hoisted(() => ({
  preview: vi.fn(),
  listMovements: vi.fn().mockResolvedValue({ movements: [] }),
}))
vi.mock('@/services/pasteApi', () => ({ pasteApi }))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({
    currentAccount: {
      account_id: 'acc-1',
      player_name: 'Tester',
      server_name: 'ts11',
      server_url: 'https://ts11.x1.international.travian.com',
    },
    loading: false,
  }),
}))

import HomePage from '../HomePage'

describe('HomePage paste empty + banner', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    pasteApi.preview.mockReset()
    pasteApi.listMovements.mockReset().mockResolvedValue({ movements: [] })
    window.history.replaceState({}, '', '/?saved=' + encodeURIComponent('村莊總覽同步成功'))
  })

  it('shows green banner from ?saved= then clears it when a new parse errors', async () => {
    pasteApi.preview.mockResolvedValueOnce({
      ok: false,
      page_type: 'rally_point',
      data: { garrison_own: [{ count: 1 }], incoming: [] },
      warnings: [],
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByTestId('saved-banner')).toHaveTextContent('村莊總覽同步成功')

    fireEvent.change(screen.getByTestId('paste-textarea'), {
      target: { value: '村內部隊\n自軍\n士兵 1' },
    })
    fireEvent.click(screen.getByTestId('parse-paste-btn'))

    await waitFor(() => expect(screen.getByTestId('parse-error')).toBeInTheDocument())
    expect(screen.queryByTestId('saved-banner')).not.toBeInTheDocument()
    expect(screen.getByTestId('parse-error').textContent).toMatch(/集結點/)
    expect(screen.getByTestId('parse-error').textContent).toMatch(/Ctrl\+U/)
  })
})
