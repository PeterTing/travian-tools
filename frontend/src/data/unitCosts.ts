/**
 * 兵種花費、糧耗、訓練時間的核對狀態（每個部族一個 costVerified）。
 *
 * 資料在 unitCostVerified.json（產生檔）：5 族在 ts11 遊戲內說明頁核對、斯巴達在 ASIA x1 遊戲內說明頁核對
 * （2026-10-11）、維京照官方說明頁 S139，目前 7 族都是 true。
 * 某個部族改成 false（改資料、不改程式），兵種詳情「訓練成本」旁就會出現「待驗證」灰標。
 */
import data from './unitCostVerified.json'
import type { TroopTribe } from '@/types/game'

export type CostVerifiedTable = Partial<Record<TroopTribe | string, boolean>>

export const UNIT_COST_VERIFIED: CostVerifiedTable = data.tribes

/** 這個部族的兵種花費／糧耗／訓練時間已在 ts11 核對；沒列到的部族當作沒核對 */
export function isTribeCostVerified(tribe: string, table: CostVerifiedTable = UNIT_COST_VERIFIED): boolean {
  return table[tribe] === true
}
