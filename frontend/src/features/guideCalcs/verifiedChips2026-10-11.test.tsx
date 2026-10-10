import { beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import { ARENA_BOOTS_ADDITIVE_VERIFIED, ARENA_SPEED_VERIFIED, BOOTS_SPEED_VERIFIED, FIELD_LEVEL_ZERO_VERIFIED } from '@/lib/pendingNotes'

/**
 * 2026-10-11 待驗證清單（evidence/pending_crosscheck_2026-10-11.json）：真實資料、不 mock pendingNotes。
 * - 競技場單獨：遊戲內說明（20 格）＋官方知識庫（每級 +20%）→ 不放灰標
 * - 英雄靴子只加 20 格外：官方 S93＋S71（寫法不同、互不引用；#45 T6）→ 只有靴子時不放灰標
 * - 競技場＋靴子相加：只有 S71、沒實測（#45 幕僚長）→ 兩個都有時照舊放 arenaBootsSpeed
 * - 資源田 0 級 3／小時：EU12 遊戲內資源田頁 → 不放灰標
 */
vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null, birthTribe: null, multiTribe: false,
    offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined,
    selectVillage: () => undefined,
  }
  return { ...mod, useAutoFill: () => value }
})

describe('2026-10-11: arena alone, boots alone and level-0 fields carry no 待驗證 chip; arena + boots still does', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('flags are on', () => {
    expect(ARENA_SPEED_VERIFIED).toBe(true)
    expect(BOOTS_SPEED_VERIFIED).toBe(true)
    expect(ARENA_BOOTS_ADDITIVE_VERIFIED).toBe(false)
    expect(FIELD_LEVEL_ZERO_VERIFIED).toBe(true)
  })

  const renderPath = async (arena: string, boots: string) => {
    const { default: Path } = await import('@/pages/calculator/PathCalculatorPage')
    render(<MemoryRouter><Path /></MemoryRouter>)
    for (const id of ['path-start-x', 'path-start-y', 'path-target-x']) fireEvent.change(screen.getByTestId(id), { target: { value: '0' } })
    fireEvent.change(screen.getByTestId('path-target-y'), { target: { value: '60' } })
    fireEvent.change(within(screen.getByTestId('path-ts-level')).getByRole('combobox'), { target: { value: arena } })
    fireEvent.change(screen.getByLabelText(i18n.t('pathCalc.heroBonus')), { target: { value: boots } })
    const panel = screen.getByTestId('calc-result-panel')
    fireEvent.click(within(panel).getByTestId('calc-result-toggle'))
    return panel
  }

  it('march time: arena 20 alone -> no chip in the summary or the details', async () => {
    const panel = await renderPath('20', '0')
    expect(within(panel).queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    cleanup()
  })

  it('march time: arena 20 + boots 25 -> arenaBootsSpeed chip (additivity rests on S71 alone, unmeasured)', async () => {
    const panel = await renderPath('20', '25')
    const kinds = within(panel).queryAllByTestId('pending-verify-chip').map((c) => c.getAttribute('data-kind'))
    expect(kinds.length).toBeGreaterThan(0)
    expect(new Set(kinds)).toEqual(new Set(['arenaBootsSpeed']))
    cleanup()
  })

  it('march time: boots 25 alone -> no chip (S93 + S71, #45 T6)', async () => {
    const panel = await renderPath('0', '25')
    expect(within(panel).queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    cleanup()
  })

  it('farming: arena 5 (no boots) -> no speed chip', async () => {
    const { default: Farming } = await import('./components/FarmingCalculator')
    render(<MemoryRouter><Farming /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/競技場/), { target: { value: '5' } })
    expect(screen.queryAllByTestId('pending-verify-chip').filter((c) => /Speed/.test(c.getAttribute('data-kind') ?? ''))).toHaveLength(0)
    cleanup()
  })

  it('field ROI: target level 1 (0 -> 1) -> no fieldLevelZero chip', async () => {
    const { default: FieldRoi } = await import('./components/FieldRoiCalculator')
    render(<MemoryRouter><FieldRoi /></MemoryRouter>)
    fireEvent.change(screen.getByDisplayValue('7 級'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    expect(screen.queryAllByTestId('pending-verify-chip').filter((c) => c.getAttribute('data-kind') === 'fieldLevelZero')).toHaveLength(0)
    cleanup()
  })
})
