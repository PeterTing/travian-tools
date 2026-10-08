import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import i18n from '@/i18n/i18n'
import { ocrCutResponse, ocrLowResResponse } from '@/test/ocrFixtures'
import type { OcrRallyResponse } from '@/services/ocrApi'

const pasteApi = vi.hoisted(() => ({
  previewDiff: vi.fn().mockResolvedValue({
    success: true,
    message: 'ok',
    created: 3,
    updated: 0,
    total: 3,
  }),
}))
vi.mock('@/services/pasteApi', () => ({ pasteApi }))
import { ParseConfirmPanel, type ConfirmState } from '@/components/paste/ParseConfirmPanel'

const account = {
  account_id: 'acc-1',
  player_name: 'HandsomeTing',
  server_name: 'International 11',
  server_url: 'https://ts11.x1.international.travian.com',
} as never

function Harness({ res, onSave }: { res: OcrRallyResponse; onSave: () => Promise<void> }) {
  const [state, setState] = useState<ConfirmState>({
    pageType: 'rally_point',
    data: res.data,
    serverTime: res.server_time,
    source: 'ocr',
    ocr: {
      meta: res.ocr,
      images: [{ url: 'blob:shot', width: res.ocr.images[0].width, height: res.ocr.images[0].height }],
      timeSource: 'file',
    },
  })
  return (
    <ParseConfirmPanel
      account={account}
      state={state}
      villages={[]}
      villageId={null}
      onVillageIdChange={vi.fn()}
      captureAt={new Date(2026, 9, 6, 10, 29)}
      onCaptureAtChange={vi.fn()}
      onDiscard={vi.fn()}
      onSave={onSave}
      onDataChange={(data) => setState((s) => ({ ...s, data }))}
    />
  )
}

describe('ParseConfirmPanel — OCR low confidence (③\')', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('highlights low fields, blocks save until confirmed, then saves', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<Harness res={ocrLowResResponse} onSave={onSave} />)

    expect(screen.getByTestId('ocr-confirm-banner')).toHaveTextContent('有 1 個欄位要你確認')
    const save = screen.getByTestId('confirm-save')
    expect(save).toBeDisabled()
    expect(save).toHaveTextContent('還有 1 個要確認')
    expect(screen.getByTestId('ocr-time-source')).toHaveTextContent('截圖檔案的時間')

    const rows = screen.getAllByTestId('ocr-movement')
    expect(rows).toHaveLength(3)
    // 攻擊方座標一律附縮圖；低信心欄位有放大原處
    expect(within(rows[0]).getByTestId('ocr-thumb')).toBeInTheDocument()
    // 已確定欄位的縮圖用灰框，不跟要確認的黃框混
    expect(within(rows[0]).getByTestId('ocr-thumb')).toHaveAttribute('data-tone', 'neutral')
    const low = within(rows[1]).getByTestId('ocr-low-field')
    expect(low).toHaveAttribute('data-field', 'coords')
    expect(within(low).getByTestId('ocr-reason')).toHaveTextContent('放大重讀後結果不一樣')
    expect(within(low).getByTestId('ocr-crop')).toBeInTheDocument()

    const options = within(low).getAllByTestId('ocr-option')
    expect(options.length).toBeGreaterThanOrEqual(1)
    fireEvent.click(options[0])

    expect(screen.queryByTestId('ocr-confirm-banner')).not.toBeInTheDocument()
    expect(screen.getByTestId('ocr-all-confirmed')).toBeInTheDocument()
    expect(within(rows[1]).getByTestId('ocr-low-field')).toHaveAttribute('data-confirmed', 'true')
    const enabled = await screen.findByTestId('confirm-save')
    expect(enabled).not.toBeDisabled()
    fireEvent.click(enabled)
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled())
  })

  it('manual input replaces the value and confirms it', () => {
    render(<Harness res={ocrLowResResponse} onSave={vi.fn()} />)
    const low = screen.getAllByTestId('ocr-low-field')[0]
    fireEvent.click(within(low).getByTestId('ocr-manual'))
    const input = within(low).getByTestId('ocr-manual-input')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.click(within(low).getByText('確定'))
    expect(within(low).getByText(/座標格式像/)).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '(−45|13)' } })
    fireEvent.click(within(low).getByText('確定'))
    expect(screen.getAllByTestId('ocr-movement')[1]).toHaveTextContent('(\u221245|13)')
    expect(screen.getByTestId('confirm-save')).not.toBeDisabled()
  })

  it('待補 fields do not block saving', () => {
    render(<Harness res={ocrCutResponse} onSave={vi.fn()} />)
    expect(screen.queryByTestId('ocr-confirm-banner')).not.toBeInTheDocument()
    expect(screen.getByTestId('ocr-missing-note')).toHaveTextContent('有 2 個欄位讀不到')
    const row = screen.getAllByTestId('ocr-movement')[2]
    expect(within(row).getByTestId('ocr-missing-badge')).toHaveTextContent('待補')
    expect(within(row).getAllByTestId('ocr-missing-field')[0]).toHaveTextContent(
      '被截圖邊緣切掉了',
    )
    expect(screen.getByTestId('confirm-save')).not.toBeDisabled()
  })
})
