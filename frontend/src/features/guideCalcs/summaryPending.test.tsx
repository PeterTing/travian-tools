import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import { SUMMARY_PENDING } from './summaryPending'

// 沒登入、沒帳號：計算器用預設輸入
vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null,
    offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined,
    selectVillage: () => undefined,
  }
  return { ...mod, useAutoFill: () => value }
})

const sources = import.meta.glob(['/src/features/**/*.tsx', '/src/pages/**/*.tsx', '/src/components/**/*.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const calculators = import.meta.glob('/src/features/guideCalcs/components/*Calculator.tsx', {
  import: 'default',
  eager: true,
}) as Record<string, ComponentType>

const rel = (p: string) => p.replace(/^\/src\//, '')

const usesPanel = Object.entries(sources)
  .filter(([p, src]) => !p.includes('.test.') && !p.endsWith('CalcResultPanel.tsx') && /<CalcResultPanel\b/.test(src))
  .map(([p]) => rel(p))

/** 手機寬度、明細收合：只看得到摘要（標題、大數字、第二行） */
function summaryChipKinds(): string[] {
  const panel = screen.getByTestId('calc-result-panel')
  return within(panel)
    .queryAllByTestId('pending-verify-chip')
    .filter((c) => !c.closest('[data-testid="calc-result-details"]'))
    .map((c) => c.getAttribute('data-kind') ?? '')
}

describe('結果摘要：用到待驗證資料的數字，收合時旁邊也有灰標（P0-17 PM 規則）', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('every page that renders CalcResultPanel is declared in SUMMARY_PENDING (new pages must declare)', () => {
    expect(usesPanel.length).toBeGreaterThanOrEqual(9)
    for (const p of usesPanel) expect(SUMMARY_PENDING[p], `${p} 沒登記在 summaryPending.ts`).toBeDefined()
    for (const p of Object.keys(SUMMARY_PENDING)) expect(usesPanel, `${p} 登記了但沒用 CalcResultPanel`).toContain(p)
  })

  for (const [path, decl] of Object.entries(SUMMARY_PENDING)) {
    const Comp = calculators[`/src/${path}`]
    if (!Comp) continue // 計算器頁面（PathCalculatorPage）要 API，見上面登記；它摘要沒用到待驗證資料
    it(`390 collapsed: ${path.split('/').pop()} summary chips = [${decl.kinds.join(', ')}]`, () => {
      render(<MemoryRouter><Comp /></MemoryRouter>)
      expect(screen.getByTestId('calc-result-details').closest('[hidden]')).not.toBeNull()
      expect(summaryChipKinds().sort()).toEqual([...decl.kinds].sort())
      // 灰標放在標籤（標題或第二行的字）旁邊，不放在大數字旁
      expect(within(screen.getByTestId('calc-result-primary')).queryByTestId('pending-verify-chip')).toBeNull()
      cleanup()
    })
  }
})

describe('結果面板高度上限：手機最多半個螢幕，超過就在面板內捲動', () => {
  const css = readFileSync(resolve(__dirname, 'components/calc.module.css'), 'utf8')
  // 不在 @media 裡的 .output 規則（手機）合起來看
  const outputRule = [...css.matchAll(/(^|\n)\.output\s*\{([^}]*)\}/g)].map((m) => m[2]).join('\n')

  it('.output: max-height min(50vh, 22rem) and overflow-y auto', () => {
    expect(outputRule).toMatch(/max-height:\s*min\(50vh,\s*22rem\)/)
    expect(outputRule).toMatch(/overflow-y:\s*auto/)
  })
})
