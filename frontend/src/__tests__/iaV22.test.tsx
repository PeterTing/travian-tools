import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { Movement } from '@/services/pasteApi'

const accountData = vi.hoisted(() => ({
  value: {
    world: null as { world_id: string; utc_offset: number | null } | null,
    villages: [],
    selectedVillage: null,
    selectVillage: () => undefined,
    incoming: [] as Movement[],
    unarrivedIncoming: [] as Movement[],
    loaded: true,
    reload: async () => undefined,
  },
}))
vi.mock('@/contexts/AccountDataContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/contexts/AccountDataContext')>()
  return { ...mod, useAccountData: () => accountData.value }
})

import BottomTabBar from '@/components/layout/BottomTabBar'
import Sidebar from '@/components/layout/Sidebar'
import Stepper from '@/components/common/Stepper'
import AutoFillBar from '@/components/autofill/AutoFillBar'
import ExternalLinkList from '@/components/external/ExternalLinkList'
import IncomingCard from '@/components/home/IncomingCard'
import CpCard from '@/components/home/CpCard'
import { writeCpProgress } from '@/lib/cpProgress'
import {
  deriveServerUtcOffset,
  displayOffsetHours,
  formatOffsetHours,
  localUtcOffsetMinutes,
  serverAndLocal,
} from '@/lib/serverTime'

const movement = (id: string, minutes: number, extra: Partial<Movement> = {}): Movement => ({
  movement_id: id,
  village_id: 'v2',
  kind: 'incoming_attack',
  arrival_at: new Date(Date.now() + minutes * 60_000).toISOString(),
  needs_coords: false,
  troops: [],
  source: 'paste',
  coordinate_x: 35,
  coordinate_y: -8,
  ...extra,
})

describe('IA v2.2', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })
  beforeEach(() => {
    localStorage.clear()
    accountData.value = { ...accountData.value, world: null, incoming: [], unarrivedIncoming: [] }
  })

  describe('時差（伺服器時間／本地時間）', () => {
    it('reads the server UTC offset from the page clock and the paste time (ts11: 14:45 server at 12:45 UTC → UTC+2)', () => {
      const captured = new Date('2026-10-09T12:45:10Z')
      expect(deriveServerUtcOffset('14:45:03', captured)).toBe(120)
      // 跨午夜：伺服器 00:10、UTC 23:10 → +1
      expect(deriveServerUtcOffset('00:10:00', new Date('2026-10-09T23:10:00Z'))).toBe(60)
      expect(deriveServerUtcOffset('22:00', new Date('2026-10-10T03:00:00Z'))).toBe(-300)
      expect(deriveServerUtcOffset('not a clock', captured)).toBeNull()
      expect(deriveServerUtcOffset(null, captured)).toBeNull()
    })

    it('shows the offset as local − server hours', () => {
      const at = new Date('2026-10-09T12:00:00Z')
      const local = localUtcOffsetMinutes(at)
      expect(displayOffsetHours(local - 360, at)).toBe(6)
      expect(displayOffsetHours(null, at)).toBeNull()
      expect(formatOffsetHours(6)).toBe('+6')
      expect(formatOffsetHours(-1.5)).toBe('−1.5')
    })

    it('marks the local time （明天） when it falls on the next day', () => {
      const now = new Date()
      const later = new Date(now.getTime() + 30 * 3600_000)
      expect(serverAndLocal(later, 0, now).localTomorrow).toBe(true)
      expect(serverAndLocal(now, 0, now).localTomorrow).toBe(false)
      expect(serverAndLocal(now, null, now).server).toBeNull()
    })
  })

  describe('有來襲時的紅點', () => {
    it('shows a red dot on the 首頁 tab and on 首頁／防守 in the sidebar while incoming is unarrived', () => {
      const m = movement('m1', 10)
      accountData.value = { ...accountData.value, incoming: [m], unarrivedIncoming: [m] }
      render(
        <MemoryRouter initialEntries={['/calculator/incoming']}>
          <BottomTabBar />
          <Sidebar />
        </MemoryRouter>,
      )
      const homeTab = within(screen.getByTestId('bottom-tab-bar')).getByRole('link', { name: /首頁/ })
      expect(within(homeTab).getByTestId('tab-home-dot')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar-home-dot')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar-defense-dot')).toBeInTheDocument()
      // 紅點不放數字；數字在左側「來襲列表」
      expect(screen.getByTestId('tab-home-dot')).toHaveTextContent('')
      expect(screen.getByTestId('sidebar-incoming-count')).toHaveTextContent('1')
    })

    it('has no red dot without unarrived incoming', () => {
      render(
        <MemoryRouter>
          <BottomTabBar />
          <Sidebar />
        </MemoryRouter>,
      )
      expect(screen.queryByTestId('tab-home-dot')).not.toBeInTheDocument()
      expect(screen.queryByTestId('sidebar-home-dot')).not.toBeInTheDocument()
      expect(screen.queryByTestId('sidebar-defense-dot')).not.toBeInTheDocument()
    })
  })

  describe('加減鈕', () => {
    it('uses real buttons labelled 減少／增加 with a 44×44 hit area, clamped to the range', () => {
      const onChange = vi.fn()
      const { rerender } = render(<Stepper label="城鎮廳" value={1} onChange={onChange} min={0} max={20} />)
      const minus = screen.getByRole('button', { name: '減少' })
      const plus = screen.getByRole('button', { name: '增加' })
      expect(minus.tagName).toBe('BUTTON')
      expect(minus).toHaveAttribute('type', 'button')
      for (const b of [minus, plus]) expect(b).toHaveClass('h-11', 'w-11')
      expect(screen.getByRole('group', { name: '城鎮廳' })).toBeInTheDocument()
      fireEvent.click(plus)
      expect(onChange).toHaveBeenLastCalledWith(2)
      fireEvent.click(minus)
      expect(onChange).toHaveBeenLastCalledWith(0)
      rerender(<Stepper label="城鎮廳" value={20} onChange={onChange} min={0} max={20} />)
      expect(screen.getByRole('button', { name: '增加' })).toBeDisabled()
    })
  })

  describe('「已帶入」列', () => {
    const renderBar = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <AutoFillBar />
        </MemoryRouter>,
      )

    it('says the offset will be set by pasting when no page was pasted yet', () => {
      renderBar('/calculator/passive-cp')
      expect(screen.getByTestId('autofill-offset')).toHaveTextContent('時差：貼一頁就會自動設好')
      // CP 頁沒用兵種資料：沒有兵種待驗證那行
      expect(screen.queryByTestId('autofill-unit-pending')).not.toBeInTheDocument()
    })

    it('shows 兵種待驗證 on pages that use unit data, e.g. 行軍時間', () => {
      renderBar('/calculator/path')
      const line = screen.getByTestId('autofill-unit-pending')
      expect(line).toHaveTextContent('兵種速度與花費尚未在 ts11 實測')
      expect(within(line).getByTestId('pending-verify-chip')).toHaveTextContent('待驗證')
    })
  })

  describe('外部連結', () => {
    it('asks 「即將離開 Travian Tools」 before opening a new tab', () => {
      const open = vi.spyOn(window, 'open').mockReturnValue(null)
      render(<ExternalLinkList />)
      expect(screen.getAllByRole('button')).toHaveLength(8)
      fireEvent.click(screen.getByTestId('external-hero-revive'))
      expect(open).not.toHaveBeenCalled()
      expect(screen.getByText('即將離開 Travian Tools')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('leave-site-go'))
      expect(open).toHaveBeenCalledWith('http://travian.kirilloid.ru/hero.php', '_blank', 'noopener,noreferrer')
      open.mockRestore()
    })
  })

  describe('首頁卡片', () => {
    it('incoming card: count, big countdown, server time first with local time, one 待驗證 beside 反推 TS', () => {
      const now = new Date()
      const list = [movement('a', 12), movement('b', 31), movement('c', 118), movement('d', 312)]
      render(
        <MemoryRouter>
          <IncomingCard movements={list} villageName={() => '二村 (12|−1)'} utcOffset={120} now={now} busy />
        </MemoryRouter>,
      )
      expect(screen.getByTestId('incoming-count')).toHaveTextContent('4')
      expect(screen.getByTestId('incoming-countdown')).toHaveTextContent(/^00:1[12]:\d\d$/)
      expect(screen.getByTestId('incoming-time-server')).toHaveTextContent(/^伺服器 \d\d:\d\d:\d\d$/)
      expect(screen.getByTestId('incoming-time-local')).toHaveTextContent(/^本地 \d\d:\d\d:\d\d/)
      expect(within(screen.getByTestId('incoming-ts-line')).getAllByTestId('pending-verify-chip')).toHaveLength(1)
      expect(screen.getAllByTestId('pending-verify-chip')).toHaveLength(1)
      expect(screen.getByTestId('incoming-rest-list')).toHaveTextContent('接下來 3 筆')
    })

    it('CP card shows progress from the numbers last entered in CP 與開村, with 待驗證 for village 3', () => {
      writeCpProgress('acc-1', { currentCp: 846, dailyCp: 48, speed: 1 })
      render(
        <MemoryRouter>
          <CpCard accountId="acc-1" villageCount={2} speed={1} />
        </MemoryRouter>,
      )
      expect(screen.getByText('開三村 · CP')).toBeInTheDocument()
      expect(screen.getByTestId('cp-card-progress')).toHaveTextContent('846 / 8,000 CP')
      expect(screen.getByTestId('cp-card-progress')).toHaveTextContent('待驗證')
      expect(screen.getByText(/每天 \+48 → 約 150 天/)).toBeInTheDocument()
    })

    it('CP card for village 2 (ts11-verified) has no 待驗證', () => {
      writeCpProgress('acc-1', { currentCp: 500, dailyCp: 12, speed: 1 })
      render(
        <MemoryRouter>
          <CpCard accountId="acc-1" villageCount={1} speed={1} />
        </MemoryRouter>,
      )
      expect(screen.getByTestId('cp-card-progress')).toHaveTextContent('500 / 2,000 CP')
      expect(screen.queryByTestId('pending-verify-chip')).not.toBeInTheDocument()
    })
  })
})

describe('戰鬥模擬隱藏', () => {
  it('/calculator/battle redirects to home', async () => {
    vi.resetModules()
    vi.doMock('@/pages/HomePage', () => ({ default: () => <p data-testid="home-probe">home</p> }))
    vi.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
    }))
    const { AppContent } = await import('@/App')
    function Where() {
      return <p data-testid="where">{useLocation().pathname}</p>
    }
    render(
      <MemoryRouter initialEntries={['/calculator/battle']}>
        <AppContent />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('home-probe')).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/)
  })
})
