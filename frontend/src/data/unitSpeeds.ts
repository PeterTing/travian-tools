/**
 * 兵種速度（唯一一份，前端）。P0-15 第一階段。
 *
 * unitSpeeds.gen.json 由 scripts/game_data/gen_game_data.py 產生，跟後端
 * backend/data/static/unit_speeds.json、troops.json 的速度欄位是同一次產生的，不要手改。
 *
 * 出處：
 * - ts11：在 ts11 遊戲內說明（兵種說明頁 manual/troop/N）讀到的數值
 * - official：support.travian.com 官方文章（ref 是網址）
 * - pending：還沒有第一手出處，速度是 null，畫面標「待驗證」
 */
import gen from './unitSpeeds.gen.json'

export type UnitSpeedSource = 'ts11' | 'official' | 'pending'
export type SpeedTribeId = 'romans' | 'teutons' | 'gauls' | 'egyptians' | 'huns' | 'spartans' | 'vikings'

export interface UnitSpeedRow {
  /** 遊戲裡的順序 t1..t10 */
  slot: number
  /** 後端 troops.json 的 id */
  troopId: string
  /** 前端 guideCalcs 部族資料的 id */
  feId: string
  /** 格／小時，x1、沒有競技場／神器／英雄加成；null＝待驗證 */
  speed: number | null
  source: UnitSpeedSource
  /** manual/troop/N 或官方網址；pending 是 null */
  ref: string | null
}

interface GenRow {
  slot: number
  troop_id: string
  fe_id: string
  kb_id: string
  speed: number | null
  source: string
  ref: string | null
}

const TRIBES = gen.tribes as Record<SpeedTribeId, GenRow[]>

function toRow(r: GenRow): UnitSpeedRow {
  return {
    slot: r.slot,
    troopId: r.troop_id,
    feId: r.fe_id,
    speed: r.speed,
    source: r.source as UnitSpeedSource,
    ref: r.ref,
  }
}

export const UNIT_SPEED_TRIBES = Object.keys(TRIBES) as SpeedTribeId[]

/** 某族 10 個兵種的速度（遊戲順序） */
export function tribeUnitSpeeds(tribe: SpeedTribeId): UnitSpeedRow[] {
  return (TRIBES[tribe] ?? []).map(toRow)
}

/** 用前端兵種 id 查速度；找不到回 undefined */
export function unitSpeed(tribe: SpeedTribeId, feId: string): UnitSpeedRow | undefined {
  const r = (TRIBES[tribe] ?? []).find((x) => x.fe_id === feId)
  return r ? toRow(r) : undefined
}

/** 用前端兵種 id 查速度數字；找不到或待驗證都回 null */
export function unitSpeedValue(tribe: SpeedTribeId, feId: string): number | null {
  return unitSpeed(tribe, feId)?.speed ?? null
}

export const UNIT_SPEED_SOURCE_NOTES = gen.sources
