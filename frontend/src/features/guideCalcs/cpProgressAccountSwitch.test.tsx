import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import type { GameAccount } from '@/types/game'

const fill = vi.hoisted(() => ({ value: null as unknown as AutoFillValue }))
vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  return { ...mod, useAutoFill: () => fill.value }
})

import PassiveCpCalculator from './components/PassiveCpCalculator'
import { writeCpProgress } from '@/lib/cpProgress'
import { startCp } from '../../data/gameData'
import CpCard from '@/components/home/CpCard'

const acct = (id: string) => ({ account_id: id, server_speed: 1, server_name: 'ts11', player_name: id }) as unknown as GameAccount
const fillFor = (id: string | null): AutoFillValue => ({
  account: id ? acct(id) : null,
  village: null,
  villages: [],
  speed: 1,
  tribe: null,
  accountSpeed: 1,
  accountTribe: null,
  offsetHours: null,
  overrides: {},
  setOverride: () => undefined,
  clearOverride: () => undefined,
  selectVillage: () => undefined,
})
const page = () => <MemoryRouter><PassiveCpCalculator /></MemoryRouter>
const cpInput = () => screen.getByTestId('cp-current') as HTMLInputElement
const saved = (id: string) => {
  const raw = localStorage.getItem(`tt:cpProgress:${id}`)
  return raw ? JSON.parse(raw) : null
}

describe('CP 與開村：換帳號不會把上一個帳號的 CP 存進新帳號', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })
  beforeEach(() => {
    localStorage.clear()
  })

  it('type on a1, switch to a2 (never saved): a2 not written, a1 kept, a2 form shows defaults', () => {
    fill.value = fillFor('a1')
    const { rerender } = render(page())
    expect(saved('a1')).toBeNull()
    fireEvent.change(cpInput(), { target: { value: '1234' } })
    expect(saved('a1')?.currentCp).toBe(1234)

    fill.value = fillFor('a2')
    rerender(page())
    expect(saved('a2')).toBeNull()
    expect(saved('a1')?.currentCp).toBe(1234)
    // x1 起始 CP（預設值），不是 a1 打的 1234
    expect(cpInput().value).not.toBe('1234')
    expect(cpInput().value).toBe(String(startCp(1)))
  })

  it('type on a1, switch to a2 (saved before): a2 form shows its own value, a2 storage untouched', () => {
    writeCpProgress('a2', { currentCp: 777, dailyCp: 600, speed: 1 })
    const before = localStorage.getItem('tt:cpProgress:a2')
    fill.value = fillFor('a1')
    const { rerender } = render(page())
    fireEvent.change(cpInput(), { target: { value: '1234' } })

    fill.value = fillFor('a2')
    rerender(page())
    expect(localStorage.getItem('tt:cpProgress:a2')).toBe(before)
    expect(saved('a1')?.currentCp).toBe(1234)
    expect(cpInput().value).toBe('777')

    // a2 上自己動過才寫 a2
    fireEvent.change(cpInput(), { target: { value: '900' } })
    expect(saved('a2')?.currentCp).toBe(900)
    expect(saved('a2')?.dailyCp).toBe(600)
    expect(saved('a1')?.currentCp).toBe(1234)
  })
})

describe('CP 與開村：第一次進來就讀回這個帳號上次存的數字', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })
  beforeEach(() => {
    localStorage.clear()
    // 其他村每日 CP＝600 − 這村預設配置 529＝71
    writeCpProgress('a1', { currentCp: 1234, dailyCp: 600, speed: 1 })
  })

  it('direct open: account loads after the first render → form shows the saved CP', () => {
    const before = localStorage.getItem('tt:cpProgress:a1')
    fill.value = fillFor(null)
    const { rerender } = render(page())
    fill.value = fillFor('a1')
    rerender(page())
    expect(cpInput().value).toBe('1234')
    expect((screen.getByTestId('cp-other') as HTMLInputElement).value).toBe('71')
    // 只是讀回來，沒有動過輸入，不重寫
    expect(localStorage.getItem('tt:cpProgress:a1')).toBe(before)
  })

  it('account already loaded on the first render (opened again after home) → form shows the saved CP', () => {
    const before = localStorage.getItem('tt:cpProgress:a1')
    fill.value = fillFor('a1')
    render(page())
    expect(cpInput().value).toBe('1234')
    expect((screen.getByTestId('cp-other') as HTMLInputElement).value).toBe('71')
    expect(localStorage.getItem('tt:cpProgress:a1')).toBe(before)
  })

  it('from home: tap 開村卡「去算 ›」 with the account already loaded → form shows the saved CP', () => {
    fill.value = fillFor('a1')
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<CpCard accountId="a1" villageCount={2} speed={1} />} />
          <Route path="/calculator/passive-cp" element={<PassiveCpCalculator />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('cp-card-go'))
    expect(cpInput().value).toBe('1234')
    expect((screen.getByTestId('cp-other') as HTMLInputElement).value).toBe('71')
  })
})
