/** 小型偏好（記住上次選的分段、展開的選單組、上次選的村莊）；存不了就只在這次開啟期間記住 */
export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* 無痕模式等情況 */
  }
}

export const PREF_KEYS = {
  calcSegment: 'tt:calcSegment',
  sidebarGroup: 'tt:sidebarGroup',
  lastVillage: (accountId: string) => `tt:lastVillage:${accountId}`,
  cpProgress: (accountId: string) => `tt:cpProgress:${accountId}`,
} as const
