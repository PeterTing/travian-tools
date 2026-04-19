import { useEffect, useState } from 'react'

/**
 * 動態資源追蹤 Hook.
 *
 * 以最後同步的 snapshot 為基準，加上從那時起到現在的秒數 × 每小時產量，
 * 預估目前資源量。同時提供相對時間（elapsedSeconds）給 UI 顯示「X 秒前更新」。
 *
 * 每秒重新計算一次，直到村莊變動或元件卸載。
 */

export interface ResourceBundle {
  wood: number
  clay: number
  iron: number
  crop: number
}

export interface DynamicResourceVillageInput {
  resources: ResourceBundle
  production: ResourceBundle
  warehouse_capacity: number
  granary_capacity: number
  last_updated: string | null
}

export interface DynamicResourceState {
  wood: number
  clay: number
  iron: number
  crop: number
  elapsedSeconds: number
}

export function useDynamicResources(
  village: DynamicResourceVillageInput | null | undefined,
): DynamicResourceState | null {
  const [state, setState] = useState<DynamicResourceState | null>(() =>
    computeState(village),
  )

  useEffect(() => {
    setState(computeState(village))
    if (!village?.last_updated) return
    const id = window.setInterval(() => {
      setState(computeState(village))
    }, 1000)
    return () => window.clearInterval(id)
  }, [village])

  return state
}

function computeState(
  village: DynamicResourceVillageInput | null | undefined,
): DynamicResourceState | null {
  if (!village) return null
  const elapsedSeconds = computeElapsed(village.last_updated)
  return {
    wood: project(
      village.resources.wood,
      village.production.wood,
      elapsedSeconds,
      village.warehouse_capacity,
    ),
    clay: project(
      village.resources.clay,
      village.production.clay,
      elapsedSeconds,
      village.warehouse_capacity,
    ),
    iron: project(
      village.resources.iron,
      village.production.iron,
      elapsedSeconds,
      village.warehouse_capacity,
    ),
    crop: project(
      village.resources.crop,
      village.production.crop,
      elapsedSeconds,
      village.granary_capacity,
    ),
    elapsedSeconds,
  }
}

function project(
  base: number,
  perHour: number,
  seconds: number,
  capacity: number,
): number {
  const gained = (perHour * seconds) / 3600
  const projected = Math.floor(base + gained)
  if (capacity > 0 && projected > capacity) return capacity
  return Math.max(0, projected)
}

function computeElapsed(iso: string | null): number {
  if (!iso) return 0
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 0
  const now = Date.now()
  return Math.max(0, Math.floor((now - then) / 1000))
}

/** 秒數格式化為「剛剛」/「X 秒前」/「X 分鐘前」/「X 小時前」/「X 天前」. */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 5) return '剛剛'
  if (seconds < 60) return `${seconds} 秒前`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分鐘前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}
