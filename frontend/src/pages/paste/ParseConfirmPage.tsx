import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ParseConfirmPanel, type ConfirmState } from '@/components/paste/ParseConfirmPanel'
import { Button } from '@/components/ui/button'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { pageTypeLabel } from '@/lib/pasteFormat'
import { pasteApi, type ParsePreviewResponse } from '@/services/pasteApi'
import { gameWorldApi } from '@/services/gameWorldApi'

interface NavState {
  preview?: ParsePreviewResponse
  raw?: string
  kind?: string
  accountId?: string
  captureAt?: string
  unknown?: boolean
}

export default function ParseConfirmPage() {
  const { draftId } = useParams<{ draftId?: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentAccount, accounts, selectAccount, reload } = useCurrentAccount()
  const nav = (location.state || {}) as NavState

  const [loading, setLoading] = useState(Boolean(draftId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [manualType, setManualType] = useState('')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [captureAt, setCaptureAt] = useState(() =>
    nav.captureAt ? new Date(nav.captureAt) : new Date(),
  )
  const [askTimeDisplay, setAskTimeDisplay] = useState(false)
  const [askUtcOffset, setAskUtcOffset] = useState(false)
  const [detectedBanner, setDetectedBanner] = useState('')

  const account = useMemo(() => {
    const id = nav.accountId || confirm?.data?.account_id
    if (typeof id === 'string') {
      return accounts.find((a) => a.account_id === id) || currentAccount
    }
    return currentAccount
  }, [accounts, confirm, currentAccount, nav.accountId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (draftId) {
        try {
          const draft = await pasteApi.getDraft(draftId)
          if (cancelled) return
          selectAccount(draft.account_id)
          setConfirm({
            pageType: draft.page_type,
            data: draft.data,
            serverTime: draft.server_time,
            source: draft.source,
            draftId: draft.draft_id,
            warnings: draft.warnings,
          })
          setDetectedBanner(
            draft.page_type !== 'unknown'
              ? `✓ 認出來了：${pageTypeLabel(draft.page_type)}`
              : '',
          )
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : '讀取草稿失敗')
        } finally {
          if (!cancelled) setLoading(false)
        }
        return
      }
      if (nav.preview) {
        setConfirm({
          pageType: nav.preview.page_type,
          data: nav.preview.data,
          serverTime: nav.preview.server_time,
          source: 'paste',
          warnings: nav.preview.warnings,
        })
        if (!nav.unknown && nav.preview.ok) {
          const incoming = Array.isArray(nav.preview.data.incoming)
            ? nav.preview.data.incoming.length
            : 0
          setDetectedBanner(
            `✓ 認出來了：${pageTypeLabel(nav.preview.page_type)}` +
              (nav.preview.page_type === 'rally_point' ? `，有 ${incoming} 筆來襲` : ''),
          )
        }
        setLoading(false)
      } else {
        setError('沒有可確認的內容')
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [draftId, nav.preview, nav.unknown, selectAccount])

  useEffect(() => {
    if (!account) return
    setAskTimeDisplay(account.time_display == null)
    let cancelled = false
    async function checkWorld() {
      try {
        const worlds = await gameWorldApi.getAll()
        const world = worlds.worlds.find((w) => w.world_id === account?.world_id)
        if (!cancelled) setAskUtcOffset(Boolean(account?.world_id) && world?.utc_offset == null)
      } catch {
        if (!cancelled) setAskUtcOffset(false)
      }
    }
    void checkWorld()
    return () => {
      cancelled = true
    }
  }, [account])

  if (loading) {
    return <div className="container mx-auto px-4 py-10 text-center">載入中…</div>
  }

  if (error || !confirm || !account) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg space-y-4 text-center">
        <p className="text-destructive">{error || '找不到帳號或內容'}</p>
        <Link to="/">
          <Button type="button" variant="outline">回首頁</Button>
        </Link>
      </div>
    )
  }

  const showTypePicker = confirm.pageType === 'unknown' || Boolean(nav.unknown)

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-muted-foreground hover:underline">
          ‹ 回首頁
        </Link>
      </div>

      {detectedBanner && !showTypePicker && (
        <div
          className="rounded-md border border-green-300 bg-green-50 text-green-900 text-sm px-3 py-2"
          data-testid="detected-banner"
        >
          {detectedBanner}
        </div>
      )}

      {showTypePicker && (
        <div className="rounded-md border p-4 space-y-3" data-testid="type-picker">
          <div className="font-medium">認不出這是哪一頁</div>
          <p className="text-sm text-muted-foreground">
            可能只複製到一部分。請在遊戲裡全選後再複製一次，或手動選類型。
          </p>
          <div className="flex flex-wrap gap-2">
            {['rally_point', 'reports', 'village_overview'].map((pt) => (
              <Button
                key={pt}
                variant={manualType === pt ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setManualType(pt)
                  setConfirm((c) => (c ? { ...c, pageType: pt } : c))
                }}
              >
                {pageTypeLabel(pt)}
              </Button>
            ))}
          </div>
          <Link to="/">
            <Button type="button" variant="outline" size="sm">清空重貼</Button>
          </Link>
        </div>
      )}

      {(!showTypePicker || manualType) && (
        <ParseConfirmPanel
          account={account}
          state={confirm}
          captureAt={captureAt}
          onCaptureAtChange={setCaptureAt}
          saving={saving}
          askTimeDisplay={askTimeDisplay}
          askUtcOffset={askUtcOffset}
          onDiscard={() => navigate('/')}
          onSave={async (opts) => {
            setSaving(true)
            try {
              const result = await pasteApi.confirm({
                account_id: account.account_id,
                page_type: confirm.pageType,
                data: confirm.data,
                draft_id: confirm.draftId,
                capture_at: captureAt.toISOString(),
                server_time: confirm.serverTime,
                source: confirm.source,
                time_display: opts.timeDisplay,
                local_timezone: opts.localTimezone,
                utc_offset: opts.utcOffset,
                help_improve: opts.helpImprove,
              })
              await reload()
              const msg =
                result.message ||
                `已存入 ${result.total} 筆到 ${account.server_name || '目前世界'}`
              navigate(`/?saved=${encodeURIComponent(msg)}`)
            } finally {
              setSaving(false)
            }
          }}
        />
      )}
    </div>
  )
}
