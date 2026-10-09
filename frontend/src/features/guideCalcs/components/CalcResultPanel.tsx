import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import s from './calc.module.css'

export interface CalcResultPanelProps {
  /** Optional small heading above the summary (e.g. 結果) */
  title?: string
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

  // 手機：量收合時的高度，寫到 <html> 的 --calc-panel-h，輸入區才能留出剛好的空間。
  // 展開明細時不更新（保持收合高度），電腦版不需要。
  useLayoutEffect(() => {
    const el = rootRef.current
    const root = document.documentElement
    if (!el || isDesktop) {
      root.style.removeProperty(PANEL_HEIGHT_VAR)
      return
    }
    if (open) return
    const measure = () => root.style.setProperty(PANEL_HEIGHT_VAR, `${Math.ceil(el.getBoundingClientRect().height)}px`)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
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
      {title ? <h4 className={s.summaryTitle}>{title}</h4> : null}

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
    </div>
  )
}
