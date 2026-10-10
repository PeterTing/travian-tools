// 建築、部族、兵種的中文名：一律讀遊戲內名稱表（ts11 遊戲內說明頁，scripts/game_data/gen_game_data.py 產生）。
// 以前用過的名字只在 aliases，給搜尋用，畫面不顯示。
import table from '../data/ingameNames.gen.json'

interface NameRow { zh: string; ref: string | null; aliases: string[] }
interface BuildingRow extends NameRow { gid: number }
interface UnitRow extends NameRow {
  tribe: string
  fe_id: string
  game_id: number | null
  /** 中文是暫譯（維京；官方說明頁沒有中文版。斯巴達 2026-10-11 起是 ASIA x1 遊戲內名稱） */
  zh_pending: boolean
  /** 官方說明頁的英文名（S139／S187／S10）；ts11 的兵種、官方沒寫的是 null */
  en: string | null
  en_ref: string | null
  /** 畫面上的中文顯示名：暫譯的是「中文（官方英文名）」 */
  display_zh: string
}

export const INGAME_TRIBES = table.tribes as Record<string, NameRow>
export const INGAME_BUILDINGS = table.buildings as Record<string, BuildingRow>
export const INGAME_UNITS = table.units as Record<string, UnitRow>

const byGid = new Map<number, string>()
for (const [id, b] of Object.entries(INGAME_BUILDINGS)) byGid.set(b.gid, id)

const unitByGameId = new Map<number, UnitRow>()
for (const u of Object.values(INGAME_UNITS)) if (u.game_id != null) unitByGameId.set(u.game_id, u)

/** buildings.json 的 building_id（例如 'blacksmith'）→ 遊戲內中文名 */
export function ingameBuildingName(buildingId: string): string | undefined {
  return INGAME_BUILDINGS[buildingId]?.zh
}

/** 遊戲裡的建築編號（gid，例如 13）→ 遊戲內中文名 */
export function ingameBuildingNameByGid(gid: number): string | undefined {
  const id = byGid.get(gid)
  return id ? INGAME_BUILDINGS[id]?.zh : undefined
}

/** 部族 id（'teutons'）→ 遊戲內中文名（日耳曼人） */
export function ingameTribeName(tribe: string): string {
  return INGAME_TRIBES[tribe]?.zh ?? tribe
}

/** 遊戲裡的兵種編號（說明頁 manual/troop/N 的 N，例如 64）→ 遊戲內中文名 */
export function ingameUnitNameByGameId(gameId: number): string | undefined {
  return unitByGameId.get(gameId)?.zh
}

/** 某族某兵種（前端 id，例如 'huns' + 'steppeRider'）→ 遊戲內中文名 */
export function ingameUnitName(tribe: string, feId: string): string | undefined {
  for (const u of Object.values(INGAME_UNITS)) if (u.tribe === tribe && u.fe_id === feId) return u.zh
  return undefined
}

/** 某族某兵種的官方英文名（斯巴達、維京：官方說明頁 S139／S187／S10）；ts11 的兵種、官方沒寫的是 undefined */
export function ingameUnitEn(tribe: string, feId: string): string | undefined {
  for (const u of Object.values(INGAME_UNITS)) if (u.tribe === tribe && u.fe_id === feId) return u.en ?? undefined
  return undefined
}

/** 搜尋用：遊戲內名稱 + 舊名都算 */
export function matchesIngameName(row: { zh: string; aliases: string[] }, q: string): boolean {
  return [row.zh, ...row.aliases].some(n => n.includes(q))
}

/**
 * 兵種在畫面上的中文顯示名（P0-23 後續）：ts11／ASIA x1（斯巴達）有的就是遊戲內名稱；維京是「中文暫譯（官方英文名）」，
 * zhPending＝中文是暫譯，名稱旁要標待驗證（unitNameZhPending）
 */
export function ingameUnitDisplay(troopId: string): { text: string; zhPending: boolean } | undefined {
  const u = INGAME_UNITS[troopId]
  return u ? { text: u.display_zh, zhPending: u.zh_pending } : undefined
}
