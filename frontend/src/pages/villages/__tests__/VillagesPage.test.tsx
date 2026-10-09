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
  villages: {} as Record<string, Village[]>,
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
  // 跟後端一樣：清單的 oldest_pasted_at＝貼上過的村莊裡最舊的那個（沒貼上過的不算）
  getAll: vi.fn(async (accountId?: string): Promise<VillageListResponse> => {
    const villages = db.villages[accountId ?? ''] ?? []
    const times = villages
      .map((v) => v.last_pasted_at)
      .filter((t): t is string => !!t)
      .sort()
    return { villages, total: villages.length, oldest_pasted_at: times[0] ?? null }
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
const HOURS = 60

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
    last_pasted_at: utcAgo(2 * HOURS),
    last_updated: null,
    created_at: '2026-10-01T00:00:00',
    ...overrides,
  }
}

const ts3Villages = (): Village[] => [
  village({ village_id: 'v-main', name: '主村', is_capital: true, last_pasted_at: utcAgo(10) }),
  village({
    village_id: 'v-2',
    name: '二村',
    coordinate_x: 12,
    coordinate_y: -1,
    population: 540,
    crop_net_per_hour: -320,
    last_pasted_at: utcAgo(2 * HOURS + 5),
  }),
  village({
    village_id: 'v-3',
    name: '三村',
    coordinate_x: 7,
    coordinate_y: 2,
    population: 433,
    crop_net_per_hour: 2100,
    last_pasted_at: utcAgo(30),
  }),
  village({
    village_id: 'v-new',
    name: '新村',
    coordinate_x: 15,
    coordinate_y: 4,
    population: 62,
    crop_net_per_hour: null,
    last_pasted_at: null,
  }),
]

/** 把某個村莊的貼上時間改成 minutes 分鐘前 */
const pastedMinutesAgo = (villageId: string, minutes: number) => {
  const target = db.villages['acc-ts3'].find((v) => v.village_id === villageId)!
  target.last_pasted_at = utcAgo(minutes)
}

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
      'acc-ts3': ts3Villages(),
      'acc-ts5': [
        village({
          village_id: 'v-t5',
          account_id: 'acc-ts5',
          name: 'T5 主村',
          coordinate_x: 0,
          coordinate_y: 0,
          last_pasted_at: utcAgo(30 * HOURS),
        }),
      ],
      'acc-old': [village({ village_id: 'v-old', account_id: 'acc-old', name: '停用帳號的村' })],
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

  it('shows the ＋ 貼上 button (to the home paste box) and leaves FAB height + 16px at the bottom', async () => {
    renderPage()
    await waitFor(() => expect(rows()).toHaveLength(4))
    const fab = screen.getByTestId('paste-fab')
    expect(fab).toHaveTextContent('＋ 貼上')
    expect(fab).toHaveAttribute('href', '/#paste')
    expect(fab.className).toContain('lg:hidden')
    expect(screen.getByTestId('villages-root').className).toContain('pb-[calc(48px+16px)]')
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

  const notice = () => screen.findByTestId('villages-paste-notice')
  const HINT = '要更新請到首頁貼上多村總覽。'
  const OUTDATED = '數字可能已經不準。'

  it('words the notice by the OLDEST village (not the newest)', async () => {
    renderPage()
    // 主村 10 分鐘前、三村 30 分鐘前、二村 2 小時 5 分前 → 看二村；新村沒貼上過不算
    expect(await notice()).toHaveTextContent(`最舊的資料是 2 小時前貼上的。${HINT}`)
  })

  it.each([
    [0, '最舊的資料是剛剛貼上的。'],
    [5, '最舊的資料是 5 分鐘前貼上的。'],
    [125, '最舊的資料是 2 小時前貼上的。'],
    [30 * HOURS, '最舊的資料是昨天貼上的。'],
    [3 * 24 * HOURS + 5, '最舊的資料是 3 天前貼上的。'],
  ])('oldest data %i min ago reads 「%s」', async (minutes, text) => {
    db.villages['acc-ts3'] = [village({ village_id: 'v-only', last_pasted_at: utcAgo(minutes) })]
    renderPage()
    expect(await notice()).toHaveTextContent(text)
  })

  it.each([
    [5 * HOURS + 59, 'neutral', 'bg-muted'],
    [6 * HOURS, 'warn', 'bg-amber-50'],
    [12 * HOURS, 'warn', 'bg-amber-50'],
    [24 * HOURS - 1, 'warn', 'bg-amber-50'],
    [24 * HOURS + 1, 'stale', 'bg-red-50'],
    [5 * 24 * HOURS, 'stale', 'bg-red-50'],
  ])('oldest data %i min ago → %s notice', async (minutes, level, background) => {
    pastedMinutesAgo('v-2', minutes)
    renderPage()
    const box = await notice()
    expect(box).toHaveAttribute('data-level', level)
    expect(box).toHaveClass(background)
    // 紅色不只靠顏色：多一句「數字可能已經不準。」
    if (level === 'stale') {
      expect(box).toHaveClass('text-red-800')
      expect(box).toHaveTextContent(OUTDATED)
      expect(box.textContent).toMatch(/貼上的。數字可能已經不準。要更新請/)
    } else {
      expect(box).not.toHaveTextContent(OUTDATED)
    }
    expect(box).toHaveTextContent(HINT)
  })

  it('neutral notice uses the muted tokens (wireframe --bg / --line / --mut)', async () => {
    renderPage()
    const box = await notice()
    expect(box).toHaveAttribute('data-level', 'neutral')
    expect(box).toHaveClass('bg-muted', 'border-border', 'text-muted-foreground')
  })

  it('marks 「n 天前」 at the end of a row only when that village is older than 24h', async () => {
    pastedMinutesAgo('v-2', 3 * 24 * HOURS + 5)
    pastedMinutesAgo('v-3', 24 * HOURS + 30)
    pastedMinutesAgo('v-main', 24 * HOURS - 1) // 23 小時 59 分：不標
    renderPage()
    await waitFor(() => expect(rows()).toHaveLength(4))
    const row = (name: string) => rows().find((r) => r.textContent?.includes(name))!

    const second = within(row('二村')).getByTestId('village-age')
    expect(second).toHaveTextContent('3 天前')
    expect(second).toHaveClass('text-muted-foreground')
    expect(row('二村')).toHaveTextContent('人口 540 · 糧 −320/h · 3 天前')
    expect(within(row('三村')).getByTestId('village-age')).toHaveTextContent('昨天')
    expect(within(row('主村')).queryByTestId('village-age')).not.toBeInTheDocument()
    // 從沒貼上過的也不標
    expect(within(row('新村')).queryByTestId('village-age')).not.toBeInTheDocument()
  })

  it('shows no row times at all when everything is fresh', async () => {
    renderPage()
    await waitFor(() => expect(rows()).toHaveLength(4))
    expect(screen.queryAllByTestId('village-age')).toHaveLength(0)
  })

  const NO_OVERVIEW_TITLE = '還沒有村莊總覽資料'
  const NO_OVERVIEW_HINT = '人口和糧要從村莊總覽更新。請到首頁貼上多村總覽。'

  it('dorf2-only account (village center uploads, never the overview): 還沒有村莊總覽資料, neutral, never 剛剛', async () => {
    // 後端只算村莊總覽（dorf1）：只上傳過村莊中心（dorf2）的村莊有人口、沒有糧、時間是 null
    db.villages['acc-ts3'] = [
      village({ village_id: 'v-c1', name: '主村', population: 812, crop_net_per_hour: null, last_pasted_at: null }),
      village({ village_id: 'v-c2', name: '二村', population: 540, crop_net_per_hour: null, last_pasted_at: null }),
    ]
    renderPage()
    const box = await notice()
    expect(within(box).getByTestId('villages-no-overview')).toHaveTextContent(NO_OVERVIEW_TITLE)
    expect(box).toHaveTextContent(`${NO_OVERVIEW_TITLE}${NO_OVERVIEW_HINT}`)
    // 中性（線框 --bg / --line / --mut），不是新鮮的「剛剛」，也沒有黃／紅
    expect(box).toHaveAttribute('data-level', 'neutral')
    expect(box).toHaveClass('bg-muted', 'border-border', 'text-muted-foreground')
    expect(box).not.toHaveTextContent('剛剛')
    expect(box).not.toHaveTextContent('最舊的資料')
    expect(box).not.toHaveTextContent(OUTDATED)
    // 人口照樣顯示，糧還沒有資料，列上不標時間
    await waitFor(() => expect(rows()).toHaveLength(2))
    expect(rows()[0]).toHaveTextContent('人口 812 · 糧 還沒有資料')
    expect(screen.queryAllByTestId('village-age')).toHaveLength(0)
  })

  it('hand-entered villages get the same 還沒有村莊總覽資料 notice', async () => {
    db.villages['acc-ts3'] = [village({ village_id: 'v-hand', last_pasted_at: null })]
    renderPage()
    const box = await notice()
    expect(box).toHaveTextContent(NO_OVERVIEW_TITLE)
    expect(box).toHaveAttribute('data-level', 'neutral')
  })

  it('puts a space between sentences in English (none in Chinese)', async () => {
    pastedMinutesAgo('v-2', 3 * 24 * HOURS)
    await i18n.changeLanguage('en')
    try {
      renderPage()
      const box = await notice()
      expect(box.textContent).toBe(
        'The oldest data was pasted 3 days ago. The numbers may be out of date. ' +
          'To update, paste the multi-village overview on the home page.'
      )
    } finally {
      await i18n.changeLanguage('zh-TW')
    }
  })

  it('shows an empty state (no notice, no list) when the account has no villages', async () => {
    db.villages['acc-ts3'] = []
    renderPage()
    const empty = await screen.findByTestId('villages-empty')
    expect(empty).toHaveTextContent('這個帳號還沒有村莊資料')
    expect(empty).toHaveTextContent('到首頁貼上多村總覽；也可以手動新增。')
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
    expect(screen.getByTestId('villages-paste-notice')).toHaveTextContent('最舊的資料是昨天貼上的。數字可能已經不準。')
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

    releaseTs3({ villages: db.villages['acc-ts3'], total: 4, oldest_pasted_at: null })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('T5 主村')
  })
})
