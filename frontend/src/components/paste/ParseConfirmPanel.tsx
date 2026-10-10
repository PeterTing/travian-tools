import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { UtcOffsetField } from '@/components/world/UtcOffsetField'
import { parseUtcOffsetDraft } from '@/lib/worldUrl'
import { useTranslation } from 'react-i18next'
import {
  emptyPasteReasonKey,
  formatCaptureShort,
  formatVillageLabel,
  movementKindLabel,
  nearMidnight,
  pageNeedsVillageSelector,
  pageTypeLabel,
  parseCaptureShort,
  parseResultIsSaveable,
  pickDefaultVillageId,
  type VillagePick,
} from '@/lib/pasteFormat'
import { pasteApi } from '@/services/pasteApi'
import type { GameAccount } from '@/types/game'
import { formatCountdownSeconds } from '@/lib/formatCountdown'
import { deriveServerUtcOffset } from '@/lib/serverTime'
import { UTC_OFFSET_CHOICES } from '@/lib/worldUrl'
import { OcrMovementRow, type OcrImageRef } from '@/components/ocr/OcrMovementRow'
import {
  applyFieldValue,
  countUnconfirmed,
  ocrMeta,
  OCR_FIELD_ORDER,
  setFieldConfirmed,
} from '@/lib/ocrFields'
import type { OcrMeta } from '@/services/ocrApi'
import BuildingIcon from '@/components/common/BuildingIcon'

export interface ConfirmState {
  pageType: string
  data: Record<string, unknown>
  serverTime?: string | null
  source: string
  draftId?: string | null
  warnings?: { code: string; message: string }[]
  /** 截圖辨識（P0-07）：原圖（放大原處用）與辨識資訊 */
  ocr?: {
    meta: OcrMeta
    images: OcrImageRef[]
    timeSource: 'server_clock' | 'file' | 'now'
  }
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
  /** World's known UTC offset in minutes; null = unset (show editor); undefined = hide */
  worldUtcOffset?: number | null
  /** 截圖辨識：使用者確認／修改欄位後回傳新的 data */
  onDataChange?: (data: Record<string, unknown>) => void
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
  worldUtcOffset,
  onDataChange,
}: Props) {
  const { t } = useTranslation()
  const [helpImprove, setHelpImprove] = useState(false)
  const [timeDisplay, setTimeDisplay] = useState<'server' | 'local'>('server')
  const [utcOffsetDraft, setUtcOffsetDraft] = useState(() =>
    worldUtcOffset == null ? '' : String(worldUtcOffset),
  )
  const [utcEditing, setUtcEditing] = useState(() => worldUtcOffset == null)
  const [error, setError] = useState('')
  const [captureDraft, setCaptureDraft] = useState(() => formatCaptureShort(captureAt))

  const showVillage = pageNeedsVillageSelector(state.pageType)

  useEffect(() => {
    setCaptureDraft(formatCaptureShort(captureAt))
  }, [captureAt])

  // IA v2.2：世界還沒有時差時，用頁面上的伺服器時鐘和貼上時間自動算，不請使用者填。
  // 遊戲顯示的是本地時間（time_display = local）就不算，頁面上的鐘不是伺服器時間。
  const showsServerClock = askTimeDisplay ? timeDisplay === 'server' : account.time_display !== 'local'
  const derivedUtcOffset = useMemo(() => {
    if (worldUtcOffset !== null || !showsServerClock) return null
    const d = deriveServerUtcOffset(state.serverTime, captureAt)
    return d != null && UTC_OFFSET_CHOICES.includes(d) ? d : null
  }, [worldUtcOffset, showsServerClock, state.serverTime, captureAt])

  useEffect(() => {
    if (worldUtcOffset === undefined) return
    const known = worldUtcOffset ?? derivedUtcOffset
    setUtcOffsetDraft(known == null ? '' : String(known))
    setUtcEditing(known == null)
  }, [worldUtcOffset, derivedUtcOffset])

  useEffect(() => {
    if (!showVillage) return
    if (villageId && villages.some((v) => v.village_id === villageId)) return
    onVillageIdChange(pickDefaultVillageId(villages, state.data))
  }, [showVillage, villages, villageId, state.data, onVillageIdChange])

  const movements = useMemo(() => asMovements(state.data), [state.data])
  const saveable = useMemo(
    () => parseResultIsSaveable(state.pageType, state.data),
    [state.pageType, state.data],
  )
  const incoming = movements.filter((m) =>
    ['incoming_attack', 'incoming_raid', 'incoming_spy'].includes(String(m.kind || '')),
  )
  const isOcr = state.source === 'ocr' && state.pageType === 'rally_point' && Boolean(state.ocr)
  const unconfirmed = isOcr ? countUnconfirmed(incoming) : 0
  const missingFields = isOcr
    ? incoming.reduce((n, m) => {
        const meta = ocrMeta(m)
        return n + (meta ? OCR_FIELD_ORDER.filter((k) => meta.fields[k]?.status === 'missing').length : 0)
      }, 0)
    : 0
  const hadLow = isOcr && (state.ocr?.meta.low_count ?? 0) > 0
  const [diffCreated, setDiffCreated] = useState<number | null>(null)
  const [diffUpdated, setDiffUpdated] = useState<number | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  useEffect(() => {
    if (state.pageType !== 'rally_point' || !incoming.length) {
      setDiffCreated(null)
      setDiffUpdated(null)
      return
    }
    let cancelled = false
    setDiffLoading(true)
    void pasteApi
      .previewDiff({
        account_id: account.account_id,
        page_type: 'rally_point',
        data: state.data,
        capture_at: captureAt.toISOString(),
        server_time: state.serverTime,
        source: state.source,
        village_id: villageId,
      })
      .then((res) => {
        if (cancelled) return
        setDiffCreated(res.created)
        setDiffUpdated(res.updated)
      })
      .catch(() => {
        if (cancelled) return
        // Preview failed: keep save enabled but hide N/M hints (plain 「存入」)
        setDiffCreated(null)
        setDiffUpdated(null)
      })
      .finally(() => {
        if (!cancelled) setDiffLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    state.pageType,
    state.data,
    state.serverTime,
    state.source,
    account.account_id,
    captureAt,
    villageId,
    incoming.length,
  ])

  const createdHint = diffCreated != null ? diffCreated : null
  const updatedHint = diffUpdated != null ? diffUpdated : null
  const diffLabel =
    createdHint != null && updatedHint != null
      ? `新增 ${createdHint} · 更新 ${updatedHint}`
      : null

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
    if (!saveable) {
      setError(t('paste.emptyError'))
      return
    }
    if (unconfirmed > 0) {
      setError(t('ocr.confirm.remaining', { count: unconfirmed }))
      return
    }
    if (showVillage && villages.length > 0 && !villageId) {
      setError(t('paste.selectVillage'))
      return
    }
    if (helpImprove) {
      const ok = window.confirm(
        '此選項尚未接上送出。勾選只是預留，現在不會送出內容。仍要勾選並存入嗎？',
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
          worldUtcOffset === undefined
            ? undefined
            : parseUtcOffsetDraft(utcOffsetDraft),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('paste.saveFailed'))
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
                    className="w-full min-w-0 max-w-full rounded-md border bg-background px-2 py-1.5 text-base"
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
          {isOcr && state.ocr && (
            <>
              <span className="text-muted-foreground">{t('ocr.confirm.timeSource')}</span>
              <span className="min-w-0 text-xs" data-testid="ocr-time-source">
                {state.ocr.timeSource === 'server_clock'
                  ? t('ocr.confirm.timeFromClock', { clock: String(state.serverTime || '') })
                  : state.ocr.timeSource === 'file'
                    ? t('ocr.confirm.timeFromFile')
                    : t('ocr.confirm.timeFromNow')}
              </span>
            </>
          )}
        </div>
        {nearMidnight(captureAt) && (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm px-3 py-2"
            data-testid="midnight-banner"
          >
            手機貼上的內容沒有日期，這裡用貼上當下推算。快到午夜時請確認日期對不對。
          </div>
        )}
        {isOcr && (
          <div className="text-xs text-muted-foreground" data-testid="ocr-source-badge">
            {t('ocr.confirm.sourceBadge')}
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

        {worldUtcOffset !== undefined && (
          <div className="rounded-md border p-3 space-y-2" data-testid="ask-utc-offset">
            {(worldUtcOffset == null && derivedUtcOffset == null) || utcEditing ? (
              <p className="text-xs text-muted-foreground">
                {t('worldSettings.description')}
              </p>
            ) : null}
            {derivedUtcOffset != null && !utcEditing && (
              <p className="text-xs text-muted-foreground" data-testid="confirm-utc-derived">
                {t('worldSettings.derivedFromPage')}
              </p>
            )}
            <UtcOffsetField
              testIdPrefix="confirm-utc"
              value={worldUtcOffset ?? derivedUtcOffset}
              draft={utcOffsetDraft}
              onDraftChange={setUtcOffsetDraft}
              editing={utcEditing}
              onEditingChange={setUtcEditing}
            />
          </div>
        )}

        {state.pageType === 'rally_point' && (
          <div className="space-y-2" data-testid="rally-confirm-list">
            <div className="text-sm" data-testid="rally-diff-label">
              來襲 {incoming.length} 筆
              {diffLoading ? (
                <span className="text-muted-foreground"> · 比對中…</span>
              ) : diffLabel ? (
                <span className="text-muted-foreground"> · {diffLabel}</span>
              ) : null}
            </div>
            {isOcr && unconfirmed > 0 && (
              <div
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                data-testid="ocr-confirm-banner"
              >
                <b>{t('ocr.confirm.banner', { count: unconfirmed })}</b>
                <div className="text-xs">{t('ocr.confirm.bannerDetail')}</div>
              </div>
            )}
            {isOcr && unconfirmed === 0 && hadLow && (
              <div
                className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-900"
                data-testid="ocr-all-confirmed"
              >
                ✓ {t('ocr.confirm.allConfirmed')}
              </div>
            )}
            {isOcr && missingFields > 0 && (
              <div className="text-xs text-amber-800" data-testid="ocr-missing-note">
                {t('ocr.confirm.missingNote', { count: missingFields })}
              </div>
            )}
            {isOcr && state.ocr ? (
              <ul className="divide-y rounded-md border" data-testid="ocr-movement-list">
                {incoming.map((m) => {
                  const idx = movements.indexOf(m)
                  return (
                    <OcrMovementRow
                      key={idx}
                      movement={m}
                      index={idx}
                      images={state.ocr!.images}
                      onApply={(i, name, value) =>
                        onDataChange?.(applyFieldValue(state.data, i, name, value))
                      }
                      onConfirmed={(i, name, confirmed) =>
                        onDataChange?.(setFieldConfirmed(state.data, i, name, confirmed))
                      }
                    />
                  )
                })}
              </ul>
            ) : (
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
                        {m.timer_seconds != null ? ` · 倒數 ${formatCountdownSeconds(Number(m.timer_seconds))}` : ''}
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
            )}
          </div>
        )}

        {!saveable && (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 text-amber-950 text-sm px-3 py-2"
            data-testid="parse-empty-state"
          >
            <b>{t('paste.emptyTitle')}</b>
            <p className="mt-1 text-xs" data-testid="parse-empty-detail">
              {t('paste.emptyRecognized', { page: pageTypeLabel(state.pageType) })}{' '}
              {t(emptyPasteReasonKey(state.pageType))} {t('paste.emptyNextStep')}
            </p>
          </div>
        )}

        {state.pageType === 'village_overview' && saveable && (
          <div className="space-y-2 text-sm" data-testid="village-overview-preview">
            <div className="font-medium">
              {String(state.data.village_name || '（未知名）')}
              {state.data.coordinate_x != null && state.data.coordinate_y != null
                ? ` (${String(state.data.coordinate_x)}|${String(state.data.coordinate_y)})`
                : ''}
              {Number(state.data.population) > 0 ? (
                <span className="text-muted-foreground font-normal" data-testid="overview-population">
                  {' '}
                  · {t('paste.population', { value: String(state.data.population) })}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {(['wood', 'clay', 'iron', 'crop'] as const).map((k) => {
                const res = (state.data.resources as Record<string, number> | undefined)?.[k]
                const prod = (state.data.production as Record<string, number> | undefined)?.[k]
                const label = { wood: '木', clay: '泥', iron: '鐵', crop: '糧' }[k]
                return (
                  <div key={k} className="rounded-md border px-2 py-1.5">
                    <div className="text-muted-foreground">{label}</div>
                    <div className="font-mono">{res != null ? Number(res).toLocaleString() : '—'}</div>
                    <div className="text-muted-foreground">
                      產量 {prod != null ? Number(prod).toLocaleString() : '—'}/h
                    </div>
                  </div>
                )
              })}
            </div>
            {Array.isArray(state.data.resource_fields) && state.data.resource_fields.length > 0 ? (
              <div className="text-xs text-muted-foreground" data-testid="field-levels-summary">
                田地 {state.data.resource_fields.length} 格
                {state.data.village_type ? ` · ${String(state.data.village_type)}` : ''}
                ：
                {(state.data.resource_fields as { level?: number }[])
                  .map((f) => f.level ?? '?')
                  .join(', ')}
              </div>
            ) : (
              <div className="text-xs text-amber-800">田地等級未從純文字拆出（仍可存資源／村莊）</div>
            )}
            {Array.isArray(state.data.troops) && state.data.troops.length > 0 ? (
              <ul className="text-xs rounded-md border divide-y" data-testid="troop-preview">
                {(
                  state.data.troops as { name?: string; troop_id?: string; count?: number }[]
                ).map((t, i) => (
                  <li key={i} className="px-2 py-1 flex justify-between gap-2">
                    <span>{t.name || t.troop_id}</span>
                    <span className="font-mono">{Number(t.count || 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {Array.isArray(state.data.villages) && (state.data.villages as unknown[]).length > 1 ? (
              <div className="text-xs text-muted-foreground">
                村莊列表 {(state.data.villages as unknown[]).length} 村
              </div>
            ) : null}
          </div>
        )}

        {state.pageType === 'village_center' && saveable && (
          <div className="space-y-2 text-sm" data-testid="village-center-preview">
            <div className="font-medium">
              {String(state.data.village_name || '（未知名）')}
              {state.data.coordinate_x != null && state.data.coordinate_y != null
                ? ` (${String(state.data.coordinate_x)}|${String(state.data.coordinate_y)})`
                : ''}
              {state.data.population ? (
                <span className="text-muted-foreground font-normal">
                  {' '}
                  · {t('paste.population', { value: String(state.data.population) })}
                </span>
              ) : null}
            </div>
            {(() => {
              const all = Array.isArray(state.data.buildings)
                ? (state.data.buildings as {
                    building_id?: string
                    level?: number
                    position?: number
                  }[])
                : []
              const listed = all.filter(
                (b) => b.building_id && b.building_id !== 'building_0' && Number(b.level || 0) > 0,
              )
              return (
                <>
                  <div className="text-xs text-muted-foreground">
                    {t('paste.buildingsCount', { count: listed.length || all.length })}
                    {Array.isArray(state.data.troops) && state.data.troops.length
                      ? ` · 部隊 ${state.data.troops.length} 種`
                      : ''}
                  </div>
                  {listed.length > 0 ? (
                    <ul
                      className="text-xs rounded-md border divide-y max-h-56 overflow-auto"
                      data-testid="building-list"
                    >
                      {listed.map((b, i) => (
                        <li
                          key={`${b.position ?? i}-${b.building_id}`}
                          className="px-2 py-1.5 flex justify-between gap-2"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <BuildingIcon id={b.building_id} size={20} />
                            <span className="min-w-0 truncate">
                              {t(`buildingNames.${b.building_id}`, {
                                defaultValue: b.building_id,
                              })}
                            </span>
                          </span>
                          <span className="font-mono shrink-0 text-muted-foreground">
                            {t('paste.buildingLevel', { level: Number(b.level || 0) })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )
            })()}
          </div>
        )}

        {state.pageType !== 'rally_point' &&
          state.pageType !== 'village_overview' &&
          state.pageType !== 'village_center' && (
            <pre
              className="text-xs bg-muted/40 rounded-md p-3 overflow-auto max-h-64"
              data-testid="generic-parse-json"
            >
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(state.data || {}).filter(([k]) => k !== 'raw_text'),
                ),
                null,
                2,
              )}
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
            把內容送出幫忙改進解析（預設關閉 · 尚未送出）
            <span className="block text-xs text-muted-foreground">
              勾了也不會現在送出。之後接上時會再提醒：內容裡有座標和玩家名稱。
            </span>
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>

      <CardFooter className="flex gap-2 justify-between px-4 sm:px-6">
        <Button variant="outline" onClick={onDiscard} disabled={saving}>
          捨棄
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={saving || !saveable || unconfirmed > 0}
          data-testid="confirm-save"
        >
          {saving
            ? '存入中…'
            : unconfirmed > 0
              ? t('ocr.confirm.remaining', { count: unconfirmed })
              : state.pageType === 'rally_point' && incoming.length > 0
              ? diffLabel
                ? `存入 · ${diffLabel}`
                : diffLoading
                  ? '比對中…'
                  : '存入'
              : '存入'}
        </Button>
      </CardFooter>
    </Card>
  )
}
