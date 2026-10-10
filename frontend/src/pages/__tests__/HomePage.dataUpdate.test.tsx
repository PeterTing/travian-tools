// 首頁資料更新卡（#33 + #34 合成一張；標題、key、自動隱藏都跟著上線日常數）
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import i18n from '@/i18n/i18n'
import DataUpdateCard from '@/components/home/DataUpdateCard'
import { DATA_UPDATE_HIDE_AT, DATA_UPDATE_ITEMS, DATA_UPDATE_PREF_KEY, dataUpdateItemsFor, DATA_UPDATE_RELEASE_DATE, DATA_UPDATE_TITLE, shouldShowDataUpdate } from '@/lib/dataUpdate'

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

  it('light grey info card: title from the release date, first 3 items, 知道了 44px, text ≥ 12px, max half the screen', () => {
    render(<DataUpdateCard />)
    const card = screen.getByTestId('data-update-card')
    expect(card.className).toContain('bg-slate-50')
    expect(card.className).toContain('max-h-[50vh]')
    expect(card.className).toContain('overflow-y-auto')
    const [, m, d] = DATA_UPDATE_RELEASE_DATE.split('-').map(Number)
    expect(DATA_UPDATE_TITLE).toBe(`${m}/${d} 資料更新`)
    expect(within(card).getByRole('heading', { name: DATA_UPDATE_TITLE })).toBeInTheDocument()
    expect(card).toHaveTextContent('數值已對照 ts11 遊戲內說明和官方說明頁更正')
    const items = within(screen.getByTestId('data-update-items')).getAllByRole('listitem')
    expect(items.map((li) => li.textContent?.replace(/改成/g, ''))).toEqual([
      '草原騎士運載量115 → 75',
      '羅馬人開拓者木材花費5800 → 4600',
      '匈奴商人容量750 → 500',
    ])
    // 舊值刪除線、新值粗體
    const change = within(items[2]!).getByTestId('data-update-change')
    expect(change.querySelector('.line-through')).toHaveTextContent('750')
    expect(change.querySelector('.font-semibold')).toHaveTextContent('500')
    expect(DATA_UPDATE_ITEMS).toHaveLength(7)
    expect(dataUpdateItemsFor(1)).toHaveLength(6)
    const btn = within(card).getByRole('button', { name: '知道了' })
    expect(btn.className).toContain('min-h-[44px]')
    // 字級：卡片裡沒有 text-xs 以下
    expect(card.innerHTML).not.toMatch(/text-(xs|\[1[01]px\]|\[[0-9]px\])/)
  })

  it('再看 3 項 (44px) shows the other three: trade office with an indented Roman line, Plus 加總 → 相乘 with a grey note, building rename', () => {
    render(<DataUpdateCard />)
    const more = screen.getByRole('button', { name: '再看 3 項' })
    expect(more.className).toContain('min-h-[44px]')
    expect(more).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    const items = within(screen.getByTestId('data-update-items')).getAllByRole('listitem')
    expect(items).toHaveLength(6)
    expect(items[3]!.textContent?.replace(/改成/g, '')).toBe('交易所每級10% → 20%羅馬人20% → 40%')
    const sub = within(items[3]!).getByTestId('data-update-sub')
    expect(sub.className).toContain('pl-4')
    // 「加總 → 相乘」不斷行（整段 nowrap）；下面一行灰色小字
    const plus = within(items[4]!).getByTestId('data-update-change')
    expect(plus.className).toContain('whitespace-nowrap')
    expect(plus.textContent?.replace('改成', '')).toBe('加總 → 相乘')
    expect(items[4]!).toHaveTextContent('田地回本、建造順序的 Plus')
    const note = within(items[4]!).getByTestId('data-update-note')
    expect(note).toHaveTextContent('田地回本會變短')
    expect(note.className).toContain('text-[12px]')
    expect(note.className).toContain('text-slate-500')
    expect(items[5]!.textContent?.replace(/改成/g, '')).toBe('建築名稱鐵匠鋪 → 盔甲廠')
  })

  it('dismissal key and auto-hide follow the release date constant', () => {
    expect(DATA_UPDATE_PREF_KEY).toBe(`tt:dataUpdate:${DATA_UPDATE_RELEASE_DATE}`)
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
    it.each([3, 5, 10])('x%i: first item, visible without expanding, plain sentence (no 舊 → 新)', (speed) => {
      render(<DataUpdateCard serverSpeed={speed} />)
      const items = within(screen.getByTestId('data-update-items')).getAllByRole('listitem')
      expect(items[0]!.textContent).toBe(TEXT)
      expect(within(items[0]!).queryByTestId('data-update-change')).toBeNull()
      expect(screen.getByRole('button', { name: '再看 4 項' })).toBeInTheDocument()
    })
    it.each([1, 2, undefined, null])('x%s: not shown', (speed) => {
      render(<DataUpdateCard serverSpeed={speed} />)
      expect(screen.getByTestId('data-update-card')).not.toHaveTextContent('行軍時間')
      expect(screen.getByRole('button', { name: '再看 3 項' })).toBeInTheDocument()
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
