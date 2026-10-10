import { useAccountData } from '@/contexts/AccountDataContext'
import { mapRadiusFromSize } from '@/lib/coords'

/**
 * 目前世界的座標半徑（座標框的範圍）。
 * 世界資料還沒有地圖大小（GameWorld.map_size，後端尚未提供）→ 一律退回 ±200；
 * 之後後端補上 map_size，這裡就會自動改用該世界的大小，不用改各頁。
 */
export function useMapRadius(): number {
  const { world } = useAccountData()
  return mapRadiusFromSize(world?.map_size)
}
