import { useEffect, useId, useState, type ReactNode } from 'react'
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
  const panelId = useId()
  const detailsId = `${panelId}-details`

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

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
    <div className={s.output} data-testid="calc-result-panel">
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
