import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { ROUTES } from '@/constants/routes'
import { movementKindLabel } from '@/lib/pasteFormat'
import { serverAndLocal } from '@/lib/serverTime'
import type { Movement } from '@/services/pasteApi'
import TimePair from './TimePair'

// eslint-disable-next-line react-refresh/only-export-components
export function countdownText(arrivalAt: string | null | undefined, now: Date): string {
  if (!arrivalAt) return '—'
  const ms = new Date(arrivalAt).getTime() - now.getTime()
  if (Number.isNaN(ms)) return '—'
  // 設計稿：倒數一律 HH:MM:SS（00:12:48）
  const total = Math.max(0, Math.floor(ms / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}

function fromLabel(m: Movement): string | null {
  if (m.coordinate_x != null && m.coordinate_y != null) return `(${m.coordinate_x}|${m.coordinate_y})`
  return null
}

interface IncomingCardProps {
  /** 還沒抵達的來襲，依抵達排序 */
  movements: Movement[]
  villageName: (villageId: string | null | undefined) => string
  utcOffset: number | null | undefined
  now: Date
  /** 多筆來襲：手機列出接下來幾筆，電腦改成全寬表格 */
  busy: boolean
}

/** 首頁來襲卡（IA v2.2 方案 A）：最近一筆倒數放最大，時間以伺服器時間為主 */
export default function IncomingCard({ movements, villageName, utcOffset, now, busy }: IncomingCardProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const first = movements[0]
  if (!first) return null
  const rest = movements.slice(1)
  const arrival = first.arrival_at ? new Date(first.arrival_at) : null
  const from = fromLabel(first)

  const copyForAllies = async () => {
    const lines = movements.map((m) => {
      const at = m.arrival_at ? serverAndLocal(new Date(m.arrival_at), utcOffset, now) : null
      const when = at ? (at.server ?? at.local) : '—'
      return `${movementKindLabel(m.kind)} → ${villageName(m.village_id)} ${t('time.server')} ${when}（${t('home.incomingCard.left')} ${countdownText(m.arrival_at, now)}）${fromLabel(m) ? ` ${t('home.incomingCard.from')} ${fromLabel(m)}` : ''}`
    })
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="rounded-xl border border-red-200 bg-background p-4 shadow-sm" data-testid="incoming-card">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-base font-semibold text-red-700">
          {t('home.incomingCard.title')}{' '}
          <span className="rounded-full bg-red-600 px-2 text-sm text-white" data-testid="incoming-count">
            {movements.length}
          </span>
        </h2>
        <span className="min-w-0 text-sm text-muted-foreground">
          {t('home.incomingCard.nearest', { village: villageName(first.village_id) })}
        </span>
        <Link
          to={ROUTES.CALCULATOR.INCOMING}
          className="ml-auto inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center text-sm text-orange-700"
          data-testid="incoming-all"
        >
          {t('home.incomingCard.all')} ›
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
        <span className="font-mono text-4xl font-bold tabular-nums text-red-700" data-testid="incoming-countdown">
          {countdownText(first.arrival_at, now)}
        </span>
        {arrival && <TimePair date={arrival} utcOffset={utcOffset} now={now} testId="incoming-time" />}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {movementKindLabel(first.kind)}
        {from ? ` · ${t('home.incomingCard.from')} ${from}` : ''}
        {first.needs_coords && (
          <>
            {' · '}
            <Link to={`/paste/movement/${first.movement_id}`} className="text-amber-700 underline">
              {t('home.incomingCard.needsCoords')}
            </Link>
          </>
        )}
      </p>
      <PendingRow as="p" className="mt-1 text-sm text-amber-800" data-testid="incoming-ts-line">
        ⚠ {t('home.incomingCard.noLastSeen')}
        {/* 反推 TS 用到兵種速度：只在這裡放一個待驗證（TICKETS P0-15） */}
        <PendingVerifyChip className="ml-1" kind="spartanSpeed" />
      </PendingRow>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/calculator/path-speed-ts"
          className="inline-flex min-h-[44px] items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white"
        >
          {t('nav.calcs.pathSpeedTs')}
        </Link>
        <Link
          to="/calculator/save-troops"
          className="inline-flex min-h-[44px] items-center rounded-md border px-3 text-sm"
        >
          {t('nav.calcs.saveTroops')}
        </Link>
        <button
          type="button"
          onClick={() => void copyForAllies()}
          className="inline-flex min-h-[44px] items-center rounded-md border px-3 text-sm"
          data-testid="incoming-copy"
        >
          {copied ? t('home.incomingCard.copied') : t('home.incomingCard.copy')}
        </button>
      </div>

      {busy && rest.length > 0 && (
        <>
          {/* 手機：接下來幾筆 */}
          <div className="mt-4 lg:hidden" data-testid="incoming-rest-list">
            <h3 className="text-sm font-semibold">
              {t('home.incomingCard.next', { count: rest.length })}{' '}
              <span className="text-xs font-normal text-muted-foreground">{t('home.incomingCard.byArrival')}</span>
            </h3>
            <ul className="mt-1 divide-y rounded-md border">
              {rest.map((m) => (
                <li key={m.movement_id} className="flex items-start justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium">{villageName(m.village_id)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fromLabel(m) ?? t('home.incomingCard.unknownFrom')} · {t('home.incomingCard.noLastSeenShort')}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono font-semibold tabular-nums">{countdownText(m.arrival_at, now)}</span>
                    {m.arrival_at && <TimePair date={new Date(m.arrival_at)} utcOffset={utcOffset} now={now} />}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {/* 電腦：全部列成表格，伺服器時間和本地時間各一欄 */}
          <div className="mt-4 hidden overflow-x-auto lg:block" data-testid="incoming-table">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">{t('home.incomingCard.colTarget')}</th>
                  <th className="py-1 pr-3">{t('home.incomingCard.colFrom')}</th>
                  <th className="py-1 pr-3">{t('home.incomingCard.colCountdown')}</th>
                  <th className="py-1 pr-3">{t('home.incomingCard.colServer')}</th>
                  <th className="py-1 pr-3">{t('home.incomingCard.colLocal')}</th>
                  <th className="py-1 pr-3">{t('nav.calcs.pathSpeedTs')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map((m) => {
                  const at = m.arrival_at ? serverAndLocal(new Date(m.arrival_at), utcOffset, now) : null
                  return (
                    <tr key={m.movement_id}>
                      <td className="py-1.5 pr-3">{villageName(m.village_id)}</td>
                      <td className="py-1.5 pr-3">{fromLabel(m) ?? '—'}</td>
                      <td className="py-1.5 pr-3 font-mono tabular-nums">{countdownText(m.arrival_at, now)}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{at?.server ?? '—'}</td>
                      <td className="py-1.5 pr-3 tabular-nums">
                        {at ? `${at.local}${at.localTomorrow ? t('time.tomorrow') : ''}` : '—'}
                      </td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{t('home.incomingCard.noLastSeenShort')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">{t('home.incomingCard.tableNote')}</p>
          </div>
        </>
      )}
    </section>
  )
}
