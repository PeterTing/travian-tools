/**
 * 「已帶入」列的兵種待驗證那一行要不要顯示（P0-17 (k)）。
 * 羅馬人、日耳曼人、高盧人、埃及人、匈奴的兵種數字已在 ts11 遊戲內說明頁核對，斯巴達在 ASIA x1 遊戲內說明頁核對
 * （2026-10-11）；維京照官方說明頁，運載量用 Fandom、Siegewise 兩份一致的數字，中文名還是暫譯（現在沒有可以選維京的世界）。
 * - 頁面有部族選單：看選單（兵種資料庫選「全部」也會列出維京，所以要顯示）
 * - 沒有：看帳號的部族；不知道部族（還沒有帳號、帳號沒填）也顯示，因為可能是維京
 */
export const UNVERIFIED_UNIT_TRIBES: readonly string[] = ['vikings']

export function showUnitPendingLine(tribe: string | null | undefined): boolean {
  if (!tribe) return true
  return tribe === 'all' || UNVERIFIED_UNIT_TRIBES.includes(tribe)
}

/**
 * 選的是維京（頁面選單或帳號部族）：兵種中文名是暫譯，「已帶入」列那一行後面加「兵種中文名為暫譯」
 * （斯巴達 2026-10-11 起是 ASIA x1 遊戲內名稱，不加）
 * （計算器只顯示中文暫譯、不加英文括號、不另加灰標；PM，P0-23 後續）。「全部」、不知道部族不加
 */
export function unitNameProvisional(tribe: string | null | undefined): boolean {
  return !!tribe && UNVERIFIED_UNIT_TRIBES.includes(tribe)
}

/**
 * (k) 那一行的字（設計師，#43）：斯巴達不顯示這一行（showUnitPendingLine）。
 * - 選維京：運載量還待驗證 →「維京的運載量待驗證，兵種中文名為暫譯」；運載量 ✓ →「兵種中文名為暫譯」
 * - 全部／不知道部族：運載量還待驗證 →「維京的兵種運載量待驗證」；運載量 ✓ →「維京的兵種中文名為暫譯」
 */
export function unitPendingLineKey(tribe: string | null | undefined, carryPending: boolean): string {
  if (unitNameProvisional(tribe)) return carryPending ? 'autofill.unitPendingVikings' : 'autofill.unitNamesVikings'
  return carryPending ? 'autofill.unitPending' : 'autofill.unitNamesAll'
}
