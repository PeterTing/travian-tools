import { PREF_KEYS, readPref, writePref } from './localPrefs'

/**
 * 首頁「開村 · CP」卡的數字來源。還沒有 CP 頁解析器，先記住使用者上次在
 * 「CP 與開村」填的目前 CP 和全帳號每日 CP（每個遊戲帳號一份，只存在這台裝置）。
 */
export interface CpProgress {
  currentCp: number
  dailyCp: number
  speed: number
  savedAt: string
}

export function readCpProgress(accountId: string | null | undefined): CpProgress | null {
  if (!accountId) return null
  const raw = readPref(PREF_KEYS.cpProgress(accountId))
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as CpProgress
    if (typeof v.currentCp !== 'number' || typeof v.dailyCp !== 'number') return null
    return v
  } catch {
    return null
  }
}

export function writeCpProgress(accountId: string | null | undefined, v: Omit<CpProgress, 'savedAt'>): void {
  if (!accountId) return
  writePref(PREF_KEYS.cpProgress(accountId), JSON.stringify({ ...v, savedAt: new Date().toISOString() }))
}

/** 還要幾天（無條件進位）；每日 0 就是 null */
export function daysToReach(current: number, target: number, daily: number): number | null {
  if (current >= target) return 0
  if (daily <= 0) return null
  return Math.ceil((target - current) / daily)
}
