// 建築、資源田的等級範圍（等級下拉選單用）。最高等級讀 gameData（跟資料庫頁同一份）。
import { buildingRows } from '@/data/gameData'

export const FIELD_IDS = ['woodcutter', 'clay_pit', 'iron_mine', 'cropland'] as const

/** 一般村資源田最高 10 級，首都 20 級（resources.json 的 max_level／max_level_capital） */
export const FIELD_MAX_LEVEL = 10
export const FIELD_MAX_LEVEL_CAPITAL = 20

export function isFieldId(buildingId: string): boolean {
  return (FIELD_IDS as readonly string[]).includes(buildingId)
}

/** 建築最高等級：資源田看是不是首都；其他建築看資料有幾級，資料沒有的（例如供水系統）當 20 級 */
export function buildingMaxLevel(buildingId: string, opts: { capital?: boolean } = {}): number {
  if (isFieldId(buildingId)) return opts.capital ? FIELD_MAX_LEVEL_CAPITAL : FIELD_MAX_LEVEL
  const n = buildingRows(buildingId).length
  return n > 0 ? n : 20
}

/** min..max 的等級清單（含兩端） */
export function levelOptions(min: number, max: number): number[] {
  const out: number[] = []
  for (let l = Math.ceil(min); l <= Math.floor(max); l++) out.push(l)
  return out
}
