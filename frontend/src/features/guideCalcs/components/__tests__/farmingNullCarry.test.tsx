// 運載量留空的兵種（維京，P0-23 PM；2026-10-11 幕僚長：出處不明，退回待驗證；斯巴達 2026-10-11 在 ASIA x1 核對過，有數字）：農場收益不出數字，大數字換成灰字「無法計算」、第二行寫原因＋灰標、沒有「展開明細」；
// 換回其他部族的兵馬上恢復。目前農場收益的清單沒有斯巴達、維京（FARM_UNITS 6 種都是 ts11 兵），這裡用 units 換清單測這條路徑。
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import FarmingCalculator, { FARM_UNITS, farmUnit, farmingCalc } from '../FarmingCalculator'

vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null, birthTribe: null, multiTribe: false,
    offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined,
    selectVillage: () => undefined,
  }
  return { ...mod, useAutoFill: () => value }
})

const elpida = farmUnit(['elpida', 'spartans', 'elpida'])
const huskarl = farmUnit(['huskarl', 'vikings', 'huskarlRider'])
const base = { dist: 10, unitSpeed: 16, cost: 1000, freq: 15, loot: 400, serverSpeed: 1, arena: 0, boots: 0 }

describe('farming: unit with empty (null) carry', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('the real farming list has no Spartan / Viking unit (null path is not reachable from the page today)', () => {
    expect(FARM_UNITS.map((u) => u.tribeId)).not.toContain('spartans')
    expect(FARM_UNITS.map((u) => u.tribeId)).not.toContain('vikings')
    expect(FARM_UNITS.every((u) => typeof u.carry === 'number')).toBe(true)
  })

  it('Viking farm units carry null; Spartan units have the ASIA x1 number', () => {
    expect(elpida.carry).toBe(110)
    expect(huskarl.carry).toBeNull()
  })

  it('farmingCalc: carry null → carry cap, daily yield, payback are null (no number, never 0)', () => {
    const r = farmingCalc({ ...base, carry: null })
    expect(r.carryCap).toBeNull()
    expect(r.daily).toBeNull()
    expect(r.payback).toBeNull()
    expect(r.perGroup).toBeNull()
    expect(r.totalTroops).toBeNull()
    expect(farmingCalc({ ...base, carry: null, loot: 0 }).daily).toBeNull()
    const ok = farmingCalc({ ...base, carry: 75 })
    // ⌈400 ÷ 75⌉ = 6 匹 → 搬運上限 450
    expect(ok.carryCap).toBe(450)
    expect(typeof ok.daily).toBe('number')
  })

  it.each([
    ['Viking', huskarl, '維京運載量還沒核對', 'vikingCarry'],
  ] as const)('page: %s unit selected → 「無法計算」 grey, same size; reason 12px grey + chip; no 展開明細; switching back restores the number', (_label, u, reason, kind) => {
    render(<MemoryRouter><FarmingCalculator units={[u, ...FARM_UNITS]} /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('單位'), { target: { value: u.id } })
    const primary = screen.getByTestId('calc-result-primary')
    const na = within(primary).getByTestId('calc-unavailable')
    expect(na).toHaveTextContent(/^無法計算$/)
    expect(na).toHaveClass('text-slate-500')
    expect(na.className).not.toMatch(/red|destructive/)
    expect(primary.textContent).not.toMatch(/\d/)
    const r = screen.getByTestId('calc-unavailable-reason')
    expect(r).toHaveClass('text-[12px]', 'text-slate-500')
    expect(r).toHaveTextContent(reason)
    const chips = within(r).getAllByTestId('pending-verify-chip')
    expect(chips.map((c) => c.getAttribute('data-kind'))).toEqual([kind])
    expect(screen.queryByTestId('calc-result-toggle')).toBeNull()
    expect(screen.queryByTestId('calc-result-details')).toBeNull()
    // 單位選單裡的運載量也是「—」，不是 0
    expect(screen.getByRole('option', { name: new RegExp(`^${u.nameZh}`) }).textContent).toContain('運載 —')

    fireEvent.change(screen.getByLabelText('單位'), { target: { value: 'tt' } })
    expect(screen.queryByTestId('calc-unavailable')).toBeNull()
    expect(screen.getByTestId('calc-result-primary').textContent).toMatch(/^\d+ 組 × [\d,]+ 匹 = [\d,]+ 匹$/)
    expect(screen.getByTestId('calc-result-toggle')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('單位'), { target: { value: u.id } })
    expect(screen.getByTestId('calc-unavailable')).toBeInTheDocument()
  })
})
