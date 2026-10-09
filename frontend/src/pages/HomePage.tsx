import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OcrFailed } from '@/components/ocr/OcrFailed'
import { OcrBetaTag } from '@/components/ocr/OcrBetaTag'
import { OcrRecognizing } from '@/components/ocr/OcrRecognizing'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { isUnarrived, useAccountData } from '@/contexts/AccountDataContext'
import CpCard from '@/components/home/CpCard'
import IncomingCard from '@/components/home/IncomingCard'
import TimePair from '@/components/home/TimePair'
import { ROUTES } from '@/constants/routes'
import {
  emptyPasteReasonKey,
  looksLikeHtml,
  pageTypeLabel,
  PASTE_FORMAT_HELP,
} from '@/lib/pasteFormat'
import { displayOffsetHours, formatOffsetHours } from '@/lib/serverTime'
import {
  formatRecentUploadLine,
  isSuccessfulSync,
  relativeAgo,
} from '@/lib/recentUploads'
import { defaultOcrCaptureAt } from '@/lib/ocrFields'
import { OCR_MAX_IMAGES, ocrApi, toOcrError } from '@/services/ocrApi'
import { pasteApi, type Movement } from '@/services/pasteApi'
import { syncApi, type SyncLog } from '@/services/syncApi'
import { villageApi } from '@/services/villageApi'

const RECENT_LIMIT = 5
/** 來襲 3 筆以上：手機列出接下來幾筆、電腦改成全寬表格（設計稿「來襲中」） */
const BUSY_INCOMING = 3

type OcrState =
  | { phase: 'idle' }
  | { phase: 'recognizing'; previews: string[]; startedAt: number }
  | { phase: 'failed'; code: string; message: string }

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

/**
 * 「＋ 貼上」浮動按鈕高 48px，底部再留 16px：頁面最下面的內容捲到底也不會被它蓋住。
 * （底部分頁列的高度已由 AppShell 的 main 留好。）電腦版沒有浮動按鈕。
 */
export const FAB_CLEARANCE = 'pb-[calc(48px+16px)] lg:pb-6'

export default function HomePage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { currentAccount, loading: accountLoading } = useCurrentAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const accountData = useAccountData()
  const pasteCardRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // 右下角「＋ 貼上」只在貼上卡已經捲到畫面上方、看不到時才出現：
  // 貼上卡在畫面裡（或還在下面、往下捲就到）時不顯示，免得蓋住來襲／開村卡和貼上框
  const [pasteCardScrolledPast, setPasteCardScrolledPast] = useState(false)
  const [pasteCardEl, setPasteCardEl] = useState<HTMLDivElement | null>(null)
  const setPasteCardNode = useCallback((el: HTMLDivElement | null) => {
    pasteCardRef.current = el
    setPasteCardEl(el)
  }, [])
  useEffect(() => {
    if (!pasteCardEl || typeof IntersectionObserver === 'undefined') {
      setPasteCardScrolledPast(false)
      return
    }
    const io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (entry) setPasteCardScrolledPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0)
    })
    io.observe(pasteCardEl)
    return () => io.disconnect()
  }, [pasteCardEl])

  const [pasteText, setPasteText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [clipboardFailed, setClipboardFailed] = useState(false)
  const [movements, setMovements] = useState<Movement[]>([])
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([])
  const [villages, setVillages] = useState<
    { village_id: string; name: string; coordinate_x: number; coordinate_y: number }[]
  >([])
  const [now, setNow] = useState(() => new Date())
  const [savedBanner, setSavedBanner] = useState('')
  const [ocr, setOcr] = useState<OcrState>({ phase: 'idle' })
  const ocrAbort = useRef<AbortController | null>(null)
  const ocrPreviews = useRef<string[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  const accountId = currentAccount?.account_id ?? null

  // 倒數每秒更新；沒有來襲時每 30 秒更新頁首的時鐘就好
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), movements.length ? 1000 : 30_000)
    return () => window.clearInterval(id)
  }, [movements.length])

  // 回到首頁（例如存完貼上）時，讓紅點和「已帶入」也重新讀一次
  const reloadAccountData = accountData.reload
  useEffect(() => {
    void reloadAccountData()
  }, [reloadAccountData])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const msg = params.get('saved')
    if (msg) {
      setSavedBanner(msg)
      window.history.replaceState({}, '', '/')
    }
  }, [])

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
      const res = await pasteApi.listMovements(accountId)
      setMovements(res.movements ?? [])
    } catch {
      setMovements([])
    }
  }, [accountId])

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

  // 三樣都讀完才決定要不要顯示空狀態，免得畫面跳來跳去
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    void Promise.all([reloadMovements(), reloadRecent(), reloadVillages()]).then(() => {
      if (!cancelled) setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [reloadMovements, reloadRecent, reloadVillages])

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

  const dropPreviews = () => {
    for (const u of ocrPreviews.current) URL.revokeObjectURL(u)
    ocrPreviews.current = []
  }

  const onScreenshots = async (list: FileList | null) => {
    const files = Array.from(list || [])
    if (fileInput.current) fileInput.current.value = ''
    if (!files.length) return
    setSavedBanner('')
    setParseError('')
    if (!currentAccount) {
      setParseError(t('ocr.upload.needAccount'))
      return
    }
    if (files.length > OCR_MAX_IMAGES) {
      setOcr({
        phase: 'failed',
        code: 'OCR_TOO_MANY_IMAGES',
        message: t('ocr.upload.tooMany', { max: OCR_MAX_IMAGES }),
      })
      return
    }
    dropPreviews()
    const previews = files.map((f) => URL.createObjectURL(f))
    ocrPreviews.current = previews
    const controller = new AbortController()
    ocrAbort.current = controller
    setOcr({ phase: 'recognizing', previews, startedAt: Date.now() })
    try {
      const result = await ocrApi.recognizeRally(
        currentAccount.account_id,
        files,
        controller.signal,
      )
      const { captureAt, timeSource } = defaultOcrCaptureAt(
        files,
        result.ocr.capture_at_suggested,
      )
      const images = previews.map((url, i) => ({
        url,
        width: result.ocr.images[i]?.width ?? 0,
        height: result.ocr.images[i]?.height ?? 0,
      }))
      ocrPreviews.current = [] // 交給確認畫面用（放大原處）
      setOcr({ phase: 'idle' })
      navigate('/paste/confirm', {
        state: {
          preview: {
            ok: result.ok,
            page_type: result.page_type,
            data: result.data,
            warnings: result.warnings,
            server_time: result.server_time,
          },
          source: 'ocr',
          ocr: result.ocr,
          images,
          timeSource,
          accountId: currentAccount.account_id,
          captureAt,
        },
      })
    } catch (e) {
      const err = toOcrError(e)
      dropPreviews()
      if (err.code === 'OCR_CANCELLED') {
        setOcr({ phase: 'idle' })
      } else {
        setOcr({ phase: 'failed', code: err.code, message: err.message })
      }
    } finally {
      ocrAbort.current = null
    }
  }

  const cancelOcr = () => {
    ocrAbort.current?.abort()
    dropPreviews()
    setOcr({ phase: 'idle' })
  }

  useEffect(() => () => ocrAbort.current?.abort(), [])

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

  // 桌機：首頁直接按 Ctrl＋V 也能貼（焦點不在輸入框時）
  const runParseRef = useRef(runParse)
  runParseRef.current = runParse
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const text = e.clipboardData?.getData('text/html') || e.clipboardData?.getData('text/plain') || ''
      if (!text.trim()) return
      e.preventDefault()
      setPasteText(text)
      void runParseRef.current(text)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  const focusPaste = useCallback(() => {
    pasteCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    textareaRef.current?.focus({ preventScroll: true })
  }, [])

  // 頂列「＋ 貼上」連到 /#paste
  useEffect(() => {
    if (location.hash === '#paste') focusPaste()
  }, [location.hash, focusPaste])

  const villageName = useCallback(
    (id: string | null | undefined) => {
      if (!id) return t('home.incomingCard.unknownVillage')
      const v = villages.find((x) => x.village_id === id)
      if (!v) return t('home.incomingCard.unknownVillage')
      return `${v.name} (${v.coordinate_x}|${v.coordinate_y})`
    },
    [villages, t],
  )

  const unarrived = useMemo(() => movements.filter((m) => isUnarrived(m, now)), [movements, now])
  const needsCoords = useMemo(() => movements.filter((m) => m.needs_coords && isUnarrived(m, now)), [movements, now])
  const utcOffset = accountData.world?.utc_offset ?? null
  const offsetHours = displayOffsetHours(utcOffset)
  const busy = unarrived.length >= BUSY_INCOMING
  const isEmpty =
    (!currentAccount && !accountLoading) || (loaded && !recentLogs.length && !villages.length && !movements.length)
  const latestLog = recentLogs[0]

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

  const pasteCard = (
    <div ref={setPasteCardNode} className="scroll-mt-20" id="paste">
      <Card data-testid="paste-home">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            {t('home.pasteCard.title')}
            <OcrBetaTag />
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('home.pasteCard.hint')}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            data-testid="upload-screenshot-input"
            onChange={(e) => void onScreenshots(e.target.files)}
          />
          {ocr.phase === 'recognizing' ? (
            <OcrRecognizing previews={ocr.previews} startedAt={ocr.startedAt} onCancel={cancelOcr} />
          ) : (
            <>
              {ocr.phase === 'failed' && (
                <OcrFailed
                  code={ocr.code}
                  message={ocr.message}
                  onRetry={() => {
                    setOcr({ phase: 'idle' })
                    fileInput.current?.click()
                  }}
                  onDismiss={() => setOcr({ phase: 'idle' })}
                />
              )}
              <textarea
                ref={textareaRef}
                className="w-full min-h-[120px] rounded-md border bg-background p-3 text-sm"
                placeholder={t('home.pasteCard.placeholder')}
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
                  onClick={() => fileInput.current?.click()}
                  disabled={parsing || accountLoading || !currentAccount}
                  data-testid="upload-screenshot-btn"
                >
                  📷 {t('ocr.upload.button')}
                  <OcrBetaTag />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('ocr.upload.hint', { max: OCR_MAX_IMAGES })}
                按鈕讀不到剪貼簿時，直接長按上面的框貼上也可以。
                {clipboardFailed ? ' （剛才讀剪貼簿失敗，請改用輸入框）' : ''}
              </p>
              <details className="text-xs text-muted-foreground">
                <summary>文字格式說明</summary>
                <pre className="mt-2 whitespace-pre-wrap">{PASTE_FORMAT_HELP}</pre>
              </details>
            </>
          )}
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
          <div data-testid="recent-uploads" className="border-t pt-2 text-xs text-muted-foreground">
            {latestLog ? (
              <p data-testid="recent-upload-row" className="flex flex-wrap gap-x-1">
                <span>{t('home.recentUploads.latest')}</span>
                <span className="min-w-0 break-words">
                  {formatRecentUploadLine(latestLog, latestLog.village_id ? villageNameById.get(latestLog.village_id) : null)}
                </span>
                <span>· {formatRelativeLabel(relativeAgo(latestLog.completed_at || latestLog.started_at, now), t)}</span>
              </p>
            ) : (
              <p data-testid="recent-uploads-empty">{t('home.recentUploads.empty')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const pendingItems = [
    ...needsCoords.map((m) => ({
      key: m.movement_id,
      to: `/paste/movement/${m.movement_id}`,
      text: t('home.pendingCard.needsCoords', { village: villageName(m.village_id) }),
    })),
    ...(currentAccount && villages.length === 0
      ? [{ key: 'no-villages', to: '#paste', text: t('home.pendingCard.noVillages') }]
      : []),
  ]
  const pendingCard =
    pendingItems.length > 0 ? (
      <section className="rounded-xl border bg-background p-4 shadow-sm" data-testid="pending-card">
        <h2 className="text-base font-semibold">
          {t('home.pendingCard.title')}{' '}
          <span className="rounded-full bg-amber-100 px-2 text-sm text-amber-800">{pendingItems.length}</span>
        </h2>
        <ul className="mt-2 divide-y rounded-md border">
          {pendingItems.map((item) => (
            <li key={item.key}>
              {item.to.startsWith('#') ? (
                <button
                  type="button"
                  onClick={focusPaste}
                  className="flex min-h-[44px] w-full items-center justify-between px-3 text-left text-sm hover:bg-muted"
                >
                  {item.text} <span aria-hidden="true">›</span>
                </button>
              ) : (
                <Link to={item.to} className="flex min-h-[44px] items-center justify-between px-3 text-sm hover:bg-muted">
                  {item.text} <span aria-hidden="true">›</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    ) : null

  const cpCard = (
    <CpCard
      accountId={accountId}
      villageCount={villages.length || currentAccount?.village_count || 1}
      speed={currentAccount?.server_speed ?? 1}
    />
  )

  const showFab = !isEmpty && pasteCardScrolledPast

  const incomingCard =
    unarrived.length > 0 ? (
      <IncomingCard movements={unarrived} villageName={villageName} utcOffset={utcOffset} now={now} busy={busy} />
    ) : null

  return (
    <div
      className={`mx-auto w-full max-w-lg space-y-4 px-4 py-4 lg:max-w-[1080px] lg:px-6 lg:py-6 ${isEmpty ? '' : FAB_CLEARANCE}`}
      data-testid="home-root"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="text-xl font-bold">{isEmpty ? t('home.empty.title') : t('home.todayTitle')}</h1>
        {!isEmpty && (
          <span className="text-xs text-muted-foreground" data-testid="home-clock">
            <TimePair date={now} utcOffset={utcOffset} now={now} inline />
          </span>
        )}
      </div>

      {savedBanner && (
        <div
          className="rounded-md border border-green-300 bg-green-50 text-green-900 text-sm px-3 py-2"
          data-testid="saved-banner"
        >
          {savedBanner}
          <button type="button" className="ml-3 underline" onClick={() => setSavedBanner('')}>
            關閉
          </button>
        </div>
      )}

      {isEmpty && <p className="text-sm text-muted-foreground">{t('home.empty.subtitle')}</p>}

      {/*
        卡片都是同一層的兄弟，順序固定（貼上卡不會因為換版面被重新建立，打到一半的字不會不見）；
        版面用 order／欄位決定：
        - 空狀態：貼上全寬置頂，下面左「三步開始」、右「貼完後會出現」
        - 來襲中（3 筆以上）：來襲全寬，下面開村和貼上並排，最後待補
        - 方案 A：來襲 → 開村 → 貼上 → 待補；電腦左主欄（來襲、開村）＋右欄（貼上、待補）
      */}
      <div
        className={`grid grid-cols-1 gap-4 lg:grid-cols-12 ${
          isEmpty || busy ? '' : `lg:items-start ${incomingCard ? 'lg:grid-rows-[auto_1fr]' : ''}`
        }`}
        data-testid={isEmpty ? 'home-empty' : busy ? 'home-busy' : 'home-normal'}
      >
        {isEmpty && (
        <section className="order-2 rounded-xl border bg-background p-4 lg:col-span-6" data-testid="home-steps">
          <h2 className="text-base font-semibold">{t('home.empty.stepsTitle')}</h2>
          <ol className="mt-2 space-y-3 text-sm">
            <li className="flex gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  currentAccount ? 'bg-green-600 text-white' : 'bg-muted'
                }`}
              >
                {currentAccount ? '✓' : '1'}
              </span>
              <span className="min-w-0">
                {currentAccount ? (
                  <>
                    <span className="block font-medium">{t('home.empty.step1Done')}</span>
                    <span className="block text-xs text-muted-foreground">
                      {currentAccount.server_name || currentAccount.server_url} · {t('home.empty.step1Detail')}{' '}
                      {offsetHours == null
                        ? t('autofill.offsetUnknown')
                        : t('autofill.offsetKnown', { hours: formatOffsetHours(offsetHours) })}
                    </span>
                  </>
                ) : (
                  <Link to={ROUTES.GAME_ACCOUNTS_NEW} className="font-medium text-orange-700 underline">
                    {t('home.empty.step1')}
                  </Link>
                )}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">2</span>
              <span className="min-w-0">
                <span className="block font-medium">{t('home.empty.step2')}</span>
                <span className="block text-xs text-muted-foreground">{t('home.empty.step2Detail')}</span>
              </span>
            </li>
            <li>
              <Link
                to="/calculator/passive-cp"
                className="-mx-2 flex min-h-[44px] gap-3 rounded-md px-2 py-1 hover:bg-muted"
                data-testid="home-step3-cp"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">3</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t('home.empty.step3')}</span>
                  <span className="block text-xs text-muted-foreground">{t('home.empty.step3Detail')}</span>
                </span>
                <span aria-hidden className="self-center text-orange-600">›</span>
              </Link>
            </li>
          </ol>
        </section>
        )}
        {!isEmpty && incomingCard && (
          <div className={`order-1 min-w-0 lg:self-start ${busy ? 'lg:col-span-12' : 'lg:col-span-7 lg:col-start-1 lg:row-start-1'}`}>
            {incomingCard}
          </div>
        )}
        {!isEmpty && (
          <div
            className={`order-2 min-w-0 lg:self-start ${
              busy ? 'lg:col-span-6' : `lg:col-span-7 lg:col-start-1 ${incomingCard ? 'lg:row-start-2' : 'lg:row-start-1'}`
            }`}
          >
            {cpCard}
          </div>
        )}
        <div
          className={`min-w-0 ${
            isEmpty ? 'order-1 lg:col-span-12' : busy ? 'order-3 lg:col-span-6' : `order-3 lg:col-span-5 lg:col-start-8 lg:row-start-1 ${incomingCard ? 'lg:row-span-2' : ''}`
          }`}
        >
          {pasteCard}
        </div>
        {!isEmpty && pendingCard && (
          <div className={`order-4 min-w-0 ${busy ? 'lg:col-span-12' : `lg:col-span-5 lg:col-start-8 ${incomingCard ? 'lg:row-start-3' : 'lg:row-start-2'}`}`}>
            {pendingCard}
          </div>
        )}
        {isEmpty && (
        <section className="order-3 rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground lg:col-span-6" data-testid="home-preview">
          <h2 className="text-base font-semibold text-foreground">{t('home.empty.previewTitle')}</h2>
          <ul className="mt-2 space-y-2">
            <li className="rounded-md border bg-background/60 px-3 py-2">{t('home.empty.previewIncoming')}</li>
            <li className="rounded-md border bg-background/60 px-3 py-2">{t('home.empty.previewCp')}</li>
          </ul>
        </section>
        )}
      </div>

      {/* 手機：右下角浮動「＋ 貼上」（電腦在頂列） */}
      {showFab && (
        <button
          type="button"
          onClick={focusPaste}
          className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] right-4 z-30 inline-flex min-h-[48px] items-center gap-1 rounded-full bg-orange-600 px-5 text-sm font-semibold text-white shadow-lg lg:hidden"
          data-testid="paste-fab"
        >
          ＋ {t('home.pasteFab')}
        </button>
      )}
    </div>
  )
}
