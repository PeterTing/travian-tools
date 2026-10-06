import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { ocrLowResResponse } from '@/test/ocrFixtures'

const pasteApi = vi.hoisted(() => ({
  preview: vi.fn(),
  listMovements: vi.fn().mockResolvedValue({ movements: [] }),
}))
vi.mock('@/services/pasteApi', () => ({ pasteApi }))

const recognizeRally = vi.hoisted(() => vi.fn())
vi.mock('@/services/ocrApi', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/ocrApi')>()
  return { ...mod, ocrApi: { ...mod.ocrApi, recognizeRally } }
})

vi.mock('@/services/syncApi', () => ({
  syncApi: { getLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }) },
}))
vi.mock('@/services/villageApi', () => ({
  villageApi: { getAll: vi.fn().mockResolvedValue({ villages: [], total: 0 }) },
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock('@/contexts/CurrentAccountContext', () => ({
  useCurrentAccount: () => ({
    currentAccount: {
      account_id: 'acc-1',
      world_id: 'w-1',
      player_name: 'HandsomeTing',
      server_name: 'ts11',
      server_url: 'https://ts11.x1.international.travian.com',
    },
    loading: false,
  }),
}))

import HomePage from '../HomePage'
import { OcrRequestError } from '@/services/ocrApi'

function ConfirmProbe() {
  const loc = useLocation()
  const st = loc.state as { source?: string; images?: unknown[]; captureAt?: string }
  return (
    <div data-testid="confirm-probe">
      {st?.source}|{st?.images?.length}|{st?.captureAt}
    </div>
  )
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/paste/confirm" element={<ConfirmProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

const shot = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'rally.png', {
    type: 'image/png',
    lastModified: Date.now() - 60_000,
  })

describe('HomePage screenshot upload (P0-07)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
  })
  beforeEach(() => {
    recognizeRally.mockReset()
    window.history.replaceState({}, '', '/')
  })

  it('upload button is enabled and opens the recognizing state, then the confirm screen', async () => {
    let resolve: (v: unknown) => void = () => {}
    recognizeRally.mockReturnValue(new Promise((r) => (resolve = r)))
    renderHome()
    expect(screen.getByTestId('upload-screenshot-btn')).not.toBeDisabled()

    fireEvent.change(screen.getByTestId('upload-screenshot-input'), {
      target: { files: [shot()] },
    })
    expect(await screen.findByTestId('ocr-recognizing')).toBeInTheDocument()
    expect(recognizeRally).toHaveBeenCalledWith('acc-1', expect.any(Array), expect.any(AbortSignal))

    resolve(ocrLowResResponse)
    const probe = await screen.findByTestId('confirm-probe')
    expect(probe.textContent).toMatch(/^ocr\|1\|20\d\d-/)
  })

  it('shows an explicit failure and saves nothing when no incoming is recognized', async () => {
    recognizeRally.mockRejectedValue(
      new OcrRequestError('OCR_NO_INCOMING', '這張集結點截圖裡沒有辨識到來襲（攻擊、搶奪、偵察）。'),
    )
    renderHome()
    fireEvent.change(screen.getByTestId('upload-screenshot-input'), {
      target: { files: [shot()] },
    })
    const failed = await screen.findByTestId('ocr-failed')
    expect(failed).toHaveAttribute('data-code', 'OCR_NO_INCOMING')
    expect(failed).toHaveTextContent('沒有辨識到來襲')
    expect(failed).toHaveTextContent('沒有存入任何資料')
    expect(screen.queryByTestId('confirm-probe')).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('rejects more than 4 screenshots without calling the service', async () => {
    renderHome()
    fireEvent.change(screen.getByTestId('upload-screenshot-input'), {
      target: { files: [shot(), shot(), shot(), shot(), shot()] },
    })
    await waitFor(() => expect(screen.getByTestId('ocr-failed')).toBeInTheDocument())
    expect(screen.getByTestId('ocr-failed')).toHaveTextContent('一次最多 4 張截圖')
    expect(recognizeRally).not.toHaveBeenCalled()
  })

  it('cancel returns to the paste card', async () => {
    recognizeRally.mockImplementation(
      (_a: string, _f: File[], signal: AbortSignal) =>
        new Promise((_, reject) =>
          signal.addEventListener('abort', () =>
            reject(new OcrRequestError('OCR_CANCELLED', '已取消')),
          ),
        ),
    )
    renderHome()
    fireEvent.change(screen.getByTestId('upload-screenshot-input'), {
      target: { files: [shot()] },
    })
    await screen.findByTestId('ocr-recognizing')
    fireEvent.click(screen.getByText('取消'))
    await waitFor(() => expect(screen.getByTestId('paste-textarea')).toBeInTheDocument())
    expect(screen.queryByTestId('ocr-failed')).not.toBeInTheDocument()
  })
})
