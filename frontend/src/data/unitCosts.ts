/**
 * 兵種花費、糧耗、訓練時間的核對狀態（每個部族一個 costVerified）。
 *
 * 資料在 unitCostVerified.json：目前 7 族都是社群整理的數字，全部 false。
 * 維京只核對了速度（P0-15），花費沒有核對，所以也是 false。
 * P0-18 用 ts11 遊戲內說明頁核對完一個部族，只要把那個部族改成 true（改資料、不改程式），
 * 兵種詳情「訓練成本」旁的「待驗證」灰標就會拿掉。
 */
import data from './unitCostVerified.json'
import type { TroopTribe } from '@/types/game'

export type CostVerifiedTable = Partial<Record<TroopTribe | string, boolean>>

export const UNIT_COST_VERIFIED: CostVerifiedTable = data.tribes

/** 這個部族的兵種花費／糧耗／訓練時間已在 ts11 核對；沒列到的部族當作沒核對 */
export function isTribeCostVerified(tribe: string, table: CostVerifiedTable = UNIT_COST_VERIFIED): boolean {
  return table[tribe] === true
}
