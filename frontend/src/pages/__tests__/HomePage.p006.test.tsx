import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import IncomingListPage from '../calculator/IncomingListPage'

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

  it('shows the latest upload as one line: 最近：類型 · 摘要 · relative time', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('recent-uploads')).toBeInTheDocument()
    const row = await screen.findByTestId('recent-upload-row')
    expect(row).toHaveTextContent('最近：')
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

  it('shows ＋ 貼上 only after the paste card scrolled off the top, and always leaves room for it at the bottom', async () => {
    const observers: { cb: IntersectionObserverCallback; el?: Element }[] = []
    class FakeObserver {
      cb: IntersectionObserverCallback
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb
        observers.push({ cb })
      }
      observe(el: Element) {
        observers[observers.length - 1].el = el
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return []
      }
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    try {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>,
      )
      await screen.findByTestId('home-normal')
      // 頁面底部永遠留出按鈕高度 + 16px，捲到底時最後的內容不會被蓋住
      expect(screen.getByTestId('home-root').className).toContain('pb-[calc(48px+16px)]')

      const obs = observers.find((o) => o.el?.id === 'paste')!
      expect(obs).toBeTruthy()
      const fire = (isIntersecting: boolean, top: number) =>
        act(() =>
          obs.cb(
            [{ isIntersecting, target: obs.el!, boundingClientRect: { top, bottom: top + 400 } } as unknown as IntersectionObserverEntry],
            {} as IntersectionObserver,
          ),
        )

      // 貼上卡在畫面裡：不顯示
      fire(true, 300)
      expect(screen.queryByTestId('paste-fab')).not.toBeInTheDocument()
      // 貼上卡還在下面（往下捲就到）：不顯示，免得蓋住來襲／開村卡
      fire(false, 900)
      expect(screen.queryByTestId('paste-fab')).not.toBeInTheDocument()
      // 貼上卡已捲到上方看不到：顯示，點了回到貼上框
      fire(false, -900)
      expect(screen.getByTestId('paste-fab')).toBeInTheDocument()
      fire(true, 100)
      expect(screen.queryByTestId('paste-fab')).not.toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('empty state only promises what exists: rally point → countdown; step 3 opens CP 與開村', async () => {
    syncApi.getLogs.mockResolvedValueOnce({ logs: [], total: 0 })
    villageApi.getAll.mockResolvedValueOnce({ villages: [], total: 0 })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    await screen.findByTestId('home-empty')
    expect(screen.getByText('貼一次集結點，就會開始幫你算來襲倒數。')).toBeInTheDocument()
    const step3 = screen.getByTestId('home-step3-cp')
    expect(step3).toHaveAttribute('href', '/calculator/passive-cp')
    expect(step3).toHaveTextContent('到『CP 與開村』填一次目前 CP')
    expect(step3).toHaveTextContent('首頁就會顯示開村倒數')
    expect(screen.queryByTestId('paste-fab')).not.toBeInTheDocument()
  })

  it('incoming list page filters by village and persists choice', async () => {
    render(
      <MemoryRouter>
        <IncomingListPage />
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
