import { beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import { ARENA_BOOTS_VERIFIED, FIELD_LEVEL_ZERO_VERIFIED } from '@/lib/pendingNotes'

/**
 * 2026-10-11 待驗證清單（evidence/pending_crosscheck_2026-10-11.json）：真實資料、不 mock pendingNotes。
 * - 競技場、英雄靴子：遊戲內說明（20 格）＋官方知識庫（每級 +20%）＋官方 S71（靴子只加 20 格外、跟競技場相加）→ 不放灰標
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

describe('2026-10-11 verified: arena / boots and level-0 fields carry no 待驗證 chip', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('flags are on', () => {
    expect(ARENA_BOOTS_VERIFIED).toBe(true)
    expect(FIELD_LEVEL_ZERO_VERIFIED).toBe(true)
  })

  it('march time: arena 20 + boots 25 -> no chip in the summary or the details', async () => {
    const { default: Path } = await import('@/pages/calculator/PathCalculatorPage')
    render(<MemoryRouter><Path /></MemoryRouter>)
    for (const id of ['path-start-x', 'path-start-y', 'path-target-x']) fireEvent.change(screen.getByTestId(id), { target: { value: '0' } })
    fireEvent.change(screen.getByTestId('path-target-y'), { target: { value: '60' } })
    fireEvent.change(within(screen.getByTestId('path-ts-level')).getByRole('combobox'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(i18n.t('pathCalc.heroBonus')), { target: { value: '25' } })
    const panel = screen.getByTestId('calc-result-panel')
    fireEvent.click(within(panel).getByTestId('calc-result-toggle'))
    expect(within(panel).queryAllByTestId('pending-verify-chip')).toHaveLength(0)
    cleanup()
  })

  it('farming: arena 5 + boots 25 -> no chip', async () => {
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
