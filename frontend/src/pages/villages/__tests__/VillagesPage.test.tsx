import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { makeAccount } from '@/test/accountFixtures'
import type { GameAccount, Village, VillageListResponse } from '@/types/game'

const authApi = vi.hoisted(() => ({
  isAuthenticated: vi.fn(() => true),
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))
// 假後端：帳號只回啟用中的（跟 getAll(false) 一樣）；村莊照帳號分開
const db = vi.hoisted(() => ({
  accounts: [] as GameAccount[],
  villages: {} as Record<string, VillageListResponse>,
}))
const gameAccountApi = vi.hoisted(() => ({
  getAll: vi.fn(async () => {
    const accounts = db.accounts.filter((a) => a.is_active)
    return { accounts, total: accounts.length }
  }),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))
const villageApi = vi.hoisted(() => ({
  getAll: vi.fn(async (accountId?: string) => {
    return db.villages[accountId ?? ''] ?? { villages: [], total: 0, last_pasted_at: null }
  }),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))
vi.mock('@/services/authApi', () => ({ default: authApi }))
vi.mock('@/services/gameAccountApi', () => ({ gameAccountApi }))
vi.mock('@/services/villageApi', () => ({ villageApi }))
vi.mock('@/services/gameWorldApi', () => ({
  gameWorldApi: { getAll: vi.fn(async () => ({ worlds: [], total: 0 })), update: vi.fn() },
}))
vi.mock('@/services/extensionBridge', () => ({
  shareLoginWithExtension: vi.fn(async () => undefined),
  clearExtensionLogin: vi.fn(async () => undefined),
  sendSelectedAccountToExtension: vi.fn(async () => 0),
}))

import App from '@/App'

/** 後端回的時間是沒有時區標記的 UTC */
const utcAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60000).toISOString().replace('Z', '').slice(0, 19)

function village(overrides: Partial<Village>): Village {
  return {
    village_id: 'v-1',
    account_id: 'acc-ts3',
    name: '主村',
    coordinate_x: 10,
    coordinate_y: -3,
    population: 812,
    village_type: null,
    is_capital: false,
    role: null,
    crop_net_per_hour: 1240,
    last_updated: null,
    created_at: '2026-10-01T00:00:00',
    ...overrides,
  }
}

const TS3_VILLAGES: Village[] = [
  village({ village_id: 'v-main', name: '主村', is_capital: true }),
  village({
    village_id: 'v-2',
    name: '二村',
    coordinate_x: 12,
    coordinate_y: -1,
    population: 540,
    crop_net_per_hour: -320,
  }),
  village({ village_id: 'v-3', name: '三村', coordinate_x: 7, coordinate_y: 2, population: 433, crop_net_per_hour: 2100 }),
  village({ village_id: 'v-new', name: '新村', coordinate_x: 15, coordinate_y: 4, population: 62, crop_net_per_hour: null }),
]

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/villages']}>
      <App />
    </MemoryRouter>
  )

const rows = () => screen.getAllByTestId('village-row')

describe('village list (P0-02 slice 2)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    localStorage.clear()
    villageApi.getAll.mockClear()
    authApi.getMe.mockResolvedValue({ user_id: 'user-1', username: 'peter' })
    db.accounts = [
      makeAccount({ village_count: 4 }),
      makeAccount({ account_id: 'acc-ts5', server_name: 'ts5', tribe: 'teutons', village_count: 1 }),
      makeAccount({ account_id: 'acc-old', player_name: '舊號', village_count: 7, is_active: false }),
    ]
    db.villages = {
      'acc-ts3': { villages: TS3_VILLAGES, total: 4, last_pasted_at: utcAgo(125) },
      'acc-ts5': {
        villages: [village({ village_id: 'v-t5', account_id: 'acc-ts5', name: 'T5 主村', coordinate_x: 0, coordinate_y: 0 })],
        total: 1,
        last_pasted_at: utcAgo(60 * 30),
      },
      'acc-old': {
        villages: [village({ village_id: 'v-old', account_id: 'acc-old', name: '停用帳號的村' })],
        total: 1,
        last_pasted_at: null,
      },
    }
  })

  it('shows each village as name + (x|y), then population and crop per hour', async () => {
    renderPage()
    await waitFor(() => expect(rows()).toHaveLength(4))
    expect(screen.getByRole('heading', { name: '村莊' })).toBeInTheDocument()
    expect(screen.getByTestId('village-count')).toHaveTextContent('4 村')

    const main = rows()[0]
    expect(main).toHaveTextContent('主村')
    expect(main).toHaveTextContent('(10|−3)')
    expect(within(main).getByText('首都')).toBeInTheDocument()
    expect(main).toHaveTextContent('人口 812 · 糧 +1,240/h')
    // 整列可以點進村莊詳情
    expect(within(main).getByRole('link', { name: '打開 主村 的詳情' })).toHaveAttribute('href', '/villages/v-main')
  })

  it('marks a negative crop change in red, and only that one', async () => {
    renderPage()
    await waitFor(() => expect(rows()).toHaveLength(4))
    const second = rows().find((row) => row.textContent?.includes('二村'))!
    const crop = within(second).getByTestId('village-crop')
    expect(crop).toHaveTextContent('糧 −320/h')
    expect(crop).toHaveAttribute('data-negative', 'true')
    expect(crop).toHaveClass('text-red-600')

    const others = rows().filter((row) => row !== second)
    for (const row of others) {
      const cell = within(row).getByTestId('village-crop')
      expect(cell).toHaveAttribute('data-negative', 'false')
      expect(cell).not.toHaveClass('text-red-600')
    }
  })

  it('says 還沒有資料 instead of 0 when the crop was never uploaded', async () => {
    renderPage()
    await waitFor(() => expect(rows()).toHaveLength(4))
    const fresh = rows().find((row) => row.textContent?.includes('新村'))!
    expect(fresh).toHaveTextContent('人口 62 · 糧 還沒有資料')
  })

  it('sorts by population by default, and by crop or name on request', async () => {
    renderPage()
    await waitFor(() => expect(rows()).toHaveLength(4))
    const names = () => rows().map((row) => row.querySelector('.font-semibold')?.textContent)
    expect(names()).toEqual(['主村', '二村', '三村', '新村'])

    const sort = screen.getByRole('combobox', { name: '排序：' })
    expect(sort).toHaveValue('population')
    fireEvent.change(sort, { target: { value: 'crop' } })
    expect(names()).toEqual(['三村', '主村', '二村', '新村'])
  })

  it.each([
    [0, '資料是剛剛貼上的。'],
    [5, '資料是 5 分鐘前貼上的。'],
    [125, '資料是 2 小時前貼上的。'],
    [60 * 30, '資料是昨天貼上的。'],
    [60 * 24 * 3 + 5, '資料是 3 天前貼上的。'],
  ])('tells how long ago the data was pasted (%i min)', async (minutes, text) => {
    db.villages['acc-ts3'].last_pasted_at = utcAgo(minutes)
    renderPage()
    const notice = await screen.findByTestId('villages-paste-notice')
    expect(notice).toHaveTextContent(text)
    expect(notice).toHaveTextContent('要更新請到遊戲的村莊總覽，用擴充上傳。')
  })

  it('says nothing was pasted yet when the villages were only entered by hand', async () => {
    db.villages['acc-ts3'].last_pasted_at = null
    renderPage()
    const notice = await screen.findByTestId('villages-paste-notice')
    expect(notice).toHaveTextContent('這個帳號還沒有貼上過資料，下面是手動輸入的。')
  })

  it('shows an empty state (no notice, no list) when the account has no villages', async () => {
    db.villages['acc-ts3'] = { villages: [], total: 0, last_pasted_at: null }
    renderPage()
    const empty = await screen.findByTestId('villages-empty')
    expect(empty).toHaveTextContent('這個帳號還沒有村莊資料')
    expect(empty).toHaveTextContent('到遊戲的村莊總覽，用擴充上傳；也可以手動新增。')
    expect(within(empty).getByRole('button', { name: '＋ 手動新增村莊' })).toBeInTheDocument()
    expect(screen.queryByTestId('villages-paste-notice')).not.toBeInTheDocument()
    expect(screen.queryByTestId('village-list')).not.toBeInTheDocument()
    expect(screen.getByTestId('village-count')).toHaveTextContent('0 村')
    // 沒東西可排就不放排序
    expect(screen.queryByRole('combobox', { name: '排序：' })).not.toBeInTheDocument()
  })

  it('only asks for the selected active account, and follows the switcher', async () => {
    renderPage()
    await waitFor(() => expect(rows()).toHaveLength(4))
    expect(villageApi.getAll).toHaveBeenCalledWith('acc-ts3')
    // 從不拿全部村莊（不帶帳號）、也不碰停用的帳號
    expect(villageApi.getAll).not.toHaveBeenCalledWith(undefined)
    expect(villageApi.getAll).not.toHaveBeenCalledWith('acc-old')

    fireEvent.click(screen.getByRole('button', { name: '目前世界：ts3' }))
    const sheet = screen.getByRole('dialog', { name: '切換帳號和世界' })
    expect(sheet).not.toHaveTextContent('舊號')
    fireEvent.click(within(sheet).getByText(/^條頓/))

    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(villageApi.getAll).toHaveBeenLastCalledWith('acc-ts5')
    expect(rows()[0]).toHaveTextContent('T5 主村')
    expect(screen.queryByText('二村')).not.toBeInTheDocument()
    expect(screen.getByTestId('villages-paste-notice')).toHaveTextContent('資料是昨天貼上的。')
  })

  it('a slow answer for the previous account never replaces the current one', async () => {
    let releaseTs3: (value: VillageListResponse) => void = () => undefined
    villageApi.getAll.mockImplementationOnce(
      () => new Promise<VillageListResponse>((resolve) => { releaseTs3 = resolve })
    )
    renderPage()
    await waitFor(() => expect(villageApi.getAll).toHaveBeenCalledWith('acc-ts3'))
    fireEvent.click(screen.getByRole('button', { name: '目前世界：ts3' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByText(/^條頓/))
    await waitFor(() => expect(rows()).toHaveLength(1))

    releaseTs3(db.villages['acc-ts3'])
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('T5 主村')
  })
})
