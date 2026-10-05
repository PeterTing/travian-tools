import { formatCountdownSeconds } from '@/lib/formatCountdown'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import {
  emptyPasteReasonKey,
  looksLikeHtml,
  movementKindLabel,
  pageTypeLabel,
  PASTE_FORMAT_HELP,
} from '@/lib/pasteFormat'
import {
  formatRecentUploadLine,
  isSuccessfulSync,
  relativeAgo,
} from '@/lib/recentUploads'
import { pasteApi, type Movement } from '@/services/pasteApi'
import { syncApi, type SyncLog } from '@/services/syncApi'
import { villageApi } from '@/services/villageApi'

const RECENT_LIMIT = 5
const ALL_VILLAGES = ''

function incomingVillageStorageKey(accountId: string, worldId?: string | null): string {
  return `tt:incomingVillage:${accountId}:${worldId || 'noworld'}`
}

function countdownLabel(arrivalAt: string | null | undefined, now: Date): string {
  if (!arrivalAt) return '—'
  const t = new Date(arrivalAt).getTime() - now.getTime()
  if (Number.isNaN(t)) return '—'
  if (t <= 0) return '已抵達'
  return formatCountdownSeconds(Math.floor(t / 1000))
}

function formatRelativeLabel(
  ago: ReturnType<typeof relativeAgo>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!ago) return '—'
  switch (ago.key) {
    case 'justNow':
      return t('home.recentUploads.justNow')
    case 'minutesAgo':
      return t('home.recentUploads.minutesAgo', { count: ago.count })
    case 'hoursAgo':
      return t('home.recentUploads.hoursAgo', { count: ago.count })
    case 'yesterday':
      return t('home.recentUploads.yesterday')
    case 'daysAgo':
      return t('home.recentUploads.daysAgo', { count: ago.count })
  }
}

export default function HomePage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { currentAccount, loading: accountLoading } = useCurrentAccount()
  const navigate = useNavigate()

  const [pasteText, setPasteText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [clipboardFailed, setClipboardFailed] = useState(false)
  const [movements, setMovements] = useState<Movement[]>([])
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([])
  const [villages, setVillages] = useState<
    { village_id: string; name: string; coordinate_x: number; coordinate_y: number }[]
  >([])
  const [villageFilter, setVillageFilter] = useState<string>(ALL_VILLAGES)
  const [now, setNow] = useState(() => new Date())
  const [savedBanner, setSavedBanner] = useState('')

  const accountId = currentAccount?.account_id ?? null
  const worldId = currentAccount?.world_id ?? null

  useEffect(() => {
    if (!movements.length) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [movements.length])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const msg = params.get('saved')
    if (msg) {
      setSavedBanner(msg)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  // Restore village filter per account+world
  useEffect(() => {
    if (!accountId) {
      setVillageFilter(ALL_VILLAGES)
      return
    }
    try {
      const key = incomingVillageStorageKey(accountId, worldId)
      const stored = localStorage.getItem(key)
      setVillageFilter(stored ?? ALL_VILLAGES)
    } catch {
      setVillageFilter(ALL_VILLAGES)
    }
  }, [accountId, worldId])

  const persistVillageFilter = (value: string) => {
    setVillageFilter(value)
    if (!accountId) return
    try {
      const key = incomingVillageStorageKey(accountId, worldId)
      if (!value) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      /* ignore quota */
    }
  }

  const villageNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const v of villages) map.set(v.village_id, v.name)
    return map
  }, [villages])

  const reloadMovements = useCallback(async () => {
    if (!accountId) {
      setMovements([])
      return
    }
    try {
      const res = await pasteApi.listMovements(accountId, {
        villageId: villageFilter || null,
      })
      setMovements(res.movements)
    } catch {
      setMovements([])
    }
  }, [accountId, villageFilter])

  const reloadRecent = useCallback(async () => {
    if (!accountId) {
      setRecentLogs([])
      return
    }
    try {
      const res = await syncApi.getLogs({
        account_id: accountId,
        limit: RECENT_LIMIT * 2,
      })
      const ok = (res.logs || []).filter(isSuccessfulSync).slice(0, RECENT_LIMIT)
      setRecentLogs(ok)
    } catch {
      setRecentLogs([])
    }
  }, [accountId])

  const reloadVillages = useCallback(async () => {
    if (!accountId) {
      setVillages([])
      return
    }
    try {
      const res = await villageApi.getAll(accountId)
      setVillages(
        (res.villages || []).map((v) => ({
          village_id: v.village_id,
          name: v.name || v.village_id,
          coordinate_x: v.coordinate_x ?? 0,
          coordinate_y: v.coordinate_y ?? 0,
        })),
      )
    } catch {
      setVillages([])
    }
  }, [accountId])

  useEffect(() => {
    void reloadMovements()
  }, [reloadMovements])

  useEffect(() => {
    void reloadRecent()
    void reloadVillages()
  }, [reloadRecent, reloadVillages])

  const runParse = async (raw: string) => {
    if (!currentAccount) {
      setSavedBanner('')
      setParseError('請先在頂部選擇遊戲帳號')
      return
    }
    const content = raw.trim()
    if (!content) {
      setSavedBanner('')
      setParseError('請先貼上內容')
      return
    }
    setParsing(true)
    setParseError('')
    setSavedBanner('')
    try {
      const kind = looksLikeHtml(content) ? 'html' : 'text'
      const result = await pasteApi.preview({
        kind,
        html: kind === 'html' ? content : undefined,
        text: kind === 'text' ? content : undefined,
      })
      if (!result.ok) {
        const warn = result.warnings?.[0]?.message
        if (result.page_type === 'unknown') {
          setParseError(
            warn ||
              '認不出這是哪一頁。可能只複製到一部分。請在遊戲裡全選後再複製一次，或手動選類型。',
          )
        } else {
          const page = pageTypeLabel(result.page_type || 'unknown')
          setParseError(
            warn ||
              `${t('paste.emptyRecognized', { page })} ${t(emptyPasteReasonKey(result.page_type || 'unknown'))} ${t('paste.emptyNextStep')}`,
          )
        }
        return
      }
      navigate('/paste/confirm', {
        state: {
          preview: result,
          raw,
          kind,
          accountId: currentAccount.account_id,
          captureAt: new Date().toISOString(),
        },
      })
    } catch (e) {
      setParseError(e instanceof Error ? e.message : '解析失敗')
    } finally {
      setParsing(false)
    }
  }

  const onClipboard = async () => {
    setClipboardFailed(false)
    try {
      const text = await navigator.clipboard.readText()
      setPasteText(text)
      await runParse(text)
    } catch {
      setClipboardFailed(true)
      setParseError('讀不到剪貼簿，請長按上面的框貼上')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg text-center space-y-4">
        <h1 className="text-2xl font-bold">{t('home.title')}</h1>
        <p className="text-muted-foreground">登入後就可以貼上遊戲頁面、確認後存入。</p>
        <Link to="/login">
          <Button type="button">登入</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg space-y-6">
      {savedBanner && (
        <div
          className="rounded-md border border-green-300 bg-green-50 text-green-900 text-sm px-3 py-2"
          data-testid="saved-banner"
        >
          {savedBanner}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setSavedBanner('')}
          >
            關閉
          </button>
        </div>
      )}

      <Card data-testid="paste-home">
        <CardHeader>
          <CardTitle className="text-xl">貼上遊戲頁面</CardTitle>
          <p className="text-sm text-muted-foreground">
            在遊戲裡全選、複製，貼到這裡就好。工具會自己判斷是哪一種頁面。
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border px-2 py-0.5">集結點</span>
            <span className="rounded-full border px-2 py-0.5">戰報</span>
            <span className="rounded-full border px-2 py-0.5">村莊總覽</span>
            <span className="rounded-full border px-2 py-0.5">更多之後加</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full min-h-[140px] rounded-md border bg-background p-3 text-sm"
            placeholder="把遊戲頁面貼在這裡…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            data-testid="paste-textarea"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void onClipboard()} disabled={parsing || accountLoading}>
              從剪貼簿貼上
            </Button>
            <Button
              variant="outline"
              onClick={() => void runParse(pasteText)}
              disabled={parsing || !pasteText.trim()}
              data-testid="parse-paste-btn"
            >
              {parsing ? '解析中…' : '解析這段文字'}
            </Button>
            <Button
              variant="outline"
              disabled
              title="即將推出"
              data-testid="upload-screenshot-btn"
            >
              上傳截圖（即將推出）
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            截圖辨識即將推出，現在請用貼上或擴充。按鈕讀不到剪貼簿時，直接長按上面的框貼上也可以。
            {clipboardFailed ? ' （剛才讀剪貼簿失敗，請改用輸入框）' : ''}
          </p>
          <details className="text-xs text-muted-foreground">
            <summary>文字格式說明</summary>
            <pre className="mt-2 whitespace-pre-wrap">{PASTE_FORMAT_HELP}</pre>
          </details>
          {parseError && (
            <p className="text-sm text-destructive" data-testid="parse-error">
              {parseError}
            </p>
          )}
          {!currentAccount && !accountLoading && (
            <p className="text-sm text-amber-700">
              還沒有啟用中的帳號。請先到{' '}
              <Link className="underline" to="/game-accounts/new">
                新增遊戲帳號
              </Link>
              。
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="recent-uploads">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('home.recentUploads.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentLogs.length ? (
            <p
              className="text-sm text-muted-foreground py-3"
              data-testid="recent-uploads-empty"
            >
              {t('home.recentUploads.empty')}
            </p>
          ) : (
            <ul className="divide-y rounded-md border" data-testid="recent-uploads-list">
              {recentLogs.map((log) => {
                const when = formatRelativeLabel(
                  relativeAgo(log.completed_at || log.started_at, now),
                  t,
                )
                const line = formatRecentUploadLine(
                  log,
                  log.village_id ? villageNameById.get(log.village_id) : null,
                )
                return (
                  <li
                    key={log.log_id}
                    className="px-3 py-2 text-sm flex justify-between gap-2"
                    data-testid="recent-upload-row"
                  >
                    <span className="min-w-0 truncate">{line}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{when}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card data-testid="incoming-list">
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg">來襲列表</CardTitle>
            {villages.length > 0 && (
              <label
                className="ml-auto inline-flex items-center rounded-full border bg-background py-1 pl-3 pr-2 text-sm"
                data-testid="incoming-village-filter"
              >
                <span className="text-muted-foreground">
                  {t('home.incoming.villageFilter')}
                </span>
                <select
                  className="cursor-pointer bg-transparent pr-1 font-medium outline-none max-w-[9rem]"
                  value={villageFilter}
                  onChange={(e) => persistVillageFilter(e.target.value)}
                  aria-label={t('home.incoming.villageFilter')}
                >
                  <option value={ALL_VILLAGES}>{t('home.incoming.allVillages')}</option>
                  {villages.map((v) => (
                    <option key={v.village_id} value={v.village_id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            依抵達時間排序，倒數每秒更新。資料來自最後一次存入的集結點。
          </p>
        </CardHeader>
        <CardContent>
          {!movements.length ? (
            <p className="text-sm text-muted-foreground py-4">還沒有來襲。貼上集結點後會出現在這裡。</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {movements.map((m) => (
                <li key={m.movement_id} className="px-3 py-2 text-sm flex justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {movementKindLabel(m.kind)}{' '}
                      <span className="font-normal text-muted-foreground">
                        {m.coordinate_x != null && m.coordinate_y != null
                          ? `(${m.coordinate_x}|${m.coordinate_y})`
                          : m.role || '？？？'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      抵達{' '}
                      {m.arrival_at
                        ? new Date(m.arrival_at).toLocaleString('zh-TW', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          })
                        : '—'}
                      {' · '}
                      剩 {countdownLabel(m.arrival_at, now)}
                    </div>
                  </div>
                  {m.needs_coords ? (
                    <Link
                      className="text-amber-700 text-xs shrink-0 underline"
                      to={`/paste/movement/${m.movement_id}`}
                    >
                      待補
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0">完整</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
