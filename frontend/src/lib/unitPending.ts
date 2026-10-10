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
