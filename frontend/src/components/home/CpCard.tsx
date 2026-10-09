import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PendingVerifyChip from '@/components/common/PendingVerifyChip'
import { isVillageCpVerified, villageRequirements, type ServerSpeed } from '@/data/gameData'
import { daysToReach, readCpProgress } from '@/lib/cpProgress'

const SPEEDS: ServerSpeed[] = [1, 2, 3, 5, 10]

/** 「10/9 22:01」：本地時間，月/日 時:分，不寫星期 */
// eslint-disable-next-line react-refresh/only-export-components
export function shortLocalStamp(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 首頁「開 N 村 · CP」卡：數字從「CP 與開村」來，一點就到那頁 */
export default function CpCard({
  accountId,
  villageCount,
  speed,
}: {
  accountId: string | null
  villageCount: number
  speed: number
}) {
  const { t } = useTranslation()
  const sp: ServerSpeed = SPEEDS.includes(speed as ServerSpeed) ? (speed as ServerSpeed) : 1
  const next = Math.max(2, villageCount + 1)
  const req = villageRequirements(sp)
  const target = req[next - 1] ?? null
  const verified = isVillageCpVerified(next, sp)
  const progress = readCpProgress(accountId)
  const days = progress && target != null ? daysToReach(progress.currentCp, target, progress.dailyCp) : null
  const stamp = shortLocalStamp(progress?.savedAt)
  const pct = progress && target ? Math.min(100, Math.round((progress.currentCp / target) * 100)) : 0

  return (
    <section className="rounded-xl border bg-background p-4 shadow-sm" data-testid="cp-card">
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold">{t('home.cpCard.title', { n: t(`home.villageOrdinal.${Math.min(next, 10)}`) })}</h2>
        {progress && (
          <Link
            to="/calculator/passive-cp"
            className="ml-auto inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-orange-700"
            data-testid="cp-card-go"
          >
            {t('home.cpCard.go')} ›
          </Link>
        )}
      </div>
      {progress && target != null ? (
        <>
          <p className="mt-1 text-lg font-semibold tabular-nums" data-testid="cp-card-progress">
            {progress.currentCp.toLocaleString()} / {target.toLocaleString()} CP
            {!verified && <PendingVerifyChip className="ml-1" kind="cpThreshold" />}
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('home.cpCard.perDay', { daily: progress.dailyCp.toLocaleString() })}
            {days != null && ` → ${t('home.cpCard.days', { days })}`}
          </p>
          {!verified && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('home.cpCard.pendingNote', { n: t(`home.villageOrdinal.${Math.min(next, 10)}`), target: target.toLocaleString() })}
            </p>
          )}
          {stamp && (
            <p className="mt-1 text-xs text-muted-foreground" data-testid="cp-card-last-input">
              {t('home.cpCard.lastInput', { at: stamp })}
            </p>
          )}
        </>
      ) : (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2" data-testid="cp-card-empty">
          <p className="text-sm text-muted-foreground">{t('home.cpCard.empty')}</p>
          <Link
            to="/calculator/passive-cp"
            className="inline-flex min-h-[44px] items-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted"
            data-testid="cp-card-enter"
          >
            {t('home.cpCard.enter')}
          </Link>
        </div>
      )}
    </section>
  )
}
