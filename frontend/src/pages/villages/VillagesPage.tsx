import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ROUTES } from '@/constants/routes'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import {
  formatCoordinates,
  formatNumber,
  formatSignedNumber,
  pastedAgo,
  sortVillages,
  type VillageSortKey,
} from '@/lib/villageDisplay'
import { villageApi } from '@/services/villageApi'
import type { Village } from '@/types/game'
import VillageForm from './VillageForm'

const SORT_KEYS: VillageSortKey[] = ['population', 'crop', 'name']
const SORT_LABEL_KEYS: Record<VillageSortKey, string> = {
  population: 'villages.list.sortPopulation',
  crop: 'villages.list.sortCrop',
  name: 'villages.list.sortName',
}

/**
 * 村莊列表（P0 線框稿 v0.4「村莊列表」）。
 * 只顯示頂部選的那個帳號＋世界（只會是啟用中的）；
 * 頂部提示「資料是 n 小時前貼上的」，每列：名稱＋座標，下面人口和每小時糧食淨產量（負的標紅）。
 */
export default function VillagesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { accounts, currentAccount, loading: accountsLoading, reload: reloadAccounts } = useCurrentAccount()
  const selectedAccountId = currentAccount?.account_id ?? ''
  const [villages, setVillages] = useState<Village[]>([])
  const [lastPastedAt, setLastPastedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [sortKey, setSortKey] = useState<VillageSortKey>('population')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    setVillages([])
    setLastPastedAt(null)
    setLoadError(false)
    if (!selectedAccountId) {
      setLoading(false)
      return
    }
    // 很快切換帳號時，舊帳號晚回來的結果不能蓋掉新的
    let stale = false
    setLoading(true)
    villageApi
      .getAll(selectedAccountId)
      .then((response) => {
        if (stale) return
        setVillages(response.villages)
        setLastPastedAt(response.last_pasted_at ?? null)
      })
      .catch((error) => {
        if (stale) return
        console.error('Failed to load villages:', error)
        setLoadError(true)
      })
      .finally(() => {
        if (!stale) setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [selectedAccountId, reloadToken])

  const rows = useMemo(() => sortVillages(villages, sortKey), [villages, sortKey])

  const handleFormSuccess = () => {
    setShowForm(false)
    setReloadToken((n) => n + 1)
    // 頂部切換清單裡的「N 村」也要跟著變
    void reloadAccounts()
  }

  if (accountsLoading && accounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t('villages.noAccounts')}</p>
            <Button onClick={() => navigate(ROUTES.GAME_ACCOUNTS_NEW)}>{t('villages.goToAccounts')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <VillageForm
          accountId={selectedAccountId}
          village={null}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      </div>
    )
  }

  const ago = pastedAgo(lastPastedAt)
  const agoText = 'count' in ago ? t(`villages.list.${ago.key}`, { count: ago.count }) : t(`villages.list.${ago.key}`)

  return (
    <div className="container mx-auto max-w-3xl px-4 py-4 md:py-8">
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-xl font-bold md:text-2xl">{t('villages.list.title')}</h1>
        <span className="text-sm text-muted-foreground" data-testid="village-count">
          {t('villages.list.count', { count: villages.length })}
        </span>
        {villages.length > 0 && (
          <label className="ml-auto inline-flex items-center rounded-full border bg-background py-1 pl-3 pr-2 text-sm">
            <span className="text-muted-foreground">{t('villages.list.sortLabel')}</span>
            <select
              className="cursor-pointer bg-transparent pr-1 font-medium outline-none"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as VillageSortKey)}
              aria-label={t('villages.list.sortLabel')}
            >
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(SORT_LABEL_KEYS[key])}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : loadError ? (
        <Card>
          <CardContent className="py-10 text-center text-destructive">{t('villages.loadError')}</CardContent>
        </Card>
      ) : villages.length === 0 ? (
        <Card data-testid="villages-empty">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="font-medium">{t('villages.list.emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('villages.list.emptyHint')}</p>
            <Button className="mt-2" variant="outline" onClick={() => setShowForm(true)}>
              {t('villages.list.addManually')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            role="status"
            data-testid="villages-paste-notice"
            className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            {agoText}
            {t('villages.list.howToUpdate')}
          </div>

          <ul className="divide-y overflow-hidden rounded-lg border bg-card" data-testid="village-list">
            {rows.map((village) => (
              <VillageRow key={village.village_id} village={village} />
            ))}
          </ul>

          <Button variant="outline" className="mt-3 w-full" onClick={() => setShowForm(true)}>
            {t('villages.list.addManually')}
          </Button>
        </>
      )}
    </div>
  )
}

function VillageRow({ village }: { village: Village }) {
  const { t } = useTranslation()
  const name = village.name || t('villages.unnamed')
  const coordinates = formatCoordinates(village.coordinate_x, village.coordinate_y)
  const crop = village.crop_net_per_hour
  const cropNegative = typeof crop === 'number' && crop < 0

  return (
    <li data-testid="village-row">
      <Link
        to={ROUTES.VILLAGES.DETAIL(village.village_id)}
        aria-label={t('villages.list.openDetail', { name })}
        className="flex items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="truncate font-semibold">{name}</span>
            {coordinates && <span className="tabular-nums">{coordinates}</span>}
            {village.is_capital && (
              <span className="rounded-md bg-sky-100 px-1.5 text-[11px] font-semibold leading-5 text-sky-700">
                {t('villages.capital')}
              </span>
            )}
            {/* 角色標籤（鎚子、供糧、鐵砧、征服）之後放在這裡 */}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            <span>{t('villages.list.population', { value: formatNumber(village.population) })}</span>
            <span aria-hidden="true"> · </span>
            <span
              data-testid="village-crop"
              data-negative={cropNegative ? 'true' : 'false'}
              className={cropNegative ? 'font-medium text-red-600' : undefined}
            >
              {typeof crop === 'number'
                ? t('villages.list.cropPerHour', { value: formatSignedNumber(crop) })
                : t('villages.list.cropUnknown')}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  )
}
