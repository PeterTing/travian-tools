/**
 * 唯一一份遊戲數值（前端）。
 *
 * gameData.gen.json 由 scripts/game_data/gen_game_data.py 產生，跟後端
 * backend/data/static/{buildings,resources,culture_points}.json 是同一次產生的，
 * 不要手改；要改數值就改產生器的參數表再重跑。
 */
import gen from './gameData.gen.json'

export type ServerSpeed = 1 | 2 | 3 | 5 | 10
export const SERVER_SPEEDS: readonly ServerSpeed[] = [1, 2, 3, 5, 10]

export interface BuildingLevelRow {
  level: number
  wood: number
  clay: number
  iron: number
  crop: number
  /** 秒，村莊大樓 1 級、x1 */
  buildTimeBase: number
  /** 該等級每日 CP */
  cp: number
}

type Rows = Record<string, number[][]>
const ROWS = gen.buildings as Rows

export function buildingRows(buildingId: string): BuildingLevelRow[] {
  const rows = ROWS[buildingId] ?? []
  return rows.map((r, i) => ({
    level: i + 1,
    wood: r[0], clay: r[1], iron: r[2], crop: r[3],
    buildTimeBase: r[4], cp: r[5],
  }))
}

export function buildingRow(buildingId: string, level: number): BuildingLevelRow | undefined {
  return buildingRows(buildingId)[level - 1]
}

const NAMES: Readonly<Record<string, readonly string[]>> = gen.names

/** 建築顯示名稱（跟資料庫頁同一份）；找不到就回傳 id */
export function buildingName(buildingId: string, lang: 'zh' | 'en'): string {
  const n = NAMES[buildingId]
  if (!n) return buildingId
  return (lang === 'en' ? n[1] : n[0]) ?? buildingId
}

export const CP_BASE_BY_ID: Readonly<Record<string, number>> = gen.cpBase

/** 哪些建築的哪些欄位還沒在 ts11 實測（UI 顯示「待驗證」）。 */
export const PENDING: Readonly<Record<string, readonly string[]>> = gen.pending

export function isPending(buildingId: string, field: 'cost' | 'time'): boolean {
  return (PENDING[buildingId] ?? []).includes(field)
}

/** ts11 實測過（花費、時間都沒有待驗證）的建築；不認得的 id 一律當成未實測 */
export function isBuildingVerified(buildingId: string): boolean {
  return buildingId in gen.buildings && (PENDING[buildingId] ?? []).length === 0
}

/** 累積 CP 門檻；index 0 = 第 1 村。官方表（我們的公式逐格重算一致）。 */
export function villageRequirements(speed: ServerSpeed = 1): readonly number[] {
  return (gen.villageRequirements as Record<string, number[]>)[String(speed)] ?? []
}

export function startCp(speed: ServerSpeed = 1): number {
  return (gen.startCp as Record<string, number>)[String(speed)] ?? 0
}

export type CelebrationKind = 'small' | 'great'

export function celebrationCap(kind: CelebrationKind, speed: ServerSpeed = 1): number {
  return (gen.celebrationCap as Record<string, Record<CelebrationKind, number>>)[String(speed)]?.[kind] ?? 0
}

/** 一場慶典拿到的 CP：每日 CP 產量（小＝本村、大＝全帳號），不超過該速度上限。 */
export function celebrationCp(dailyCp: number, kind: CelebrationKind, speed: ServerSpeed = 1): number {
  return Math.max(0, Math.min(Math.floor(dailyCp), celebrationCap(kind, speed)))
}

export interface CelebrationData {
  cost: readonly [number, number, number, number]
  minTownHall: number
  /** 'cost'＝整筆待驗證；'cost_crop'＝只有糧食待驗證 */
  pending: readonly string[]
}

const CEL = gen.celebrations as Record<CelebrationKind, { cost: number[]; min_town_hall: number; pending: string[] }>

export function celebration(kind: CelebrationKind): CelebrationData {
  const c = CEL[kind]
  return {
    cost: [c.cost[0], c.cost[1], c.cost[2], c.cost[3]],
    minTownHall: c.min_town_hall,
    pending: c.pending,
  }
}

/** 開村 CP 門檻跟官方說明頁（S51）的表每一格都一樣（P0-19）：1–50 村、5 種速度都不標「待驗證」 */
export function isVillageCpVerified(village: number, speed: ServerSpeed = 1): boolean {
  return (gen.verified.speeds as number[]).includes(speed) && gen.verified.villages.includes(village)
}
