/**
 * 兵種速度（唯一一份，前端）。P0-15 第一階段。
 *
 * unitSpeeds.gen.json 由 scripts/game_data/gen_game_data.py 產生，跟後端
 * backend/data/static/unit_speeds.json、troops.json 的速度欄位是同一次產生的，不要手改。
 *
 * 出處：
 * - ts11：在 ts11 遊戲內說明（兵種說明頁 manual/troop/N）讀到的數值
 * - asia_x1：斯巴達（ts11 沒有），在 ASIA x1 遊戲內說明讀到的數值（2026-10-11，
 *   scripts/game_data/evidence/asia_x1_manual_spartans_2026-10-11.json）
 * - official：support.travian.com 官方文章（ref 是網址）
 * - official_pending：官方說明頁，但頁面寫數字取自第三方計算器；
 *   數字保留、畫面標「待驗證」、不列入反推 TS（斯巴達改在 ASIA x1 核對後，目前沒有兵種用到）
 * - pending：還沒有第一手出處，速度是 null，畫面標「待驗證」
 * 遊戲內說明跟官方頁不一致時，以遊戲內為準（匈奴僱傭兵 6）。
 */
import gen from './unitSpeeds.gen.json'

export type UnitSpeedSource = 'ts11' | 'asia_x1' | 'official' | 'official_pending' | 'pending'

/** 有第一手出處（ts11／ASIA x1 遊戲內說明或官方文章）；其餘畫面標「待驗證」 */
export function isSpeedVerified(source: UnitSpeedSource): boolean {
  return source === 'ts11' || source === 'asia_x1' || source === 'official'
}
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
  /** 遊戲內說明頁讀到的其他數字（P0-18；斯巴達是 ASIA x1）；沒讀到的兵種是 null（維持舊資料、顯示待驗證） */
  stats: UnitTs11Stats | null
  /** 運載量（唯一一份，後端 troops.json 同一次產生；P0-23）；null＝還沒核對（維京），不能當 0 */
  carry: number | null
  /** ts11／asia_x1＝遊戲內說明；pending＝沒有官方或遊戲內數字，留空 */
  carrySource: UnitCarrySource
  carryRef: string | null
}

/** two_sources：維京（官方沒寫）Fandom、Siegewise 兩份互不引用、數字一致（2026-10-11 幕僚長規則） */
export type UnitCarrySource = 'ts11' | 'asia_x1' | 'two_sources' | 'pending'

export interface UnitTs11Stats {
  /** 遊戲內中文名稱 */
  nameZh: string
  /** 木、黏土、鐵、糧 */
  cost: [number, number, number, number]
  attack: number
  defInf: number
  defCav: number
  carry: number
  upkeep: number
  /** 訓練秒數（x1、1 級兵營／馬廄） */
  trainTime: number
  ref: string
}

interface GenStats {
  name_zh: string
  cost: [number, number, number, number]
  attack: number
  def_inf: number
  def_cav: number
  carry: number
  upkeep: number
  train_time: number
  ref: string
}

interface GenRow {
  slot: number
  troop_id: string
  fe_id: string
  kb_id: string
  speed: number | null
  source: string
  ref: string | null
  stats?: GenStats | null
  carry: number | null
  carry_source: string
  carry_ref: string | null
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
    stats: r.stats
      ? { nameZh: r.stats.name_zh, cost: r.stats.cost, attack: r.stats.attack, defInf: r.stats.def_inf, defCav: r.stats.def_cav, carry: r.stats.carry, upkeep: r.stats.upkeep, trainTime: r.stats.train_time, ref: r.stats.ref }
      : null,
    carry: r.carry,
    carrySource: r.carry_source as UnitCarrySource,
    carryRef: r.carry_ref,
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

/** 用後端 troops.json 的 id 查運載量出處；找不到回 undefined */
export function unitCarrySource(troopId: string): UnitCarrySource | undefined {
  for (const rows of Object.values(TRIBES)) {
    const r = rows.find((x) => x.troop_id === troopId)
    if (r) return r.carry_source as UnitCarrySource
  }
  return undefined
}

/** 還有沒有維京兵種的運載量留空（待驗證）；(k) 那一行的字照這個換 */
export function vikingCarryPending(): boolean {
  return (TRIBES.vikings ?? []).some((r) => r.carry_source === 'pending')
}

/** 運載量留空（維京，還沒核對）時回那一族，畫面標「待驗證」；有遊戲內數字或找不到回 null（P0-23） */
export function carryPendingTribe(troopId: string): 'vikings' | null {
  for (const rows of Object.values(TRIBES)) {
    const r = rows.find((x) => x.troop_id === troopId)
    if (!r || r.carry_source !== 'pending') continue
    return 'vikings'
  }
  return null
}
