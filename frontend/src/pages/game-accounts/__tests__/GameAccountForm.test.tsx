import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import { makeAccount } from '@/test/accountFixtures'

const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))
vi.mock('@/services/gameAccountApi', () => ({ gameAccountApi: api }))
vi.mock('@/lib/accountDisplay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/accountDisplay')>()),
  browserTimeZone: () => 'Asia/Taipei',
}))

import GameAccountForm from '../GameAccountForm'

const GAME_URL = 'https://ts20.x3.europe.travian.com/dorf1.php?newdid=12345'

const renderForm = (account = null as ReturnType<typeof makeAccount> | null) => {
  const onSuccess = vi.fn()
  render(<GameAccountForm account={account} onSuccess={onSuccess} onCancel={vi.fn()} />)
  return { onSuccess }
}

const fillRequired = ({ url = GAME_URL, tribe = 'gauls', name = 'PeterT' } = {}) => {
  fireEvent.change(screen.getByLabelText(/^世界/), { target: { value: url } })
  if (tribe) fireEvent.change(screen.getByLabelText(/^部族/), { target: { value: tribe } })
  if (name) fireEvent.change(screen.getByLabelText(/^遊戲內名稱/), { target: { value: name } })
}

const save = () => fireEvent.click(screen.getByRole('button', { name: '儲存' }))
const moreToggle = () => screen.getByRole('button', { name: /更多設定（選填）/ })

describe('GameAccountForm', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  beforeEach(() => {
    api.create.mockReset().mockResolvedValue(makeAccount())
    api.update.mockReset().mockResolvedValue(makeAccount())
  })

  it('asks for exactly three things: 世界, 部族 and 遊戲內名稱', () => {
    const { container } = render(<GameAccountForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    const required = Array.from(container.querySelectorAll('label'))
      .map((l) => l.textContent ?? '')
      .filter((text) => text.endsWith('*'))
    expect(required).toEqual(['世界 *', '部族 *', '遊戲內名稱 *'])
  })

  it('keeps 更多設定（選填） collapsed until opened', () => {
    renderForm()
    expect(moreToggle()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByLabelText('伺服器名稱')).not.toBeVisible()
    expect(screen.getByLabelText('遊戲裡顯示的時間')).not.toBeVisible()
    fireEvent.click(moreToggle())
    expect(moreToggle()).toHaveAttribute('aria-expanded', 'true')
    for (const label of ['伺服器名稱', '伺服器速度', '伺服器開始日期', '聯盟名稱', '遊戲裡顯示的時間']) {
      expect(screen.getByLabelText(label)).toBeVisible()
    }
  })

  it('accepts a pasted game URL, shows what it will save, and auto-fills name and speed', async () => {
    const { onSuccess } = renderForm()
    fillRequired()
    expect(screen.getByTestId('world-hint')).toHaveTextContent(
      '會存成 https://ts20.x3.europe.travian.com · ts20 歐洲服 · 3 倍速'
    )
    save()
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        server_url: 'https://ts20.x3.europe.travian.com',
        tribe: 'gauls',
        player_name: 'PeterT',
        server_name: 'ts20 歐洲服',
        server_speed: 3,
      })
    )
  })

  it('lets 更多設定 override the auto-filled name and speed', async () => {
    renderForm()
    fillRequired()
    fireEvent.click(moreToggle())
    expect(screen.getByLabelText('伺服器名稱')).toHaveAttribute('placeholder', '自動：ts20 歐洲服')
    fireEvent.change(screen.getByLabelText('伺服器名稱'), { target: { value: '我的速服' } })
    fireEvent.change(screen.getByLabelText('伺服器速度'), { target: { value: '5' } })
    save()
    await waitFor(() => expect(api.create).toHaveBeenCalled())
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ server_name: '我的速服', server_speed: 5 })
    )
  })

  it.each([
    [{ url: '' }, '請填世界（貼上遊戲網址也可以）'],
    [{ url: 'not a url' }, '看不懂這個網址'],
    [{ tribe: '' }, '請選部族'],
    [{ name: '' }, '請填遊戲內名稱'],
  ])('requires the three fields (%j)', async (missing, message) => {
    renderForm()
    fillRequired(missing)
    save()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(api.create).not.toHaveBeenCalled()
  })

  it('never asks for a game password', () => {
    const { container } = render(<GameAccountForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(moreToggle())
    expect(container.querySelector('input[type="password"]')).toBeNull()
    const labels = Array.from(container.querySelectorAll('label')).map((l) => l.textContent)
    expect(labels.some((text) => text?.includes('密碼'))).toBe(false)
  })
})

describe('GameAccountForm time display (account setting, in 更多設定)', () => {
  beforeEach(() => {
    api.create.mockReset().mockResolvedValue(makeAccount())
    api.update.mockReset().mockResolvedValue(makeAccount())
  })

  it('offers ask-later, server time and my local time with the browser zone', () => {
    renderForm()
    const select = screen.getByLabelText('遊戲裡顯示的時間') as HTMLSelectElement
    expect(select.value).toBe('')
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      '第一次貼上時再問',
      '伺服器時間',
      '我的本地時間（Asia/Taipei）',
    ])
  })

  it('sends null when left on 第一次貼上時再問', async () => {
    const { onSuccess } = renderForm()
    fillRequired()
    save()
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ time_display: null, local_timezone: null })
    )
  })

  it('sends the browser time zone with 我的本地時間', async () => {
    renderForm()
    fillRequired()
    fireEvent.click(moreToggle())
    fireEvent.change(screen.getByLabelText('遊戲裡顯示的時間'), { target: { value: 'local' } })
    save()
    await waitFor(() => expect(api.create).toHaveBeenCalled())
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ time_display: 'local', local_timezone: 'Asia/Taipei' })
    )
  })

  it('keeps the saved zone and can switch to server time when editing', async () => {
    renderForm(makeAccount({ time_display: 'local', local_timezone: 'Europe/Berlin' }))
    const select = screen.getByLabelText('遊戲裡顯示的時間') as HTMLSelectElement
    expect(select.value).toBe('local')
    expect(select.selectedOptions[0].textContent).toBe('我的本地時間（Europe/Berlin）')
    fireEvent.change(select, { target: { value: 'server' } })
    save()
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    expect(api.update).toHaveBeenCalledWith(
      'acc-ts3',
      expect.objectContaining({ time_display: 'server', local_timezone: null })
    )
  })

  describe('editing the world URL', () => {
    const asiaTs3 = () =>
      makeAccount({
        server_url: 'https://ts3.x1.asia.travian.com',
        server_name: 'ts3 亞洲服',
        server_speed: 1,
      })

    it('treats the saved auto name and speed as automatic', () => {
      renderForm(asiaTs3())
      expect((screen.getByLabelText('伺服器名稱') as HTMLInputElement).value).toBe('')
      expect(screen.getByLabelText('伺服器名稱')).toHaveAttribute('placeholder', '自動：ts3 亞洲服')
      expect((screen.getByLabelText('伺服器速度') as HTMLSelectElement).value).toBe('')
    })

    it('re-derives name and speed from the new URL', async () => {
      renderForm(asiaTs3())
      fireEvent.change(screen.getByLabelText(/^世界/), { target: { value: GAME_URL } })
      expect(screen.getByTestId('world-hint')).toHaveTextContent('ts20 歐洲服 · 3 倍速')
      save()
      await waitFor(() => expect(api.update).toHaveBeenCalled())
      expect(api.update).toHaveBeenCalledWith(
        'acc-ts3',
        expect.objectContaining({
          server_url: 'https://ts20.x3.europe.travian.com',
          server_name: 'ts20 歐洲服',
          server_speed: 3,
        })
      )
    })

    it('also drops an old hand-typed name and speed nobody touched in this edit', async () => {
      renderForm(makeAccount({ server_url: 'https://ts3.x1.asia.travian.com', server_name: '主服', server_speed: 2 }))
      expect((screen.getByLabelText('伺服器名稱') as HTMLInputElement).value).toBe('主服')
      fireEvent.change(screen.getByLabelText(/^世界/), { target: { value: GAME_URL } })
      expect((screen.getByLabelText('伺服器名稱') as HTMLInputElement).value).toBe('')
      expect((screen.getByLabelText('伺服器速度') as HTMLSelectElement).value).toBe('')
      save()
      await waitFor(() => expect(api.update).toHaveBeenCalled())
      expect(api.update).toHaveBeenCalledWith(
        'acc-ts3',
        expect.objectContaining({ server_name: 'ts20 歐洲服', server_speed: 3 })
      )
    })

    it('keeps values typed in this edit when the URL changes', async () => {
      renderForm(asiaTs3())
      fireEvent.click(moreToggle())
      fireEvent.change(screen.getByLabelText('伺服器名稱'), { target: { value: '我的速服' } })
      fireEvent.change(screen.getByLabelText('伺服器速度'), { target: { value: '5' } })
      fireEvent.change(screen.getByLabelText(/^世界/), { target: { value: GAME_URL } })
      save()
      await waitFor(() => expect(api.update).toHaveBeenCalled())
      expect(api.update).toHaveBeenCalledWith(
        'acc-ts3',
        expect.objectContaining({ server_name: '我的速服', server_speed: 5 })
      )
    })

    it('keeps name and speed when only the path changes', async () => {
      renderForm(makeAccount({ server_url: 'https://ts3.x1.asia.travian.com', server_name: '主服', server_speed: 2 }))
      fireEvent.change(screen.getByLabelText(/^世界/), {
        target: { value: 'https://ts3.x1.asia.travian.com/dorf2.php' },
      })
      save()
      await waitFor(() => expect(api.update).toHaveBeenCalled())
      expect(api.update).toHaveBeenCalledWith(
        'acc-ts3',
        expect.objectContaining({ server_name: '主服', server_speed: 2 })
      )
    })
  })
})
