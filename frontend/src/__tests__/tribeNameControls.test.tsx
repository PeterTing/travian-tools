// 部族名稱只有一種寫法（#33 單一名稱規則延伸，P0-23 設計師）：篩選按鈕、下拉選單的部族名稱都是遊戲內名稱（日耳曼人，不是條頓人）
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import { INGAME_TRIBES } from '@/lib/ingameNames'

vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: 'teutons', accountSpeed: 1, accountTribe: 'teutons',
    offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined,
    selectVillage: () => undefined,
  }
  return { ...mod, useAutoFill: () => value }
})
vi.mock('@/services/gameApi', () => ({
  troopsApi: { getTroops: vi.fn(async () => ({ troops: [], total: 0 })), getTroop: vi.fn() },
}))

const ALL = Object.values(INGAME_TRIBES).map((t) => t.zh)
const OLD = /條頓|羅馬人?族|高盧族|匈人|埃及族/

describe('tribe names in filter buttons and dropdowns = in-game names only', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: true, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('table: 日耳曼人 (not 條頓人), 7 tribes', () => {
    expect(INGAME_TRIBES.teutons?.zh).toBe('日耳曼人')
    expect(ALL).toHaveLength(7)
  })

  it('troops database: tribe filter buttons', async () => {
    const { default: TroopsPage } = await import('@/pages/database/TroopsPage')
    render(<MemoryRouter><TroopsPage /></MemoryRouter>)
    for (const name of ALL) expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /條頓/ })).toBeNull()
    expect(document.body.textContent).not.toMatch(OLD)
    cleanup()
  })

  it('已帶入 bar: tribe dropdown', async () => {
    const { default: AutoFillBar } = await import('@/components/autofill/AutoFillBar')
    render(<MemoryRouter><AutoFillBar /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('autofill-edit'))
    const editor = screen.getByTestId('autofill-editor')
    const tribeSelect = within(editor).getAllByRole('combobox').find((s) => [...s.querySelectorAll('option')].some((o) => o.value === 'teutons'))!
    const labels = [...tribeSelect.querySelectorAll('option')].map((o) => o.textContent)
    expect(labels.sort()).toEqual([...ALL].sort())
    expect(document.body.textContent).not.toMatch(OLD)
    cleanup()
  })

  it('technology calculator: tribe dropdown', async () => {
    const { default: Tech } = await import('@/pages/calculator/TechnologyCalculatorPage')
    const { container } = render(<MemoryRouter><Tech /></MemoryRouter>)
    const sel = [...container.querySelectorAll('select')].find((s) => [...s.querySelectorAll('option')].some((o) => o.value === 'teutons'))!
    const labels = [...sel.querySelectorAll('option')].map((o) => o.textContent)
    expect(labels.sort()).toEqual([...ALL].sort())
    cleanup()
  })

  it('trade route: tribe dropdown starts with the in-game name', async () => {
    const { default: Trade } = await import('@/features/guideCalcs/components/TraderouteCalculator')
    const { container } = render(<MemoryRouter><Trade /></MemoryRouter>)
    const sel = [...container.querySelectorAll('select')].find((s) => [...s.querySelectorAll('option')].some((o) => o.value === 'teutons'))!
    const opts = [...sel.querySelectorAll('option')]
    expect(opts).toHaveLength(7)
    for (const o of opts) expect(o.textContent!.split('（')[0]).toBe(INGAME_TRIBES[o.value]!.zh)
    expect(container.textContent + opts.map((o) => o.textContent).join(' ')).not.toMatch(OLD)
    cleanup()
  })
})
