// 首頁 10/11 資料更新卡（一天一張：#38～#41 的 x3 行軍時間、慶典＋#43 的斯巴達兩項；標題、key、自動隱藏都跟著上線日常數）
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import i18n from '@/i18n/i18n'
import DataUpdateCard from '@/components/home/DataUpdateCard'
import { DATA_UPDATE_HIDE_AT, DATA_UPDATE_ITEMS, DATA_UPDATE_PREF_KEY, DATA_UPDATE_REVISION, dataUpdateItemsFor, DATA_UPDATE_RELEASE_DATE, DATA_UPDATE_TITLE, shouldShowDataUpdate } from '@/lib/dataUpdate'
import { spartanDataUpdateItems } from '@/lib/dataUpdateSpartans'

const pasteApi = vi.hoisted(() => ({
  preview: vi.fn(),
  listMovements: vi.fn().mockResolvedValue({ movements: [] }),
}))
vi.mock('@/services/pasteApi', () => ({ pasteApi }))
const syncApi = vi.hoisted(() => ({ getLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }) }))
vi.mock('@/services/syncApi', () => ({ syncApi }))
const villageApi = vi.hoisted(() => ({
  getAll: vi.fn().mockResolvedValue({
    villages: [{ village_id: 'v-main', name: '主村', coordinate_x: 10, coordinate_y: -3 }],
    total: 1,
  }),
}))
vi.mock('@/services/villageApi', () => ({ villageApi }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
const world = vi.hoisted(() => ({ speed: 1 }))
vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({
    currentAccount: {
      account_id: 'acc-1', world_id: 'w-1', player_name: 'Tester', server_name: 'ts11',
      server_url: 'https://ts11.x1.international.travian.com', server_speed: world.speed,
    },
    loading: false,
  }),
}))

import HomePage from '../HomePage'

const SPARTAN_A = '斯巴達人兵種數值已核對（賴達投石機、五長官訓練時間除外）'
const SPARTAN_B = '斯巴達人兵種改用遊戲內正式名稱（弩炮→賴達投石機）'
const CELEBRATION = '小慶典的糧、大慶典的花費待驗證 → 已核對'
const visibleTexts = () =>
  within(screen.getByTestId('data-update-items')).getAllByRole('listitem').map((li) => li.textContent?.replace(/改成/g, ''))

// 上線後第 2 天中午（跟著上線日常數走）
const NOW = new Date(new Date(`${DATA_UPDATE_RELEASE_DATE}T12:00:00+08:00`).getTime() + 2 * 86_400_000)

function incoming(minutes: number) {
  return {
    movement_id: `m-${minutes}`, village_id: 'v-main', kind: 'incoming_attack', role: 'incoming',
    coordinate_x: 1, coordinate_y: 2, arrival_at: new Date(NOW.getTime() + minutes * 60_000).toISOString(),
    needs_coords: false, troops: [], source: 'paste',
  }
}

describe('首頁資料更新卡', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW })
    localStorage.clear()
    world.speed = 1
    pasteApi.listMovements.mockReset().mockResolvedValue({ movements: [] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('light grey info card: title from the release date, x1 shows the two Spartan items, celebration under 再看 1 項, 知道了 44px, text ≥ 12px, max half the screen', () => {
    render(<DataUpdateCard />)
    const card = screen.getByTestId('data-update-card')
    expect(card.className).toContain('bg-slate-50')
    expect(card.className).toContain('max-h-[50vh]')
    expect(card.className).toContain('overflow-y-auto')
    const [, m, d] = DATA_UPDATE_RELEASE_DATE.split('-').map(Number)
    expect(DATA_UPDATE_TITLE).toBe(`${m}/${d} 資料更新`)
    expect(within(card).getByRole('heading', { name: DATA_UPDATE_TITLE })).toBeInTheDocument()
    expect(card).toHaveTextContent('依官方說明頁和社群資料核對')
    // x1：行軍時間那項拿掉，斯巴達兩項往上補；慶典不放前面
    expect(visibleTexts()).toEqual([SPARTAN_A, SPARTAN_B])
    expect(card).not.toHaveTextContent('小慶典')
    const more = screen.getByTestId('data-update-more')
    expect(more).toHaveTextContent('再看 1 項')
    expect(more).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    const items = within(card).getAllByRole('listitem')
    expect(items.map((li) => li.textContent?.replace(/改成/g, ''))).toEqual([SPARTAN_A, SPARTAN_B, CELEBRATION])
    // 舊值刪除線、新值粗體
    const change = within(items[2]!).getByTestId('data-update-change')
    expect(change.querySelector('.line-through')).toHaveTextContent('待驗證')
    expect(change.querySelector('.font-semibold')).toHaveTextContent('已核對')
    // 一天一張卡：4 項；x1 看得到 3 項（2 項在前面＋慶典收起來）
    expect(DATA_UPDATE_ITEMS).toHaveLength(4)
    expect(dataUpdateItemsFor(1)).toHaveLength(3)
    const btn = within(card).getByRole('button', { name: '知道了' })
    expect(btn.className).toContain('min-h-[44px]')
    // 字級：卡片裡沒有 text-xs 以下
    expect(card.innerHTML).not.toMatch(/text-(xs|\[1[01]px\]|\[[0-9]px\])/)
  })

  it('one card per day: the #43 Spartan items are merged into the 10/11 card right after the x3 item (no second card, no 9900/9000, no Viking carry)', () => {
    expect(DATA_UPDATE_ITEMS.map((it) => it.label)).toEqual([
      DATA_UPDATE_ITEMS[0]!.label,
      ...spartanDataUpdateItems().map((it) => it.label),
      '小慶典的糧、大慶典的花費',
    ])
    expect(DATA_UPDATE_ITEMS[0]!.minServerSpeed).toBe(3)
    expect(DATA_UPDATE_ITEMS.filter((it) => it.expandedOnly).map((it) => it.label)).toEqual(['小慶典的糧、大慶典的花費'])
    const text = DATA_UPDATE_ITEMS.map((it) => [it.label, it.before, it.after, it.note, it.sub?.label].join(' ')).join(' ')
    expect(text).not.toMatch(/9900|9000|維京|運載量/)
    render(<DataUpdateCard serverSpeed={3} />)
    expect(screen.getAllByTestId('data-update-card')).toHaveLength(1)
  })

  it('people who dismissed the live 10/11 card (old key) see the merged card again; dismissing it uses the new key', () => {
    const OLD_KEY = `tt:dataUpdate:${DATA_UPDATE_RELEASE_DATE}`
    expect(DATA_UPDATE_REVISION).toBe(2)
    expect(DATA_UPDATE_PREF_KEY).not.toBe(OLD_KEY)
    localStorage.setItem(OLD_KEY, 'dismissed')
    expect(shouldShowDataUpdate()).toBe(true)
    const { unmount } = render(<DataUpdateCard serverSpeed={3} />)
    expect(screen.getByTestId('data-update-card')).toHaveTextContent(SPARTAN_A)
    fireEvent.click(screen.getByRole('button', { name: '知道了' }))
    expect(localStorage.getItem(DATA_UPDATE_PREF_KEY)).toBe('dismissed')
    unmount()
    render(<DataUpdateCard serverSpeed={3} />)
    expect(screen.queryByTestId('data-update-card')).toBeNull()
  })

  it('home page: old key dismissed → merged card shows again', async () => {
    localStorage.setItem(`tt:dataUpdate:${DATA_UPDATE_RELEASE_DATE}`, 'dismissed')
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(await screen.findByTestId('data-update-card')).toHaveTextContent(SPARTAN_B)
  })

  it('dismissal key and auto-hide follow the release date constant', () => {
    expect(DATA_UPDATE_PREF_KEY).toBe(`tt:dataUpdate:${DATA_UPDATE_RELEASE_DATE}:v${DATA_UPDATE_REVISION}`)
    expect(DATA_UPDATE_HIDE_AT.getTime()).toBe(new Date(`${DATA_UPDATE_RELEASE_DATE}T00:00:00+08:00`).getTime() + 14 * 86_400_000)
    const src = readFileSync(resolve(__dirname, '../../lib/dataUpdate.ts'), 'utf8') + readFileSync(resolve(__dirname, '../../components/home/DataUpdateCard.tsx'), 'utf8')
    // 日期只寫在一個常數：標題、key 不另外寫死
    expect(src.match(/\d{4}-\d{2}-\d{2}/g)).toEqual([DATA_UPDATE_RELEASE_DATE])
    expect(src).not.toContain('10/10')
  })

  it('知道了 hides it and remembers on this device', () => {
    const { unmount } = render(<DataUpdateCard />)
    fireEvent.click(screen.getByRole('button', { name: '知道了' }))
    expect(screen.queryByTestId('data-update-card')).toBeNull()
    expect(localStorage.getItem(DATA_UPDATE_PREF_KEY)).toBe('dismissed')
    unmount()
    render(<DataUpdateCard />)
    expect(screen.queryByTestId('data-update-card')).toBeNull()
  })

  it('hides by itself 14 days after the release date (Taipei midnight)', () => {
    const end = DATA_UPDATE_HIDE_AT.getTime()
    expect(shouldShowDataUpdate(new Date(end - 60_000))).toBe(true)
    expect(shouldShowDataUpdate(new Date(end))).toBe(false)
  })

  it('no incoming: first card above the task cards', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    const grid = await screen.findByTestId('home-normal')
    const card = screen.getByTestId('data-update-card')
    // 在任務卡格子前面
    expect(card.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('with incoming: directly below the incoming card', async () => {
    pasteApi.listMovements.mockResolvedValue({ movements: [incoming(30)] })
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    const inc = await screen.findByTestId('incoming-card')
    const card = await screen.findByTestId('data-update-card')
    expect(inc.nextElementSibling).toBe(card)
    expect(screen.getAllByTestId('data-update-card')).toHaveLength(1)
  })

  describe('x3 以上世界的行軍時間修正（官方 S20：兵速 x3/x5 ×2、x10 ×4；PM：只給 x3 以上看）', () => {
    const TEXT = 'x3 以上世界的行軍時間已修正（之前算得太短，請重新確認排好的攻擊）'
    it.each([3, 5, 10])('x%i: top 3 = x3 item (plain sentence, no 舊 → 新), Spartan values, Spartan names; celebration under 再看 1 項', (speed) => {
      render(<DataUpdateCard serverSpeed={speed} />)
      const items = within(screen.getByTestId('data-update-items')).getAllByRole('listitem')
      expect(items.map((li) => li.textContent)).toEqual([TEXT, SPARTAN_A, SPARTAN_B])
      expect(within(items[0]!).queryByTestId('data-update-change')).toBeNull()
      expect(screen.getByTestId('data-update-card')).not.toHaveTextContent('小慶典')
      const more = screen.getByTestId('data-update-more')
      expect(more).toHaveTextContent('再看 1 項')
      fireEvent.click(more)
      const all = within(screen.getByTestId('data-update-card')).getAllByRole('listitem')
      expect(all.map((li) => li.textContent?.replace(/改成/g, ''))).toEqual([TEXT, SPARTAN_A, SPARTAN_B, CELEBRATION])
      expect(screen.getByTestId('data-update-card')).toHaveTextContent('依官方說明頁和社群資料核對')
    })
    it.each([1, 2, undefined, null])('x%s: not shown; Spartan items move up, celebration still under 再看 1 項', (speed) => {
      render(<DataUpdateCard serverSpeed={speed} />)
      expect(screen.getByTestId('data-update-card')).not.toHaveTextContent('行軍時間')
      expect(visibleTexts()).toEqual([SPARTAN_A, SPARTAN_B])
      expect(screen.getByTestId('data-update-more')).toHaveTextContent('再看 1 項')
    })
    it('home page passes the current world speed', async () => {
      world.speed = 5
      render(<MemoryRouter><HomePage /></MemoryRouter>)
      expect(await screen.findByTestId('data-update-card')).toHaveTextContent(TEXT)
    })
    it('home page on x1 does not show it', async () => {
      render(<MemoryRouter><HomePage /></MemoryRouter>)
      expect(await screen.findByTestId('data-update-card')).not.toHaveTextContent('行軍時間')
    })
  })

  it('old name only comes from the in-game name table aliases (not hard-coded)', () => {
    const src = readFileSync(resolve(__dirname, '../../lib/dataUpdate.ts'), 'utf8') + readFileSync(resolve(__dirname, '../../components/home/DataUpdateCard.tsx'), 'utf8')
    expect(src).not.toContain('鐵匠鋪')
  })
})
