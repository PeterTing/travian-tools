// 貿易路線頁首說明的交易所每級加成跟計算用同一組常數（P0-23 設計師）：常數改了說明跟著改
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import TraderouteCalculator from '../TraderouteCalculator'
import { TRADE_OFFICE_PER_LEVEL_DEFAULT, TRADE_OFFICE_PER_LEVEL_ROMAN } from '../../data/travian'

vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null, birthTribe: null, multiTribe: false,
    offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined,
    selectVillage: () => undefined,
  }
  return { ...mod, useAutoFill: () => value }
})

describe('Trade route header: Trade Office per-level bonus', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('says 20% (Romans 40%), from the same constants the calculation uses', () => {
    expect([TRADE_OFFICE_PER_LEVEL_DEFAULT, TRADE_OFFICE_PER_LEVEL_ROMAN]).toEqual([0.2, 0.4])
    render(<MemoryRouter><TraderouteCalculator /></MemoryRouter>)
    const intro = screen.getByRole('heading', { name: '貿易路線' }).parentElement!
    expect(intro).toHaveTextContent('交易所每級多 20% 容量（羅馬人每級 40%）')
    expect(intro.textContent).not.toMatch(/10%|每級 20%）/)
  })
})
