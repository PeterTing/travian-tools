/**
 * 網站「目前選的帳號＋世界」存在 localStorage，每個網站使用者各一個 key。
 * 頂部切換（CurrentAccountContext）寫；交給擴充的「存到」預設值也從這裡讀。
 * 擴充那邊改選只影響那一次上傳，永遠不會寫回這裡。
 */

export function currentAccountStorageKey(userId: string): string {
  return `travian.currentAccount.${userId}`
}

export function readSelectedAccountId(userId: string): string | null {
  try {
    return localStorage.getItem(currentAccountStorageKey(userId))
  } catch {
    return null
  }
}

export function writeSelectedAccountId(userId: string, accountId: string): void {
  try {
    localStorage.setItem(currentAccountStorageKey(userId), accountId)
  } catch {
    // 無痕模式等情況存不了，就只在這次開啟期間記住
  }
}

/** 和頂部切換同一套規則：記住的帳號還在就用它，不然用清單第一個 */
export function resolveSelectedAccountId(
  userId: string,
  accountIds: readonly string[]
): string | null {
  const stored = readSelectedAccountId(userId)
  if (stored && accountIds.includes(stored)) return stored
  return accountIds[0] ?? null
}
