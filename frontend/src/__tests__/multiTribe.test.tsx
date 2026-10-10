import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { makeAccount } from '@/test/accountFixtures'
import type { GameAccount, GameWorld, TroopTribe, Village, VillageListResponse } from '@/types/game'

/**
 * P0-25：一個帳號多個部族（征服保留部族的特殊伺服器）。
 * 帳號出生部族 = 高盧人；世界開了「征服保留部族」時第二個村莊可以是別的部族：
 * 兵種／建築／商人的計算跟著目前村莊，英雄那一行永遠是出生部族；一般伺服器完全不變。
 */
const authApi = vi.hoisted(() => ({
  isAuthenticated: vi.fn(() => true),
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))
const db = vi.hoisted(() => ({
  accounts: [] as GameAccount[],
  villages: [] as Village[],
  worlds: [] as GameWorld[],
}))
const gameAccountApi = vi.hoisted(() => ({
  getAll: vi.fn(async () => ({ accounts: db.accounts, total: db.accounts.length })),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))
const villageApi = vi.hoisted(() => ({
  getAll: vi.fn(async (): Promise<VillageListResponse> => ({
    villages: db.villages.map((v) => ({ ...v })),
    total: db.villages.length,
    oldest_pasted_at: null,
  })),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(async (villageId: string, data: { tribe?: TroopTribe | null }) => {
    const v = db.villages.find((x) => x.village_id === villageId)!
    if (data.tribe !== undefined) v.tribe = data.tribe
    return { ...v }
  }),
  delete: vi.fn(),
}))
const gameWorldApi = vi.hoisted(() => ({
  getAll: vi.fn(async () => ({ worlds: db.worlds.map((w) => ({ ...w })), total: db.worlds.length })),
  update: vi.fn(async (worldId: string, data: Partial<GameWorld>) => {
    const w = db.worlds.find((x) => x.world_id === worldId)!
    Object.assign(w, data)
    return { ...w }
  }),
}))
vi.mock('@/services/authApi', () => ({ default: authApi }))
vi.mock('@/services/gameAccountApi', () => ({ gameAccountApi }))
vi.mock('@/services/villageApi', () => ({ villageApi }))
vi.mock('@/services/gameWorldApi', () => ({ gameWorldApi }))
vi.mock('@/services/pasteApi', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/pasteApi')>()
  return { ...mod, pasteApi: { ...mod.pasteApi, listMovements: vi.fn(async () => ({ movements: [] })) } }
})
vi.mock('@/services/extensionBridge', () => ({
  shareLoginWithExtension: vi.fn(async () => undefined),
  clearExtensionLogin: vi.fn(async () => undefined),
  sendSelectedAccountToExtension: vi.fn(async () => 0),
}))

import App from '@/App'

function village(overrides: Partial<Village>): Village {
  return {
    village_id: 'v-01',
    account_id: 'acc-ts3',
    name: '01',
    coordinate_x: 30,
    coordinate_y: -2,
    population: 500,
    village_type: null,
    is_capital: true,
    role: null,
    tribe: 'gauls',
    crop_net_per_hour: 100,
    last_pasted_at: null,
    last_updated: null,
    created_at: '2026-10-01T00:00:00',
    ...overrides,
  }
}

function setup({ keep, secondTribe }: { keep: boolean; secondTribe: TroopTribe }) {
  db.accounts = [makeAccount({ tribe: 'gauls', birth_tribe: 'gauls', village_count: 2 })]
  db.worlds = [
    {
      world_id: 'world-ts3',
      server_url: 'https://ts3.x1.international.travian.com',
      utc_offset: null,
      keep_tribe_on_conquest: keep,
      account_count: 1,
    },
  ]
  db.villages = [
    village({}),
    village({ village_id: 'v-02', name: '02', coordinate_x: 33, coordinate_y: -4, is_capital: false, tribe: secondTribe }),
  ]
  // 「已帶入」選第二個村莊（上次選的村）
  localStorage.setItem('tt:lastVillage:acc-ts3', 'v-02')
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

const summary = () => screen.getByTestId('autofill-summary')

describe('一個帳號多個部族（P0-25）', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    authApi.getMe.mockResolvedValue({ user_id: 'user-1', username: 'peter' })
  })

  describe('征服保留部族的世界', () => {
    it('已帶入 row shows the selected village with its tribe; unit-data pages default to that tribe', async () => {
      setup({ keep: true, secondTribe: 'romans' })
      renderAt('/calculator/technology')
      await waitFor(() => expect(screen.getByTestId('autofill-village')).toHaveTextContent('02 (33|-4)・羅馬人'))
      // 世界後面不再寫部族（部族跟著村莊）
      expect(summary()).toHaveTextContent('ts3（x1）')
      // 科技計算器的部族預設 = 村莊的部族，不是出生部族
      const tribeSelect = screen.getByText('部族', { selector: 'label' }).nextElementSibling as HTMLSelectElement
      await waitFor(() => expect(tribeSelect.value).toBe('romans'))
      // 英雄那一行只在英雄頁
      expect(screen.queryByTestId('autofill-hero-tribe')).not.toBeInTheDocument()
    })

    it('switching village in the 已帶入 editor switches the tribe', async () => {
      setup({ keep: true, secondTribe: 'romans' })
      renderAt('/calculator/technology')
      await waitFor(() => expect(screen.getByTestId('autofill-village')).toHaveTextContent('羅馬人'))
      fireEvent.click(screen.getByTestId('autofill-edit'))
      const editor = screen.getByTestId('autofill-editor')
      fireEvent.change(within(editor).getByLabelText('村莊'), { target: { value: 'v-01' } })
      await waitFor(() => expect(screen.getByTestId('autofill-village')).toHaveTextContent('01 (30|-2)・高盧人'))
    })

    it('the (k) unit pending line follows the village tribe, not the birth tribe', async () => {
      setup({ keep: true, secondTribe: 'spartans' })
      renderAt('/calculator/technology')
      await waitFor(() => expect(screen.getByTestId('autofill-village')).toHaveTextContent('斯巴達'))
      expect(screen.getByTestId('autofill-unit-pending')).toBeInTheDocument()
    })

    it('hero pages add the grey birth-tribe line', async () => {
      setup({ keep: true, secondTribe: 'romans' })
      renderAt('/calculator/path')
      await waitFor(() => expect(screen.getByTestId('autofill-hero-tribe')).toHaveTextContent('英雄：出生部族 高盧人'))
      expect(screen.getByTestId('autofill-village')).toHaveTextContent('02 (33|-4)・羅馬人')
    })

    it('villages page: one native tribe select per village (44px, 16px), default birth tribe, saves on change', async () => {
      setup({ keep: true, secondTribe: 'gauls' })
      db.villages[1].tribe = null // 還沒設定 = 出生部族
      renderAt('/villages')
      await waitFor(() => expect(screen.getAllByTestId('village-tribe-select')).toHaveLength(2))
      const second = screen.getByLabelText('02 的部族') as HTMLSelectElement
      expect(second.tagName).toBe('SELECT')
      expect(second).toHaveClass('h-11', 'text-base')
      expect(second.value).toBe('gauls')
      expect(within(second).getByRole('option', { name: '高盧人（出生部族）' })).toBeInTheDocument()

      fireEvent.change(second, { target: { value: 'teutons' } })
      await waitFor(() => expect(villageApi.update).toHaveBeenCalledWith('v-02', { tribe: 'teutons' }))
      await waitFor(() => expect((screen.getByLabelText('02 的部族') as HTMLSelectElement).value).toBe('teutons'))
    })
  })

  describe('一般伺服器（單一部族）：畫面不變', () => {
    it('已帶入 row keeps the tribe after the world, uses the birth tribe, no hero line', async () => {
      setup({ keep: false, secondTribe: 'romans' })
      renderAt('/calculator/path')
      await waitFor(() => expect(summary()).toHaveTextContent('PeterT · ts3（x1・高盧人） · 02 (33|-4)'))
      expect(summary()).not.toHaveTextContent('羅馬人')
      expect(screen.queryByTestId('autofill-hero-tribe')).not.toBeInTheDocument()
    })

    it('pages without villages still do not show a village', async () => {
      setup({ keep: false, secondTribe: 'romans' })
      renderAt('/calculator/technology')
      await waitFor(() => expect(summary()).toHaveTextContent('ts3（x1・高盧人）'))
      expect(screen.queryByTestId('autofill-village')).not.toBeInTheDocument()
    })

    it('villages page has no tribe select', async () => {
      setup({ keep: false, secondTribe: 'romans' })
      renderAt('/villages')
      await waitFor(() => expect(screen.getAllByTestId('village-row')).toHaveLength(2))
      expect(screen.queryByTestId('village-tribe-select')).not.toBeInTheDocument()
    })
  })

  it('world settings: the tribe rule is a native select that saves the world switch', async () => {
    setup({ keep: false, secondTribe: 'romans' })
    renderAt('/game-accounts')
    const select = (await screen.findByLabelText('部族規則')) as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(select).toHaveClass('h-11', 'text-base')
    expect(select.value).toBe('single')
    fireEvent.change(select, { target: { value: 'keep' } })
    await waitFor(() =>
      expect(gameWorldApi.update).toHaveBeenCalledWith('world-ts3', { keep_tribe_on_conquest: true }),
    )
    await waitFor(() => expect((screen.getByLabelText('部族規則') as HTMLSelectElement).value).toBe('keep'))
  })
})
