import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import {
  calculateTravelSeconds,
  distanceOnMap,
  formatTravelTime,
} from '@/lib/travianFormulas'
import CalcResultPanel from '@/features/guideCalcs/components/CalcResultPanel'

/**
 * 移動時間（路徑）計算器 — 前端即時結果（S71 競技場公式與後端共用）。
 * 版型：上方輸入、下方 sticky 結果；≥1024px 左右欄。
 */
export default function PathCalculatorPage() {
  const { t, i18n } = useTranslation()
  const guideLang = (i18n.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en'
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [targetX, setTargetX] = useState(0)
  const [targetY, setTargetY] = useState(0)
  const [unitSpeed, setUnitSpeed] = useState(7)
  const [tsLevel, setTsLevel] = useState(0)
  const [heroBonus, setHeroBonus] = useState(0)
  const [artifact, setArtifact] = useState<'none' | 'unique_2x' | 'village_2x'>('none')
  const [serverSpeed, setServerSpeed] = useState(1)

  const { currentAccount } = useCurrentAccount()
  useEffect(() => {
    if (currentAccount?.server_speed) {
      setServerSpeed(currentAccount.server_speed)
    }
  }, [currentAccount?.server_speed])

  const result = useMemo(() => {
    const distance = distanceOnMap(startX, startY, targetX, targetY)
    const artifactMultiplier = artifact === 'none' ? 1 : 2
    const travelSeconds = calculateTravelSeconds({
      distance,
      unitSpeed,
      serverSpeed,
      tournamentSquareLevel: tsLevel,
      heroBonusPercent: heroBonus,
      artifactMultiplier,
    })
    const hours = travelSeconds / 3600
    const arrivalSpeed = hours > 0 ? distance / hours : 0
    return {
      distance: Math.round(distance * 100) / 100,
      travelSeconds,
      formatted: formatTravelTime(travelSeconds),
      arrivalSpeed: Math.round(arrivalSpeed * 100) / 100,
    }
  }, [startX, startY, targetX, targetY, unitSpeed, tsLevel, heroBonus, artifact, serverSpeed])

  const inputCls =
    'w-full min-w-0 max-w-full rounded border border-input bg-background p-2 text-sm'

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 overflow-x-hidden px-3 py-4 sm:px-4">
      <div className="mb-4 rounded-xl border bg-card p-4">
        <h1 className="mb-2 text-xl font-semibold">{t('pathCalc.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('pathCalc.intro')}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-4 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px)+11rem)] lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:pb-0">
        <div className="min-w-0 rounded-xl border bg-card p-4">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-primary">
            {t('pathCalc.inputs')}
          </h2>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="block min-w-0 text-xs text-muted-foreground">
              {t('pathCalc.startX')}
              <input
                type="number"
                min={-200}
                max={200}
                value={startX}
                onChange={(e) => setStartX(Number(e.target.value))}
                className={`${inputCls} mt-1`}
              />
            </label>
            <label className="block min-w-0 text-xs text-muted-foreground">
              {t('pathCalc.startY')}
              <input
                type="number"
                min={-200}
                max={200}
                value={startY}
                onChange={(e) => setStartY(Number(e.target.value))}
                className={`${inputCls} mt-1`}
              />
            </label>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="block min-w-0 text-xs text-muted-foreground">
              {t('pathCalc.targetX')}
              <input
                type="number"
                min={-200}
                max={200}
                value={targetX}
                onChange={(e) => setTargetX(Number(e.target.value))}
                className={`${inputCls} mt-1`}
              />
            </label>
            <label className="block min-w-0 text-xs text-muted-foreground">
              {t('pathCalc.targetY')}
              <input
                type="number"
                min={-200}
                max={200}
                value={targetY}
                onChange={(e) => setTargetY(Number(e.target.value))}
                className={`${inputCls} mt-1`}
              />
            </label>
          </div>

          <label className="mb-3 block text-xs text-muted-foreground">
            {t('pathCalc.unitSpeed')}
            <input
              type="number"
              min={1}
              value={unitSpeed}
              onChange={(e) => setUnitSpeed(Number(e.target.value))}
              className={`${inputCls} mt-1`}
            />
          </label>

          <label className="mb-3 block text-xs text-muted-foreground">
            {t('pathCalc.tsLevel')}
            <input
              type="number"
              min={0}
              max={20}
              value={tsLevel}
              onChange={(e) => setTsLevel(Number(e.target.value))}
              className={`${inputCls} mt-1`}
            />
          </label>

          <label className="mb-3 block text-xs text-muted-foreground">
            {t('pathCalc.heroBonus')}
            <input
              type="number"
              min={0}
              value={heroBonus}
              onChange={(e) => setHeroBonus(Number(e.target.value))}
              className={`${inputCls} mt-1`}
            />
          </label>

          <label className="mb-3 block text-xs text-muted-foreground">
            {t('pathCalc.artifact')}
            <select
              value={artifact}
              onChange={(e) =>
                setArtifact(e.target.value as 'none' | 'unique_2x' | 'village_2x')
              }
              className={`${inputCls} mt-1`}
            >
              <option value="none">{t('pathCalc.artifactNone')}</option>
              <option value="unique_2x">{t('pathCalc.artifactUnique2x')}</option>
              <option value="village_2x">{t('pathCalc.artifactVillage2x')}</option>
            </select>
          </label>

          <label className="block text-xs text-muted-foreground">
            {t('pathCalc.serverSpeed')}
            <input
              type="number"
              min={1}
              step={0.5}
              value={serverSpeed}
              onChange={(e) => setServerSpeed(Number(e.target.value))}
              className={`${inputCls} mt-1`}
            />
          </label>
        </div>

        <CalcResultPanel
          lang={guideLang}
          title={t('pathCalc.results')}
          primary={<>{result.formatted}</>}
          secondary={`${result.distance} ${t('pathCalc.fields')} · ${result.arrivalSpeed} ${t('pathCalc.fieldsPerHour')}`}
          detailsLabel={{ zh: '明細', en: 'details' }}
        >
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3 border-b pb-2">
              <dt className="text-muted-foreground">{t('pathCalc.distance')}</dt>
              <dd className="font-mono font-medium tabular-nums">
                {result.distance} {t('pathCalc.fields')}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b pb-2">
              <dt className="text-muted-foreground">{t('pathCalc.travelTime')}</dt>
              <dd className="font-mono font-medium tabular-nums">{result.formatted}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b pb-2">
              <dt className="text-muted-foreground">{t('pathCalc.seconds')}</dt>
              <dd className="font-mono font-medium tabular-nums">{result.travelSeconds}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t('pathCalc.effectiveSpeed')}</dt>
              <dd className="font-mono font-medium tabular-nums">
                {result.arrivalSpeed} {t('pathCalc.fieldsPerHour')}
              </dd>
            </div>
          </dl>
        </CalcResultPanel>
      </div>
    </div>
  )
}
