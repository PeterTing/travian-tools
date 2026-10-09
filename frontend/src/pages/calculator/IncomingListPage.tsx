import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TimePair from '@/components/home/TimePair'
import { countdownText } from '@/components/home/IncomingCard'
import { useAccountData } from '@/contexts/AccountDataContext'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { movementKindLabel } from '@/lib/pasteFormat'
import { pasteApi, type Movement } from '@/services/pasteApi'
import { villageApi } from '@/services/villageApi'

const ALL_VILLAGES = ''

function incomingVillageStorageKey(accountId: string, worldId?: string | null): string {
  return `tt:incomingVillage:${accountId}:${worldId || 'noworld'}`
}

/** 防守 › 來襲列表（首頁來襲卡「全部 ›」）：依抵達排序，伺服器時間為主、附本地時間 */
export default function IncomingListPage() {
  const { t } = useTranslation()
  const { currentAccount } = useCurrentAccount()
  const { world } = useAccountData()
  const accountId = currentAccount?.account_id ?? null
  const worldId = currentAccount?.world_id ?? null
  const [movements, setMovements] = useState<Movement[]>([])
  const [villages, setVillages] = useState<{ village_id: string; name: string; coordinate_x: number | null; coordinate_y: number | null }[]>([])
  const [villageFilter, setVillageFilter] = useState(ALL_VILLAGES)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!accountId) {
      setVillageFilter(ALL_VILLAGES)
      return
    }
    try {
      setVillageFilter(localStorage.getItem(incomingVillageStorageKey(accountId, worldId)) ?? ALL_VILLAGES)
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

  const reload = useCallback(async () => {
    if (!accountId) {
      setMovements([])
      return
    }
    try {
      const res = await pasteApi.listMovements(accountId, { villageId: villageFilter || null })
      setMovements(res.movements ?? [])
    } catch {
      setMovements([])
    }
  }, [accountId, villageFilter])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!accountId) {
      setVillages([])
      return
    }
    villageApi
      .getAll(accountId)
      .then((res) =>
        setVillages(
          (res.villages || []).map((v) => ({
            village_id: v.village_id,
            name: v.name || v.village_id,
            coordinate_x: v.coordinate_x ?? null,
            coordinate_y: v.coordinate_y ?? null,
          })),
        ),
      )
      .catch(() => setVillages([]))
  }, [accountId])

  const villageName = (id: string | null | undefined) => {
    const v = villages.find((x) => x.village_id === id)
    return v ? `${v.name} (${v.coordinate_x}|${v.coordinate_y})` : t('home.incomingCard.unknownVillage')
  }

  return (
    <div className="mx-auto w-full max-w-3xl min-w-0 space-y-3 px-4 py-4" data-testid="incoming-list">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">{t('nav.calcs.incoming')}</h1>
        {villages.length > 0 && (
          <label
            className="ml-auto inline-flex items-center rounded-full border bg-background py-1 pl-3 pr-2 text-sm"
            data-testid="incoming-village-filter"
          >
            <span className="text-muted-foreground">{t('home.incoming.villageFilter')}</span>
            <select
              className="max-w-[9rem] cursor-pointer bg-transparent pr-1 font-medium outline-none"
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
      <p className="text-sm text-muted-foreground">{t('home.incoming.listNote')}</p>
      {!movements.length ? (
        <p className="py-4 text-sm text-muted-foreground">{t('home.incoming.none')}</p>
      ) : (
        <ul className="divide-y rounded-md border bg-background">
          {movements.map((m) => {
            const arrived = m.arrival_at ? new Date(m.arrival_at).getTime() <= now.getTime() : false
            return (
              <li key={m.movement_id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm" data-testid="incoming-row">
                <div className="min-w-0">
                  <div className="font-medium">
                    {movementKindLabel(m.kind)} → {villageName(m.village_id)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.coordinate_x != null && m.coordinate_y != null
                      ? `${t('home.incomingCard.from')} (${m.coordinate_x}|${m.coordinate_y})`
                      : t('home.incomingCard.unknownFrom')}
                    {' · '}
                    {t('home.incomingCard.noLastSeenShort')}
                  </div>
                  {m.needs_coords && (
                    <Link className="text-xs text-amber-700 underline" to={`/paste/movement/${m.movement_id}`}>
                      {t('home.incomingCard.needsCoords')}
                    </Link>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono font-semibold tabular-nums">
                    {arrived ? t('home.incoming.arrived') : countdownText(m.arrival_at, now)}
                  </div>
                  {m.arrival_at && <TimePair date={new Date(m.arrival_at)} utcOffset={world?.utc_offset} now={now} />}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
