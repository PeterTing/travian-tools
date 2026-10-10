// 農場收益重寫（2026-10-10 Peter 手機截圖：每次掠奪量 01000000、草原騎兵、間隔 15 分、單程 0:37:30，
// 結果永遠「建議兵數 1 馬」、每日 1,440 —— 掠奪量沒被用到）。PM＋幕僚長＋設計師規則：
// 每組兵數 = ⌈掠奪量 ÷ 運載量⌉、組數 = ⌈往返 ÷ 間隔⌉、總兵數 = 每組 × 組數、
// 每次實際帶回 = min(掠奪量, 每組 × 運載量)、每日收益 = 每次實際帶回 × (1440 ÷ 間隔)
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import FarmingCalculator, { FARM_UNITS, farmingCalc, parseFarmDistance } from '../FarmingCalculator'

vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null,
    offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined,
    selectVillage: () => undefined,
  }
  return { ...mod, useAutoFill: () => value }
})

const steppe = FARM_UNITS.find((u) => u.id === 'steppe')!
// 10 格、速度 16 → 單程 0:37:30（Peter 截圖的單程）
const base = { dist: 10, unitSpeed: steppe.speed, carry: 75, cost: steppe.cost, freq: 15, serverSpeed: 1, arena: 0, boots: 0 }

describe('farmingCalc（重寫後的公式）', () => {
  it('Peter 的輸入：1,000,000、運載 75、間隔 15、單程 0:37:30 → 5 組 × 13,334 = 66,670；每日 96,000,000', () => {
    expect(steppe.carry).toBe(75)
    expect(steppe.speed).toBe(16)
    const r = farmingCalc({ ...base, loot: 1_000_000 })
    expect(r.owSec).toBe(37 * 60 + 30)
    expect(r.perGroup).toBe(13334)
    expect(r.groups).toBe(5) // 往返 75 分 ÷ 15 分
    expect(r.totalTroops).toBe(66670)
    expect(r.perRaid).toBe(1_000_000)
    expect(r.daily).toBe(1_000_000 * 96)
  })

  it('掠奪量 0 → 0 兵、每日 0（不會變成 1 馬）', () => {
    const r = farmingCalc({ ...base, loot: 0 })
    expect(r.perGroup).toBe(0)
    expect(r.totalTroops).toBe(0)
    expect(r.daily).toBe(0)
    expect(r.payback).toBe(Infinity)
  })

  it('掠奪量剛好等於運載量 → 每組 1 匹、每次帶回 75', () => {
    const r = farmingCalc({ ...base, loot: 75 })
    expect(r.perGroup).toBe(1)
    expect(r.perRaid).toBe(75)
    expect(r.daily).toBe(75 * 96)
    expect(farmingCalc({ ...base, loot: 76 }).perGroup).toBe(2)
  })

  it('很大的掠奪量 → 照算出很大的兵數（不設上限、不提示）', () => {
    const r = farmingCalc({ ...base, loot: 75_000_000 })
    expect(r.perGroup).toBe(1_000_000)
    expect(r.totalTroops).toBe(5_000_000)
    expect(r.daily).toBe(75_000_000 * 96)
  })

  it('往返比間隔短 → 1 組；剛好等於 → 1 組；比間隔長 → 無條件進位', () => {
    // 5 格、速度 16 → 單程 18:45、往返 37:30；間隔 60 分 → 1 組
    expect(farmingCalc({ ...base, dist: 5, freq: 60, loot: 400 }).groups).toBe(1)
    // 往返 75 分、間隔 75 分不在選單裡；用 dist 8 → 單程 30:00、往返 60:00、間隔 60 → 剛好 1 組
    expect(farmingCalc({ ...base, dist: 8, freq: 60, loot: 400 }).groups).toBe(1)
    // 往返 75 分、間隔 30 → ⌈2.5⌉ = 3 組
    const r = farmingCalc({ ...base, freq: 30, loot: 400 })
    expect(r.groups).toBe(3)
    expect(r.perGroup).toBe(6)
    expect(r.totalTroops).toBe(18)
    // 每日收益只看間隔：400 × 48
    expect(r.daily).toBe(400 * 48)
  })
})

describe('parseFarmDistance', () => {
  it('empty / 0 / negative / text → null; integers and decimals OK', () => {
    expect(parseFarmDistance('')).toBeNull()
    expect(parseFarmDistance('  ')).toBeNull()
    expect(parseFarmDistance('0')).toBeNull()
    expect(parseFarmDistance('-3')).toBeNull()
    expect(parseFarmDistance('1a')).toBeNull()
    expect(parseFarmDistance('10')).toBe(10)
    expect(parseFarmDistance('010')).toBe(10)
    expect(parseFarmDistance('10.5')).toBe(10.5)
    expect(parseFarmDistance('１２')).toBe(12)
  })
})

describe('農場收益頁面', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('Peter 的輸入：01000000 離開欄位變成 1,000,000；摘要是組合，第二行是每日收益', () => {
    render(<MemoryRouter><FarmingCalculator /></MemoryRouter>)
    const loot = screen.getByLabelText('每次掠奪量估計') as HTMLInputElement
    expect(loot.type).toBe('text')
    expect(loot.inputMode).toBe('numeric')
    fireEvent.focus(loot)
    fireEvent.change(loot, { target: { value: '01000000' } })
    fireEvent.blur(loot)
    expect(loot.value).toBe('1,000,000')
    expect(screen.getByTestId('farming-composition')).toHaveTextContent('5 組 × 13,334 匹 = 66,670 匹')
    expect(screen.getByTestId('farming-daily-summary')).toHaveTextContent('每日收益 96,000,000')
    // 不再出現人口區間算出的「1 馬」
    expect(screen.queryByText('1 馬')).toBeNull()
    expect(screen.queryByLabelText('目標村人口')).toBeNull()
  })

  it('標題只有一句說明，下面一行灰字提醒填實際搶得到的量；人口規則只當攻略參考', () => {
    render(<MemoryRouter><FarmingCalculator /></MemoryRouter>)
    expect(screen.getByText('依每次搶的量和運載量算每組幾匹，再依往返時間算要幾組輪流派')).toBeInTheDocument()
    expect(screen.getByTestId('farming-loot-hint')).toHaveTextContent('每次掠奪量請填該農場實際搶得到的量')
    expect(screen.getByTestId('farming-loot-hint')).toHaveClass('text-muted-foreground')
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    expect(screen.getByTestId('farming-guide-ref')).toHaveTextContent(/^攻略參考.*只供參考，不用在計算。$/)
  })

  it('掠奪量清空 → 摘要「—」、不顯示「× 0 匹」；離開欄位維持空白（不補 0）；再填回來就恢復', () => {
    render(<MemoryRouter><FarmingCalculator /></MemoryRouter>)
    const loot = screen.getByLabelText('每次掠奪量估計') as HTMLInputElement
    fireEvent.focus(loot)
    fireEvent.change(loot, { target: { value: '' } })
    fireEvent.blur(loot)
    expect(loot.value).toBe('')
    expect(screen.getByTestId('farming-composition')).toHaveTextContent(/^—$/)
    expect(screen.getByTestId('calc-result-primary').textContent).not.toMatch(/×|匹/)
    expect(screen.getByTestId('farming-need-inputs')).toHaveTextContent('填好距離和每次掠奪量後顯示')
    expect(screen.queryByTestId('calc-result-toggle')).toBeNull()
    fireEvent.focus(loot)
    fireEvent.change(loot, { target: { value: '400' } })
    expect(screen.getByTestId('farming-composition')).toHaveTextContent('5 組 × 6 匹 = 30 匹')
  })

  it('掠奪量填 0（不是空白）→ 照算 0 兵', () => {
    render(<MemoryRouter><FarmingCalculator /></MemoryRouter>)
    const loot = screen.getByLabelText('每次掠奪量估計') as HTMLInputElement
    fireEvent.focus(loot)
    fireEvent.change(loot, { target: { value: '0' } })
    expect(screen.getByTestId('farming-composition')).toHaveTextContent('5 組 × 0 匹 = 0 匹')
  })

  it('距離清空 → 維持空白（不變 0）、不算，摘要「—」；離開欄位顯示紅字；填回來就恢復', () => {
    render(<MemoryRouter><FarmingCalculator /></MemoryRouter>)
    const dist = screen.getByLabelText('距離（格）') as HTMLInputElement
    expect(dist.type).toBe('text')
    expect(dist.value).toBe('10')
    fireEvent.change(dist, { target: { value: '' } })
    expect(dist.value).toBe('')
    expect(screen.getByTestId('farming-composition')).toHaveTextContent(/^—$/)
    expect(screen.getByTestId('farming-need-inputs')).toBeInTheDocument()
    expect(screen.queryByTestId('farming-dist-error')).toBeNull()
    fireEvent.blur(dist)
    expect(dist.value).toBe('')
    expect(screen.getByTestId('farming-dist-error')).toHaveTextContent('請輸入大於 0 的距離')
    expect(dist).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(dist, { target: { value: '10' } })
    expect(screen.queryByTestId('farming-dist-error')).toBeNull()
    expect(screen.getByTestId('farming-composition')).toHaveTextContent('5 組 × 6 匹 = 30 匹')
  })

  it('距離 0、負數、非數字 → 不算＋紅字；小數照算', () => {
    render(<MemoryRouter><FarmingCalculator /></MemoryRouter>)
    const dist = screen.getByLabelText('距離（格）') as HTMLInputElement
    for (const v of ['0', '-5', 'abc']) {
      fireEvent.change(dist, { target: { value: v } })
      expect(screen.getByTestId('farming-composition'), v).toHaveTextContent(/^—$/)
      expect(screen.getByTestId('farming-dist-error'), v).toBeInTheDocument()
    }
    fireEvent.change(dist, { target: { value: '10.5' } })
    expect(screen.queryByTestId('farming-dist-error')).toBeNull()
    expect(screen.getByTestId('farming-composition').textContent).toMatch(/組 × 6 匹/)
  })
})
