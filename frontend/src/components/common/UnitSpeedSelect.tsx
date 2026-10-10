import { useEffect, useMemo, useState } from 'react'
import { UNIT_SPEED_TRIBES, tribeUnitSpeeds, type SpeedTribeId } from '@/data/unitSpeeds'
import { ingameTribeName, ingameUnitName } from '@/lib/ingameNames'

interface UnitSpeedSelectProps {
  /** 選好兵種後回傳速度（格／小時，x1、沒有加成） */
  onChange: (speed: number) => void
  /** 一開始的部族（通常是「已帶入」的部族）；沒有就羅馬人 */
  defaultTribe?: string | null
  label?: string
  testId?: string
  className?: string
  selectClassName?: string
}

function isTribe(t: string | null | undefined): t is SpeedTribeId {
  return !!t && (UNIT_SPEED_TRIBES as string[]).includes(t)
}

/**
 * 兵種速度：選部族＋兵種，速度從兵種資料來（唯一一份，unitSpeeds.gen.json），不用自己打數字。
 * 速度待驗證（null）的兵種不能選。
 */
export default function UnitSpeedSelect({
  onChange,
  defaultTribe,
  label = '兵種',
  testId = 'unit',
  className = 'block text-sm font-medium',
  selectClassName = 'w-full min-w-0 rounded border bg-background p-2',
}: UnitSpeedSelectProps) {
  const [tribe, setTribe] = useState<SpeedTribeId>(isTribe(defaultTribe) ? defaultTribe : 'romans')
  useEffect(() => {
    if (isTribe(defaultTribe)) setTribe(defaultTribe)
  }, [defaultTribe])
  const units = useMemo(() => tribeUnitSpeeds(tribe), [tribe])
  const firstOk = units.find((u) => u.speed != null)?.feId ?? ''
  const [feId, setFeId] = useState(firstOk)
  // 換部族：選回那一族第一個有速度的兵種
  useEffect(() => {
    if (!units.some((u) => u.feId === feId && u.speed != null)) setFeId(firstOk)
  }, [units, feId, firstOk])
  const speed = units.find((u) => u.feId === feId)?.speed ?? null
  useEffect(() => {
    if (speed != null) onChange(speed)
    // onChange 是頁面的 setter，不放進依賴
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed])

  return (
    <div className={className} data-testid={`${testId}-select`}>
      <span className="mb-2 block">{label}</span>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
        <select
          aria-label={`${label}：部族`}
          data-testid={`${testId}-tribe`}
          value={tribe}
          onChange={(e) => setTribe(e.target.value as SpeedTribeId)}
          className={selectClassName}
        >
          {UNIT_SPEED_TRIBES.map((t) => (
            <option key={t} value={t}>{ingameTribeName(t)}</option>
          ))}
        </select>
        <select
          aria-label={`${label}：兵種`}
          data-testid={`${testId}-unit`}
          value={feId}
          onChange={(e) => setFeId(e.target.value)}
          className={selectClassName}
        >
          {units.map((u) => (
            <option key={u.feId} value={u.feId} disabled={u.speed == null}>
              {`${ingameUnitName(tribe, u.feId) ?? u.stats?.nameZh ?? u.feId}（${u.speed == null ? '速度待驗證' : `${u.speed} 格/時`}）`}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
