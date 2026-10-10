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
import CpCard, { shortLocalStamp } from '@/components/home/CpCard'
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

    it('tab labels are at least 12px (text-xs, not text-[11px])', () => {
      render(
        <MemoryRouter>
          <BottomTabBar />
        </MemoryRouter>,
      )
      for (const tab of within(screen.getByTestId('bottom-tab-bar')).getAllByRole('link')) {
        expect(tab).toHaveClass('text-xs')
        expect(tab.className).not.toContain('text-[11px]')
      }
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

    it('shows 兵種待驗證 on pages that use unit data, e.g. 糧食平衡', () => {
      renderBar('/calculator/crop')
      const line = screen.getByTestId('autofill-unit-pending')
      // 兩行、沒有分號；灰標在最前面，兩行都掛在灰標右邊（同一個文字欄）
      expect(line).not.toHaveTextContent('；')
      expect(screen.getByTestId('autofill-unit-pending-line1')).toHaveTextContent(/^兵種花費、糧耗、訓練時間還沒在 ts11 核對$/)
      expect(screen.getByTestId('autofill-unit-pending-line2')).toHaveTextContent(/^斯巴達速度待驗證$/)
      const chip = within(line).getByTestId('pending-verify-chip')
      expect(chip).toHaveTextContent('待驗證')
      expect(line.firstElementChild).toContainElement(chip)
      const text = screen.getByTestId('autofill-unit-pending-text')
      expect(line.lastElementChild).toBe(text)
      expect(text).toContainElement(screen.getByTestId('autofill-unit-pending-line1'))
      expect(text).toContainElement(screen.getByTestId('autofill-unit-pending-line2'))
      expect(line).toHaveClass('flex')
    })

    it('pages where speed is typed by hand or that use merchant data do not show the unit line (P0-17 (a))', () => {
      for (const path of ['/calculator/path', '/calculator/interception', '/calculator/save-troops', '/calculator/attack-planner', '/calculator/trade-route']) {
        const { unmount } = renderBar(path)
        expect(screen.queryByTestId('autofill-unit-pending')).not.toBeInTheDocument()
        unmount()
      }
    })

    it('the 已帶入 chip uses the two-line autofillUnits copy (one chip governs both lines)', () => {
      renderBar('/calculator/crop')
      const line = screen.getByTestId('autofill-unit-pending')
      fireEvent.click(within(line).getByTestId('pending-verify-chip'))
      expect(screen.getByTestId('pending-note-what')).toHaveTextContent(
        /^兵種花費、糧耗、訓練時間還沒在 ts11 遊戲內核對，目前用的是社群整理的數字。$/,
      )
      expect(screen.getByTestId('pending-note-source')).toHaveTextContent(
        /^斯巴達速度取自官方說明頁（頁面標示數字來自第三方計算器），反推 TS 不會算斯巴達兵種。$/,
      )
    })

    it('「更改」 and the editor selects are at least 44px tall', () => {
      renderBar('/calculator/crop')
      const edit = screen.getByTestId('autofill-edit')
      expect(edit).toHaveClass('inline-flex', 'min-h-[44px]', 'min-w-[44px]', 'items-center')
      fireEvent.click(edit)
      const selects = within(screen.getByTestId('autofill-editor')).getAllByRole('combobox')
      expect(selects.length).toBeGreaterThanOrEqual(2)
      for (const sel of selects) expect(sel).toHaveClass('min-h-[44px]')
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

    it('incoming card tap targets are at least 44px (全部 ›, 反推 TS, 躲兵, 複製給盟友)', () => {
      render(
        <MemoryRouter>
          <IncomingCard movements={[movement('a', 12)]} villageName={() => '二村 (12|−1)'} utcOffset={120} now={new Date()} busy={false} />
        </MemoryRouter>,
      )
      expect(screen.getByTestId('incoming-all')).toHaveClass('inline-flex', 'min-h-[44px]', 'min-w-[44px]', 'items-center')
      for (const name of ['反推 TS', '躲兵']) expect(screen.getByRole('link', { name })).toHaveClass('min-h-[44px]')
      expect(screen.getByTestId('incoming-copy')).toHaveClass('min-h-[44px]')
    })

    it('CP card shows progress from the numbers last entered in CP 與開村; village 3 threshold is official (S51), no 待驗證', () => {
      writeCpProgress('acc-1', { currentCp: 846, dailyCp: 48, speed: 1 })
      render(
        <MemoryRouter>
          <CpCard accountId="acc-1" villageCount={2} speed={1} />
        </MemoryRouter>,
      )
      expect(screen.getByText('開三村 · CP')).toBeInTheDocument()
      expect(screen.getByTestId('cp-card-progress')).toHaveTextContent('846 / 8,000 CP')
      expect(screen.getByTestId('cp-card-progress')).not.toHaveTextContent('待驗證')
      expect(screen.getByText(/每天 \+48 → 約 150 天/)).toBeInTheDocument()
      expect(screen.getByTestId('cp-card-go')).toHaveClass('inline-flex', 'min-h-[44px]', 'min-w-[44px]', 'items-center')
    })

    it('CP card ends with 「上次輸入：M/D HH:mm · 只存在這台裝置」 in local time, no weekday, no tooltip', () => {
      writeCpProgress('acc-1', { currentCp: 846, dailyCp: 48, speed: 1 })
      const saved = JSON.parse(localStorage.getItem('tt:cpProgress:acc-1')!)
      saved.savedAt = new Date(2026, 9, 9, 22, 1).toISOString()
      localStorage.setItem('tt:cpProgress:acc-1', JSON.stringify(saved))
      render(
        <MemoryRouter>
          <CpCard accountId="acc-1" villageCount={2} speed={1} />
        </MemoryRouter>,
      )
      const line = screen.getByTestId('cp-card-last-input')
      expect(line).toHaveTextContent(/^上次輸入：10\/9 22:01 · 只存在這台裝置$/)
      // 手機不能 hover：說明直接寫在這行，不用 tooltip
      expect(line).not.toHaveAttribute('title')
      expect(line.className).toContain('text-xs')
      expect(line.className).toContain('text-muted-foreground')
      // 是卡片最後一行
      expect(screen.getByTestId('cp-card').lastElementChild).toBe(line)
      expect(shortLocalStamp(new Date(2026, 0, 5, 7, 3).toISOString())).toBe('1/5 07:03')
    })

    it('CP card when CP was never entered: one line + 去輸入 button to CP 與開村, no progress or days', () => {
      render(
        <MemoryRouter>
          <CpCard accountId="acc-never" villageCount={2} speed={1} />
        </MemoryRouter>,
      )
      expect(screen.getByText('開三村 · CP')).toBeInTheDocument()
      expect(screen.getByTestId('cp-card-empty')).toHaveTextContent('還沒填過目前 CP')
      const go = screen.getByRole('link', { name: '去輸入' })
      expect(go).toHaveAttribute('href', '/calculator/passive-cp')
      expect(go.className).toContain('min-h-[44px]')
      expect(screen.queryByTestId('cp-card-progress')).not.toBeInTheDocument()
      expect(screen.queryByText(/天/)).not.toBeInTheDocument()
      expect(screen.queryByTestId('cp-card-last-input')).not.toBeInTheDocument()
      expect(screen.queryByText(/去算/)).not.toBeInTheDocument()
    })

    it('CP card for village 2 has no 待驗證', () => {
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
