import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { looksLikeHtml, movementKindLabel, PASTE_FORMAT_HELP } from '@/lib/pasteFormat'
import { pasteApi, type Movement } from '@/services/pasteApi'

function countdownLabel(arrivalAt: string | null | undefined, now: Date): string {
  if (!arrivalAt) return '—'
  const t = new Date(arrivalAt).getTime() - now.getTime()
  if (Number.isNaN(t)) return '—'
  if (t <= 0) return '已抵達'
  const s = Math.floor(t / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
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
  const [now, setNow] = useState(() => new Date())
  const [savedBanner, setSavedBanner] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const msg = params.get('saved')
    if (msg) {
      setSavedBanner(msg)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const reloadMovements = useCallback(async () => {
    if (!currentAccount) {
      setMovements([])
      return
    }
    try {
      const res = await pasteApi.listMovements(currentAccount.account_id)
      setMovements(res.movements)
    } catch {
      setMovements([])
    }
  }, [currentAccount])

  useEffect(() => {
    void reloadMovements()
  }, [reloadMovements])

  const runParse = async (raw: string) => {
    if (!currentAccount) {
      setParseError('請先在頂部選擇遊戲帳號')
      return
    }
    const content = raw.trim()
    if (!content) {
      setParseError('請先貼上內容')
      return
    }
    setParsing(true)
    setParseError('')
    try {
      const kind = looksLikeHtml(content) ? 'html' : 'text'
      const result = await pasteApi.preview({
        kind,
        html: kind === 'html' ? content : undefined,
        text: kind === 'text' ? content : undefined,
      })
      if (!result.ok && result.page_type === 'unknown') {
        setParseError('認不出這是哪一頁。可能只複製到一部分。請在遊戲裡全選後再複製一次，或手動選類型。')
        navigate('/paste/confirm', {
          state: {
            preview: result,
            raw,
            kind,
            accountId: currentAccount.account_id,
            captureAt: new Date().toISOString(),
            unknown: true,
          },
        })
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

      <Card data-testid="incoming-list">
        <CardHeader>
          <CardTitle className="text-lg">來襲列表</CardTitle>
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
