/**
 * 「已帶入」列的兵種待驗證那一行要不要顯示（P0-17 (k)）。
 * 羅馬人、日耳曼人、高盧人、埃及人、匈奴的兵種數字已在 ts11 遊戲內說明頁核對；
 * ts11 沒有斯巴達、維京，這兩族還是待驗證。
 * - 頁面有部族選單：看選單（兵種資料庫選「全部」也會列出斯巴達、維京，所以要顯示）
 * - 沒有：看帳號的部族；不知道部族（還沒有帳號、帳號沒填）也顯示，因為可能是斯巴達、維京
 */
export const UNVERIFIED_UNIT_TRIBES: readonly string[] = ['spartans', 'vikings']

export function showUnitPendingLine(tribe: string | null | undefined): boolean {
  if (!tribe) return true
  return tribe === 'all' || UNVERIFIED_UNIT_TRIBES.includes(tribe)
}

/**
 * 選的是斯巴達、維京（頁面選單或帳號部族）：兵種中文名是暫譯，「已帶入」列那一行後面加「兵種中文名為暫譯」
 * （計算器只顯示中文暫譯、不加英文括號、不另加灰標；PM，P0-23 後續）。「全部」、不知道部族不加
 */
export function unitNameProvisional(tribe: string | null | undefined): boolean {
  return !!tribe && UNVERIFIED_UNIT_TRIBES.includes(tribe)
}
