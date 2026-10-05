import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  formatCaptureShort,
  formatVillageLabel,
  movementKindLabel,
  nearMidnight,
  pageNeedsVillageSelector,
  pageTypeLabel,
  parseCaptureShort,
  pickDefaultVillageId,
  type VillagePick,
} from '@/lib/pasteFormat'
import type { GameAccount } from '@/types/game'

export interface ConfirmState {
  pageType: string
  data: Record<string, unknown>
  serverTime?: string | null
  source: string
  draftId?: string | null
  warnings?: { code: string; message: string }[]
}

interface Props {
  account: GameAccount
  state: ConfirmState
  villages: VillagePick[]
  villageId: string | null
  onVillageIdChange: (id: string | null) => void
  captureAt: Date
  onCaptureAtChange: (d: Date) => void
  onDiscard: () => void
  onSave: (opts: {
    helpImprove: boolean
    villageId?: string | null
    timeDisplay?: string
    localTimezone?: string
    utcOffset?: number | null
  }) => Promise<void>
  saving?: boolean
  askTimeDisplay?: boolean
  askUtcOffset?: boolean
}

function asMovements(data: Record<string, unknown>) {
  const movements = (data.movements as Record<string, unknown>[] | undefined) || []
  if (movements.length) return movements
  return [
    ...((data.incoming as Record<string, unknown>[]) || []),
    ...((data.incoming_reinforcements as Record<string, unknown>[]) || []),
  ]
}

export function ParseConfirmPanel({
  account,
  state,
  villages,
  villageId,
  onVillageIdChange,
  captureAt,
  onCaptureAtChange,
  onDiscard,
  onSave,
  saving,
  askTimeDisplay,
  askUtcOffset,
}: Props) {
  const [helpImprove, setHelpImprove] = useState(false)
  const [timeDisplay, setTimeDisplay] = useState<'server' | 'local'>('server')
  const [utcOffsetDraft, setUtcOffsetDraft] = useState('')
  const [error, setError] = useState('')
  const [captureDraft, setCaptureDraft] = useState(() => formatCaptureShort(captureAt))

  const showVillage = pageNeedsVillageSelector(state.pageType)

  useEffect(() => {
    setCaptureDraft(formatCaptureShort(captureAt))
  }, [captureAt])

  useEffect(() => {
    if (!showVillage) return
    if (villageId && villages.some((v) => v.village_id === villageId)) return
    onVillageIdChange(pickDefaultVillageId(villages, state.data))
  }, [showVillage, villages, villageId, state.data, onVillageIdChange])

  const movements = useMemo(() => asMovements(state.data), [state.data])
  const incoming = movements.filter((m) =>
    String(m.kind || '').startsWith('incoming_'),
  )
  const previewCreated = (state.data as { _preview_created?: number })._preview_created
  const previewUpdated = (state.data as { _preview_updated?: number })._preview_updated
  const createdHint =
    previewCreated != null ? Number(previewCreated) : incoming.length
  const updatedHint = previewUpdated != null ? Number(previewUpdated) : 0

  const commitCaptureDraft = () => {
    const parsed = parseCaptureShort(captureDraft, captureAt)
    if (parsed) {
      onCaptureAtChange(parsed)
      setCaptureDraft(formatCaptureShort(parsed))
    } else {
      setCaptureDraft(formatCaptureShort(captureAt))
    }
  }

  const handleSave = async () => {
    setError('')
    if (showVillage && villages.length > 0 && !villageId) {
      setError('請選擇要存入的村莊')
      return
    }
    if (helpImprove) {
      const ok = window.confirm(
        '勾選後會把內容（含座標和玩家名稱）送出幫忙改進解析。確定要勾選並存入嗎？',
      )
      if (!ok) return
    }
    try {
      await onSave({
        helpImprove,
        villageId: showVillage ? villageId : null,
        timeDisplay: askTimeDisplay ? timeDisplay : undefined,
        localTimezone: askTimeDisplay && timeDisplay === 'local' ? 'Asia/Taipei' : undefined,
        utcOffset:
          askUtcOffset && utcOffsetDraft !== ''
            ? Number(utcOffsetDraft)
            : askUtcOffset
              ? null
              : undefined,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '存入失敗')
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto overflow-hidden" data-testid="parse-confirm-panel">
      <CardHeader className="space-y-2 px-4 sm:px-6">
        <CardTitle>確認解析結果</CardTitle>
        <div className="text-sm text-muted-foreground">{pageTypeLabel(state.pageType)}</div>
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 gap-y-2 text-sm items-center">
          <span className="text-muted-foreground">存到</span>
          <span className="min-w-0 break-words">
            {account.player_name || account.account_id.slice(0, 6)} ·{' '}
            {account.server_name || account.server_url}
          </span>

          {showVillage && (
            <>
              <span className="text-muted-foreground">村莊</span>
              <div className="min-w-0">
                {villages.length === 0 ? (
                  <span className="text-amber-700 text-xs" data-testid="village-empty-hint">
                    這個帳號還沒有村莊，請先到首頁貼上多村總覽或手動新增。
                  </span>
                ) : (
                  <select
                    className="w-full min-w-0 max-w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                    value={villageId || ''}
                    onChange={(e) => onVillageIdChange(e.target.value || null)}
                    data-testid="village-select"
                  >
                    {villages.map((v) => (
                      <option key={v.village_id} value={v.village_id}>
                        {formatVillageLabel(v)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}

          <span className="text-muted-foreground">擷取時間</span>
          <div className="min-w-0">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="MM/DD HH:MM"
              className="h-8 w-full min-w-0 max-w-[9.5rem] font-mono text-sm"
              value={captureDraft}
              onChange={(e) => setCaptureDraft(e.target.value)}
              onBlur={commitCaptureDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitCaptureDraft()
                }
              }}
              data-testid="capture-at-input"
              aria-label="擷取時間 MM/DD HH:MM"
            />
          </div>
        </div>
        {nearMidnight(captureAt) && (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm px-3 py-2"
            data-testid="midnight-banner"
          >
            手機貼上的內容沒有日期，這裡用貼上當下推算。快到午夜時請確認日期對不對。
          </div>
        )}
        {state.source === 'extension' && (
          <div className="text-xs text-muted-foreground">來源：擴充上傳 · 伺服器時間已自動帶入</div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 px-4 sm:px-6">
        {askTimeDisplay && (
          <div className="rounded-md border p-3 space-y-2" data-testid="ask-time-display">
            <div className="font-medium text-sm">遊戲裡顯示的是哪一種時間？</div>
            <p className="text-xs text-muted-foreground">
              在遊戲的個人設定裡可以看到。這個帳號只會問這一次，之後可以在確認畫面改。
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="td"
                  checked={timeDisplay === 'server'}
                  onChange={() => setTimeDisplay('server')}
                />
                伺服器時間
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="td"
                  checked={timeDisplay === 'local'}
                  onChange={() => setTimeDisplay('local')}
                />
                我的本地時間（台北 UTC+8）
              </label>
            </div>
          </div>
        )}

        {askUtcOffset && (
          <div className="rounded-md border p-3 space-y-2" data-testid="ask-utc-offset">
            <div className="font-medium text-sm">這個世界的伺服器 UTC 時差（分鐘）</div>
            <p className="text-xs text-muted-foreground">
              例如 UTC+1 = 60。不知道可留空，時間會照伺服器顯示、不換算。
            </p>
            <Input
              value={utcOffsetDraft}
              onChange={(e) => setUtcOffsetDraft(e.target.value)}
              placeholder="60"
              inputMode="numeric"
            />
          </div>
        )}

        {state.pageType === 'rally_point' && (
          <div className="space-y-2" data-testid="rally-confirm-list">
            <div className="text-sm">
              來襲 {incoming.length} 筆
              {createdHint || updatedHint ? (
                <span className="text-muted-foreground">
                  {' '}
                  · 新增 {createdHint || Math.max(0, incoming.length - updatedHint)} · 更新{' '}
                  {updatedHint}
                </span>
              ) : null}
            </div>
            <ul className="divide-y rounded-md border">
              {incoming.map((m, i) => {
                const needs =
                  m.coordinate_x == null ||
                  m.coordinate_y == null ||
                  Number.isNaN(Number(m.coordinate_x))
                return (
                  <li key={i} className="px-3 py-2 text-sm flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {movementKindLabel(String(m.kind || ''))}{' '}
                        <span className="text-muted-foreground font-normal">
                          自 {String(m.role || '？？？')}
                          {m.coordinate_x != null && m.coordinate_y != null
                            ? ` (${m.coordinate_x}|${m.coordinate_y})`
                            : ''}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        抵達 {String(m.arrival_time || '—')}
                        {m.timer_seconds != null ? ` · 倒數 ${m.timer_seconds}s` : ''}
                      </div>
                    </div>
                    {needs ? (
                      <span className="text-amber-700 text-xs shrink-0">待補</span>
                    ) : (
                      <span className="text-muted-foreground text-xs shrink-0">完整</span>
                    )}
                  </li>
                )
              })}
              {!incoming.length && (
                <li className="px-3 py-4 text-sm text-muted-foreground">沒有辨識到來襲</li>
              )}
            </ul>
          </div>
        )}

        {state.pageType !== 'rally_point' && (
          <pre
            className="text-xs bg-muted/40 rounded-md p-3 overflow-auto max-h-64"
            data-testid="generic-parse-json"
          >
            {JSON.stringify(state.data, null, 2)}
          </pre>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={helpImprove}
            onChange={(e) => setHelpImprove(e.target.checked)}
            data-testid="help-improve"
          />
          <span>
            把內容送出幫忙改進解析（預設關閉）
            <span className="block text-xs text-muted-foreground">
              勾選前提醒：內容裡有座標和玩家名稱。
            </span>
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>

      <CardFooter className="flex gap-2 justify-between px-4 sm:px-6">
        <Button variant="outline" onClick={onDiscard} disabled={saving}>
          捨棄
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving} data-testid="confirm-save">
          {saving
            ? '存入中…'
            : state.pageType === 'rally_point'
              ? `存入 ${incoming.length || ''} 筆`.trim()
              : '存入'}
        </Button>
      </CardFooter>
    </Card>
  )
}
