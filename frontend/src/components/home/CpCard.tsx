import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PendingVerifyChip from '@/components/common/PendingVerifyChip'
import { isVillageCpVerified, villageRequirements, type ServerSpeed } from '@/data/gameData'
import { daysToReach, readCpProgress } from '@/lib/cpProgress'

const SPEEDS: ServerSpeed[] = [1, 2, 3, 5, 10]

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
  const pct = progress && target ? Math.min(100, Math.round((progress.currentCp / target) * 100)) : 0

  return (
    <section className="rounded-xl border bg-background p-4 shadow-sm" data-testid="cp-card">
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold">{t('home.cpCard.title', { n: t(`home.villageOrdinal.${Math.min(next, 10)}`) })}</h2>
        <Link to="/calculator/passive-cp" className="ml-auto text-sm text-orange-700">
          {t('home.cpCard.go')} ›
        </Link>
      </div>
      {progress && target != null ? (
        <>
          <p className="mt-1 text-lg font-semibold tabular-nums" data-testid="cp-card-progress">
            {progress.currentCp.toLocaleString()} / {target.toLocaleString()} CP
            {!verified && <PendingVerifyChip className="ml-1" />}
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
          <p className="mt-1 text-xs text-muted-foreground">{t('home.cpCard.source')}</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground" data-testid="cp-card-empty">
          {t('home.cpCard.empty')}
        </p>
      )}
    </section>
  )
}
