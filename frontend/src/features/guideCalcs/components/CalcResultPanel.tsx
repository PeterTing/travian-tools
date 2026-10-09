import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import s from './calc.module.css'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { PendingFillContext } from '@/components/common/PendingNoteGroup'
import type { PendingKind } from '@/lib/pendingNotes'

export interface CalcResultPanelProps {
  /** Optional small heading above the summary (e.g. 結果) */
  title?: string
  /**
   * 摘要的大數字是用「待驗證」資料算出來的：灰標放在標題（大數字的標籤）旁邊，不放在大數字旁。
   * 手機收合時也看得到（P0-17 PM 規則：畫面上用待驗證資料算出的數字，旁邊都要有灰標）。
   */
  titlePending?: PendingKind | readonly PendingKind[] | false
  /** Main result — large type on phone */
  primary: ReactNode
  /** One line of secondary info under the primary */
  secondary?: ReactNode
  /** Full details; collapsed by default on phone, always open ≥1024 */
  children?: ReactNode
  /** Accessible name for the expand toggle */
  detailsLabel?: { zh: string; en: string }
  lang?: 'zh' | 'en'
}

const DESKTOP_MQ = '(min-width: 1024px)'

/** 收合時結果列的高度（px），輸入區底部用它留空間：calc(var(--calc-panel-h) + 16px) */
export const PANEL_HEIGHT_VAR = '--calc-panel-h'

/** 自己排版、但用了 CalcResultPanel 的頁面，把這個 class 加在輸入區外框上 */
export const RESULT_PANEL_SPACE_CLASS = s.panelSpace

/**
 * Shared calculator result shell (P0 cleanup):
 * - Phone: fixed panel shows primary + secondary; details behind aria-expanded toggle
 * - ≥1024: same full content as before (toggle hidden, details always visible)
 */
export default function CalcResultPanel({
  title,
  titlePending = false,
  primary,
  secondary,
  children,
  detailsLabel,
  lang = 'zh',
}: CalcResultPanelProps) {
  const [open, setOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const detailsId = `${panelId}-details`

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // 手機：面板現在的高度（收合、展開明細、點開灰標說明都會變）寫到 <html> 的 --calc-panel-h，
  // 共用版面的輸入區底部留「面板高度＋16px」，捲到底時最後一個輸入（含灰標）不會被面板蓋住
  // （設計師擋件）。面板本身最高 min(50vh, 22rem)、超過在面板內捲動，所以留白也不會超過這個高度。
  // 電腦版面板不是固定在底部，不需要。
  useLayoutEffect(() => {
    const el = rootRef.current
    const root = document.documentElement
    if (!el || isDesktop) {
      root.style.removeProperty(PANEL_HEIGHT_VAR)
      return
    }
    const measure = () => root.style.setProperty(PANEL_HEIGHT_VAR, `${Math.ceil(el.getBoundingClientRect().height)}px`)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // open：展開／收合明細時馬上量一次（不等 ResizeObserver）
  }, [isDesktop, open])
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty(PANEL_HEIGHT_VAR)
    },
    [],
  )

  const showDetails = isDesktop || open
  const label =
    detailsLabel != null
      ? lang === 'en'
        ? detailsLabel.en
        : detailsLabel.zh
      : lang === 'en'
        ? 'Details'
        : '明細'

  return (
    <div ref={rootRef} className={s.output} data-testid="calc-result-panel">
      {/* 面板裡的灰標說明撐滿面板內容寬度（設計師規則） */}
      <PendingFillContext.Provider value={true}>
      {title && titlePending ? (
        // 標題這一行至少 44px、垂直置中：灰標點擊範圍不碰到下面的大數字或「展開明細」
        <PendingRow as="h4" className={`${s.summaryTitle} flex min-h-11 items-center gap-1`} data-testid="calc-result-title">
          <span>{title}</span>
          <PendingVerifyChip kinds={typeof titlePending === 'string' ? [titlePending] : titlePending} />
        </PendingRow>
      ) : title ? (
        <h4 className={s.summaryTitle} data-testid="calc-result-title">{title}</h4>
      ) : null}

      <div className={s.summary} data-testid="calc-result-summary">
        <div className={s.primary} data-testid="calc-result-primary">
          {primary}
        </div>
        {secondary != null ? (
          <div className={s.secondary} data-testid="calc-result-secondary">
            {secondary}
          </div>
        ) : null}
      </div>

      {children != null ? (
        <>
          <button
            type="button"
            className={s.detailsToggle}
            aria-expanded={showDetails}
            aria-controls={detailsId}
            data-testid="calc-result-toggle"
            onClick={() => setOpen((v) => !v)}
          >
            {showDetails
              ? lang === 'en'
                ? `Hide ${label}`
                : `收合${label}`
              : lang === 'en'
                ? `Show ${label}`
                : `展開${label}`}
          </button>
          <div
            id={detailsId}
            className={s.details}
            hidden={!showDetails}
            data-testid="calc-result-details"
          >
            {children}
          </div>
        </>
      ) : null}
      </PendingFillContext.Provider>
    </div>
  )
}

/**
 * 摘要第二行（或其中一段）用到「待驗證」資料：字後面緊跟一個灰標。
 * 一行只放一個灰標；這一行有好幾種待驗證資料時傳 kinds，依數字在這一行出現的順序排（設計師）。
 * kinds 是空陣列就只顯示字（例如 Plus 沒勾）。這一行至少 44px、垂直置中，灰標點擊範圍不碰到「展開明細」。
 */
export function SummaryPending({ kind, kinds, children, testId }: { kind?: PendingKind; kinds?: readonly PendingKind[]; children: ReactNode; testId?: string }) {
  const list = kinds ?? (kind ? [kind] : [])
  if (list.length === 0) return <>{children}</>
  return (
    <PendingRow as="span" className="inline-flex min-h-11 flex-wrap items-center gap-x-1" data-testid={testId}>
      <span>{children}</span>
      <PendingVerifyChip kinds={list} />
    </PendingRow>
  )
}
