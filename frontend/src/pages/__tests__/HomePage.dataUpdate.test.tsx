// 首頁「10/10 資料更新」卡（#33）
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import i18n from '@/i18n/i18n'
import DataUpdateCard from '@/components/home/DataUpdateCard'
import { DATA_UPDATE_HIDE_AT, DATA_UPDATE_ITEMS, DATA_UPDATE_PREF_KEY, shouldShowDataUpdate } from '@/lib/dataUpdate'

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
vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({
    currentAccount: {
      account_id: 'acc-1', world_id: 'w-1', player_name: 'Tester', server_name: 'ts11',
      server_url: 'https://ts11.x1.international.travian.com',
    },
    loading: false,
  }),
}))

import HomePage from '../HomePage'

const NOW = new Date('2026-10-12T12:00:00+08:00')

function incoming(minutes: number) {
  return {
    movement_id: `m-${minutes}`, village_id: 'v-main', kind: 'incoming_attack', role: 'incoming',
    coordinate_x: 1, coordinate_y: 2, arrival_at: new Date(NOW.getTime() + minutes * 60_000).toISOString(),
    needs_coords: false, troops: [], source: 'paste',
  }
}

describe('首頁 10/10 資料更新卡', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW })
    localStorage.clear()
    pasteApi.listMovements.mockReset().mockResolvedValue({ movements: [] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('light grey info card: title, one line, three before → after items, 知道了 44px, text ≥ 12px', () => {
    render(<DataUpdateCard />)
    const card = screen.getByTestId('data-update-card')
    expect(card.className).toContain('bg-slate-50')
    expect(within(card).getByRole('heading', { name: '10/10 資料更新' })).toBeInTheDocument()
    expect(card).toHaveTextContent('兵種、建築和資源田數值已對照 ts11 遊戲內說明頁更正')
    const items = within(screen.getByTestId('data-update-items')).getAllByRole('listitem')
    expect(items.map((li) => li.textContent?.replace('改成', ''))).toEqual([
      '草原騎士運載量115 → 75',
      '1 級資源田產量增加7 → 4',
      '建築名稱鐵匠鋪 → 盔甲廠',
    ])
    expect(DATA_UPDATE_ITEMS).toHaveLength(3)
    const btn = within(card).getByRole('button', { name: '知道了' })
    expect(btn.className).toContain('min-h-[44px]')
    // 字級：卡片裡沒有 text-xs 以下
    expect(card.innerHTML).not.toMatch(/text-(xs|\[1[01]px\]|\[[0-9]px\])/)
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

  it('hides by itself 14 days after 10/10 (Taipei 10/24 00:00)', () => {
    expect(DATA_UPDATE_HIDE_AT.toISOString()).toBe('2026-10-23T16:00:00.000Z')
    expect(shouldShowDataUpdate(new Date('2026-10-23T23:59:00+08:00'))).toBe(true)
    expect(shouldShowDataUpdate(new Date('2026-10-24T00:00:00+08:00'))).toBe(false)
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

  it('old name only comes from the in-game name table aliases (not hard-coded)', () => {
    const src = readFileSync(resolve(__dirname, '../../lib/dataUpdate.ts'), 'utf8') + readFileSync(resolve(__dirname, '../../components/home/DataUpdateCard.tsx'), 'utf8')
    expect(src).not.toContain('鐵匠鋪')
  })
})
