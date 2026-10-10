import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { makeAccount } from '@/test/accountFixtures'
import { makeOpeningChecklist } from '@/test/openingChecklistFixture'
import type { GameAccount } from '@/types/game'
import type { OpeningProgress, OpeningStrategyId } from '@/types/openingChecklist'

const authApi = vi.hoisted(() => ({
  isAuthenticated: vi.fn(() => true),
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))
// 假後端：進度按「帳號／攻略」分開存（後端還會再分世界，見 backend 測試）
const db = vi.hoisted(() => ({
  accounts: [] as GameAccount[],
  progress: {} as Record<string, string[]>,
}))
const gameAccountApi = vi.hoisted(() => ({
  getAll: vi.fn(async () => {
    const accounts = db.accounts.filter((a) => a.is_active)
    return { accounts, total: accounts.length }
  }),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))
const openingChecklistApi = vi.hoisted(() => {
  const answer = (accountId: string, strategy: OpeningStrategyId): OpeningProgress => {
    const ids = db.progress[`${accountId}/${strategy}`] ?? []
    return {
      account_id: accountId,
      world_id: `world-${accountId}`,
      strategy,
      checked_step_ids: ids,
      required_checked: ids.length,
      required_total: 0,
      optional_checked: 0,
      optional_total: 0,
    }
  }
  return {
    getChecklist: vi.fn(),
    getProgress: vi.fn(async (accountId: string, strategy: OpeningStrategyId) => answer(accountId, strategy)),
    setStep: vi.fn(async (accountId: string, strategy: OpeningStrategyId, stepId: string, checked: boolean) => {
      const key = `${accountId}/${strategy}`
      const ids = new Set(db.progress[key] ?? [])
      if (checked) ids.add(stepId)
      else ids.delete(stepId)
      db.progress[key] = [...ids]
      return answer(accountId, strategy)
    }),
  }
})
vi.mock('@/services/authApi', () => ({ default: authApi }))
vi.mock('@/services/gameAccountApi', () => ({ gameAccountApi }))
vi.mock('@/services/openingChecklistApi', () => ({ openingChecklistApi }))
vi.mock('@/services/gameWorldApi', () => ({
  gameWorldApi: { getAll: vi.fn(async () => ({ worlds: [], total: 0 })), update: vi.fn() },
}))
vi.mock('@/services/extensionBridge', () => ({
  shareLoginWithExtension: vi.fn(async () => undefined),
  clearExtensionLogin: vi.fn(async () => undefined),
  sendSelectedAccountToExtension: vi.fn(async () => 0),
}))

import App from '@/App'

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/strategy/opening']}>
      <App />
    </MemoryRouter>
  )

const progressText = () => screen.getByText(/步 · 內容來自 Peter 的 Excel/)
const sectionButton = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) })
// 進度讀完、預設段落展開後才有勾選框
const loaded = () => waitFor(() => expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0))

describe('起手式清單 (P0-10)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    localStorage.clear()
    openingChecklistApi.getProgress.mockClear()
    openingChecklistApi.setStep.mockClear()
    openingChecklistApi.getChecklist.mockResolvedValue(makeOpeningChecklist())
    authApi.getMe.mockResolvedValue({ user_id: 'user-1', username: 'peter' })
    db.accounts = [
      makeAccount(),
      makeAccount({ account_id: 'acc-ts5', server_name: 'ts5', tribe: 'teutons' }),
    ]
    db.progress = {}
  })

  it('puts the strategy switch and the tribe filter at the top, tribe from the account', async () => {
    renderPage()
    await loaded()
    expect(screen.getByRole('heading', { name: '起手式' })).toBeInTheDocument()
    const strategies = screen.getByRole('radiogroup', { name: '攻略' })
    expect(within(strategies).getByRole('radio', { name: '4P 農開' })).toHaveAttribute('aria-checked', 'true')
    expect(within(strategies).getByRole('radio', { name: '3P 兵開' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('combobox', { name: '部族' })).toHaveValue('gauls')
    expect(progressText()).toHaveTextContent('0 / 5 步 · 內容來自 Peter 的 Excel')
    expect(screen.getByText('PeterT · ts3 的進度')).toBeInTheDocument()
  })

  it('shows building, target, cost, rewards, and 為什麼 only when there is advice', async () => {
    renderPage()
    await loaded()
    const first = screen.getByRole('checkbox', { name: '完成：村莊大樓 升到 1' }).closest('li')!
    expect(first).toHaveTextContent('獎勵 600 資源 · 10 經驗')
    expect(first).toHaveTextContent('文明點 +2')
    expect(first).toHaveTextContent('為什麼：派英雄去最短的冒險拿馬。')
    const second = screen.getByRole('checkbox', { name: '完成：伐木場 1 座升到 2' }).closest('li')!
    expect(second).toHaveTextContent('花費 260')
    expect(second).not.toHaveTextContent('為什麼')
  })

  it('expands only the first unfinished section; others show how many steps are left', async () => {
    renderPage()
    await loaded()
    expect(sectionButton('任務等級 1')).toHaveAttribute('aria-expanded', 'true')
    expect(sectionButton('任務等級 2')).toHaveAttribute('aria-expanded', 'false')
    expect(sectionButton('任務等級 2')).toHaveTextContent('…還有 3 步')
    expect(screen.queryByRole('checkbox', { name: /泥坑/ })).not.toBeInTheDocument()

    fireEvent.click(sectionButton('任務等級 2'))
    expect(screen.getByRole('checkbox', { name: '完成：泥坑 升到 1' })).toBeInTheDocument()
  })

  it('opens the next section when the first one is already done', async () => {
    db.progress['acc-ts3/4p-farm'] = ['r003', 'r004']
    renderPage()
    await waitFor(() => expect(progressText()).toHaveTextContent('2 / 5 步'))
    expect(sectionButton('任務等級 1')).toHaveAttribute('aria-expanded', 'false')
    expect(sectionButton('任務等級 1')).toHaveTextContent('這段都做完了')
    expect(sectionButton('任務等級 2')).toHaveAttribute('aria-expanded', 'true')
  })

  it('the optional section has its own count and never moves the main progress', async () => {
    renderPage()
    await loaded()
    const optional = sectionButton('選做：便宜的文明點建築')
    expect(optional).toHaveTextContent('選做 0 / 2')
    expect(optional).toHaveTextContent('…還有 2 步')
    fireEvent.click(optional)
    fireEvent.click(screen.getByRole('checkbox', { name: '完成：大使館 升到 1' }))
    await waitFor(() => expect(openingChecklistApi.setStep).toHaveBeenLastCalledWith('acc-ts3', '4p-farm', 'r095', true))
    expect(sectionButton('選做：便宜的文明點建築')).toHaveTextContent('選做 1 / 2')
    expect(progressText()).toHaveTextContent('0 / 5 步')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('all required steps done is 100% even with no optional step done', async () => {
    db.progress['acc-ts3/4p-farm'] = ['r003', 'r004', 'r010', 'r058', 'r084']
    renderPage()
    await waitFor(() => expect(progressText()).toHaveTextContent('5 / 5 步'))
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '5')
    expect(bar).toHaveAttribute('aria-valuemax', '5')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%')
    expect(sectionButton('選做：便宜的文明點建築')).toHaveTextContent('選做 0 / 2')
  })

  it('checks and unchecks a step, strikes it through, and saves it for this account and strategy', async () => {
    renderPage()
    await loaded()
    const box = screen.getByRole('checkbox', { name: '完成：伐木場 1 座升到 2' })
    fireEvent.click(box)
    expect(box).toBeChecked()
    expect(box.closest('li')!.querySelector('s')).toHaveTextContent('伐木場 1 座升到 2')
    await waitFor(() => expect(progressText()).toHaveTextContent('1 / 5 步'))
    expect(openingChecklistApi.setStep).toHaveBeenLastCalledWith('acc-ts3', '4p-farm', 'r004', true)

    fireEvent.click(box)
    expect(box).not.toBeChecked()
    expect(box.closest('li')!.querySelector('s')).toBeNull()
    expect(openingChecklistApi.setStep).toHaveBeenLastCalledWith('acc-ts3', '4p-farm', 'r004', false)
    await waitFor(() => expect(progressText()).toHaveTextContent('0 / 5 步'))
  })

  it('reverts the tick and says so when saving fails', async () => {
    openingChecklistApi.setStep.mockRejectedValueOnce(new Error('offline'))
    renderPage()
    await loaded()
    const box = screen.getByRole('checkbox', { name: '完成：伐木場 1 座升到 2' })
    fireEvent.click(box)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('沒存到，請再試一次。'))
    expect(box).not.toBeChecked()
  })

  it('switching to 3P shows that strategy and its own progress', async () => {
    db.progress['acc-ts3/3p-sim'] = ['r005']
    renderPage()
    await loaded()
    fireEvent.click(screen.getByRole('radio', { name: '3P 兵開' }))
    await waitFor(() => expect(progressText()).toHaveTextContent('1 / 2 步'))
    expect(openingChecklistApi.getProgress).toHaveBeenLastCalledWith('acc-ts3', '3p-sim')
    expect(screen.getByRole('checkbox', { name: '完成：鐵礦場 升到 1' })).toBeChecked()
    expect(screen.queryByText('任務等級 2')).not.toBeInTheDocument()
  })

  it('the tribe filter only changes tribe-dependent fields', async () => {
    db.progress['acc-ts3/4p-farm'] = ['r003', 'r004']
    renderPage()
    await waitFor(() => expect(progressText()).toHaveTextContent('2 / 5 步'))
    const settlers = () => screen.getByRole('checkbox', { name: '完成：開拓者 ×1' }).closest('li')!
    expect(settlers()).toHaveTextContent('花費 18,100')
    const warehouse = () => screen.getByRole('checkbox', { name: '完成：倉庫 升到 5' }).closest('li')!
    expect(warehouse()).toHaveTextContent('這個部族不用做，可以直接勾掉')

    fireEvent.change(screen.getByRole('combobox', { name: '部族' }), { target: { value: 'teutons' } })
    expect(settlers()).toHaveTextContent('花費 20,000')
    fireEvent.change(screen.getByRole('combobox', { name: '部族' }), { target: { value: 'romans' } })
    expect(warehouse()).toHaveTextContent('花費 2,010')
    expect(warehouse()).not.toHaveTextContent('不用做')
    fireEvent.change(screen.getByRole('combobox', { name: '部族' }), { target: { value: 'vikings' } })
    expect(settlers()).toHaveTextContent('Excel 沒有這個部族的開拓者花費')
    // 步驟數不變
    expect(progressText()).toHaveTextContent('2 / 5 步')
  })

  it('switching account loads that account + world progress and its tribe', async () => {
    db.progress['acc-ts5/4p-farm'] = ['r003']
    renderPage()
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: '目前世界：ts3' }))
    const sheet = screen.getByRole('dialog', { name: '切換帳號和世界' })
    fireEvent.click(within(sheet).getByText(/^日耳曼人/))
    await waitFor(() => expect(progressText()).toHaveTextContent('1 / 5 步'))
    expect(openingChecklistApi.getProgress).toHaveBeenLastCalledWith('acc-ts5', '4p-farm')
    expect(screen.getByRole('combobox', { name: '部族' })).toHaveValue('teutons')
    expect(screen.getByText('PeterT · ts5 的進度')).toBeInTheDocument()
  })

  it('keeps 參考 collapsed until asked, then shows the static tables', async () => {
    renderPage()
    await loaded()
    const reference = screen.getByRole('button', { name: /^參考/ })
    expect(reference).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('派對與文明點時間')).not.toBeInTheDocument()

    fireEvent.click(reference)
    expect(screen.getByText('派對與文明點時間')).toBeInTheDocument()
    expect(screen.getByText('到第 1 場派對')).toBeInTheDocument()
    expect(screen.getByText('還差 1,109.75 文明點')).toBeInTheDocument()
    // 還差 ≤ 0（-1.25、0）不顯示負數，改寫「已達」
    expect(screen.getAllByText('已達')).toHaveLength(2)
    expect(screen.queryByText(/還差 [−-]/)).not.toBeInTheDocument()
    expect(screen.queryByText(/還差 0 文明點/)).not.toBeInTheDocument()
    expect(screen.getByText('每日 50')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '帳號的任務' }))
    expect(screen.getByText('英雄等級')).toBeInTheDocument()
  })

  it('without a game account, asks to add one and disables the checkboxes', async () => {
    db.accounts = []
    renderPage()
    await loaded()
    expect(screen.getByRole('link', { name: '新增遊戲帳號' })).toHaveAttribute('href', '/game-accounts/new')
    expect(screen.getByRole('checkbox', { name: '完成：村莊大樓 升到 1' })).toBeDisabled()
    expect(openingChecklistApi.getProgress).not.toHaveBeenCalled()
  })

  it('the 攻略 menu only has 起手式 (no empty knowledge-base entry)', async () => {
    renderPage()
    await loaded()
    const menuLinks = screen.getAllByRole('link', { name: '起手式' })
    expect(menuLinks.length).toBeGreaterThan(0)
    for (const link of menuLinks) expect(link).toHaveAttribute('href', '/strategy/opening')
    expect(screen.queryByRole('link', { name: /知識庫|健康檢查/ })).not.toBeInTheDocument()
  })
})
