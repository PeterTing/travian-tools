// 建築、部族、兵種的中文名：一律讀遊戲內名稱表（ts11 遊戲內說明頁，scripts/game_data/gen_game_data.py 產生）。
// 以前用過的名字只在 aliases，給搜尋用，畫面不顯示。
import table from '../data/ingameNames.gen.json'

interface NameRow { zh: string; ref: string | null; aliases: string[] }
interface BuildingRow extends NameRow { gid: number }
interface UnitRow extends NameRow { tribe: string; fe_id: string; game_id: number | null }

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

/** 搜尋用：遊戲內名稱 + 舊名都算 */
export function matchesIngameName(row: { zh: string; aliases: string[] }, q: string): boolean {
  return [row.zh, ...row.aliases].some(n => n.includes(q))
}
