import { useEffect, useMemo, useState } from 'react'
import RangeNumberField from '@/components/common/RangeNumberField'
import { useTranslation } from 'react-i18next'
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import {
  calculateTravelSeconds,
  distanceOnMap,
  formatTravelTime,
} from '@/lib/travianFormulas'
import CalcResultPanel, { RESULT_PANEL_SPACE_CLASS, SummaryPending } from '@/features/guideCalcs/components/CalcResultPanel'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { speedPendingKinds } from '@/lib/pendingNotes'
import { CalcBar } from '@/components/autofill/CalcFrame'
import Stepper from '@/components/common/Stepper'

/**
 * 行軍時間（路徑）計算器 — 前端即時結果（共用行軍公式 calculateTravelSeconds，跟後端同一套案例，P0-21）。
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

  // 「已帶入」：伺服器速度跟帳號（或這頁的「更改」），出發座標用帶入的村莊
  const fill = useAutoFill()
  useEffect(() => {
    setServerSpeed(fill.speed)
  }, [fill.speed])
  const fillX = fill.village?.coordinate_x
  const fillY = fill.village?.coordinate_y
  useEffect(() => {
    if (fillX != null && fillY != null) {
      setStartX(fillX)
      setStartY(fillY)
    }
  }, [fillX, fillY])

  const result = useMemo(() => {
    const distance = distanceOnMap(startX, startY, targetX, targetY)
    const artifactMultiplier = artifact === 'none' ? 1 : 2
    const travelSeconds = calculateTravelSeconds({
      distance,
      unitSpeed,
      serverSpeed,
      tournamentSquareLevel: tsLevel,
      // 超出 0–75 時欄位下方會寫「請輸入 0–75」；結果先用夾在範圍內的值算
      heroBonusPercent: Number.isFinite(heroBonus) ? Math.max(0, Math.min(75, heroBonus)) : 0,
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

  // 待驗證：競技場 > 0 級或英雄靴子 > 0% 時，移動時間和速度用了官方說明頁 S71 的公式（還沒在 ts11 遊戲內核對）；
  // 一行一個灰標，依用到的加成選一種說明（只有競技場／只有靴子／兩個都有）；兩個都 0 不標（全站共用 speedPendingKinds，P0-21）
  const arenaKinds = speedPendingKinds(tsLevel, Number.isFinite(heroBonus) ? Math.max(0, Math.min(75, heroBonus)) : 0)
  const arenaChip = arenaKinds.length ? <> <PendingVerifyChip kinds={arenaKinds} /></> : null

  const inputCls =
    'w-full min-w-0 max-w-full rounded border border-input bg-background p-2 text-sm'

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 overflow-x-clip px-3 py-4 sm:px-4">
      <div className="mb-4 rounded-xl border bg-card p-4">
        <h1 className="mb-2 text-xl font-semibold">{t('pathCalc.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('pathCalc.intro')}</p>
      </div>
      <CalcBar />

      <div className={`flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 ${RESULT_PANEL_SPACE_CLASS}`}>
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

          <div className="mb-3">
            <Stepper label={t('pathCalc.tsLevel')} value={tsLevel} onChange={setTsLevel} min={0} max={20} testId="path-ts-level" />
          </div>

          <RangeNumberField
            className="mb-3 text-xs text-muted-foreground"
            labelClassName="block mb-1"
            label={t('pathCalc.heroBonus')}
            min={0}
            max={75}
            testId="path-boots"
            value={heroBonus}
            onChange={setHeroBonus}
          />

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
          secondary={
            <SummaryPending kinds={arenaKinds} testId="path-summary">
              {`${result.distance} ${t('pathCalc.fields')} · ${result.arrivalSpeed} ${t('pathCalc.fieldsPerHour')}`}
            </SummaryPending>
          }
          detailsLabel={{ zh: '明細', en: 'details' }}
        >
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3 border-b pb-2">
              <dt className="text-muted-foreground">{t('pathCalc.distance')}</dt>
              <dd className="font-mono font-medium tabular-nums">
                {result.distance} {t('pathCalc.fields')}
              </dd>
            </div>
            {/* 有灰標的列：至少 44px、垂直置中，相鄰兩列的點擊範圍不重疊 */}
            <PendingRow className={`flex justify-between gap-3 border-b pb-2 ${arenaChip ? 'min-h-11 items-center' : ''}`}>
              <dt className="text-muted-foreground">{t('pathCalc.travelTime')}{arenaChip}</dt>
              <dd className="font-mono font-medium tabular-nums">{result.formatted}</dd>
            </PendingRow>
            <PendingRow className={`flex justify-between gap-3 border-b pb-2 ${arenaChip ? 'min-h-11 items-center' : ''}`}>
              <dt className="text-muted-foreground">{t('pathCalc.seconds')}{arenaChip}</dt>
              <dd className="font-mono font-medium tabular-nums">{result.travelSeconds}</dd>
            </PendingRow>
            <PendingRow className={`flex justify-between gap-3 ${arenaChip ? 'min-h-11 items-center' : ''}`}>
              <dt className="text-muted-foreground">{t('pathCalc.effectiveSpeed')}{arenaChip}</dt>
              <dd className="font-mono font-medium tabular-nums">
                {result.arrivalSpeed} {t('pathCalc.fieldsPerHour')}
              </dd>
            </PendingRow>
          </dl>
        </CalcResultPanel>
      </div>
    </div>
  )
}
