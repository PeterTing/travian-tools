import type { GameAccount, GameWorld, TroopTribe, Village } from '@/types/game'

/**
 * 一個帳號多個部族（P0-25）。
 *
 * 官方說明頁 S29（Keep Tribe on Conquest）：開了「征服保留部族」的特殊伺服器，
 * 征服來的村莊保留原本的部族；帳號永遠是註冊時選的部族（出生部族），
 * 英雄的部族能力也永遠跟著出生部族。一般伺服器整個帳號一個部族。
 * 出處：scripts/game_data/evidence/official_support_multitribe_2026-10-11.json
 */

/** 出生部族：註冊時選的部族（英雄能力跟著它）；舊的 API 沒有 birth_tribe 就用 tribe */
export function birthTribeOf(account: GameAccount | null | undefined): TroopTribe | null {
  return account?.birth_tribe ?? account?.tribe ?? null
}

/** 這個世界是不是「征服保留部族」的特殊伺服器（同一個帳號可以有不同部族的村莊） */
export function isMultiTribeWorld(world: GameWorld | null | undefined): boolean {
  return world?.keep_tribe_on_conquest === true
}

/**
 * 村莊的部族：兵種、建築、商人的計算用它。
 * 一般伺服器一律是出生部族（村莊上存的值不管）；征服保留部族的世界用村莊自己的，
 * 沒設定就跟出生部族一樣。
 */
export function villageTribeOf(
  village: Village | null | undefined,
  account: GameAccount | null | undefined,
  world: GameWorld | null | undefined,
): TroopTribe | null {
  const birth = birthTribeOf(account)
  if (!isMultiTribeWorld(world)) return birth
  return village?.tribe ?? birth
}

/** 部族選單的順序（跟「已帶入」列的部族選單一樣） */
export const TRIBE_OPTIONS: readonly TroopTribe[] = ['romans', 'teutons', 'gauls', 'huns', 'egyptians', 'spartans', 'vikings']
