/**
 * 運載量加總（P0-23 PM／設計師）：斯巴達、維京的運載量還沒核對，是 null（留空）。
 * 任何一個選到的兵種運載量是 null，總運載量和收益都「無法計算」——不算部分加總、不當 0。
 */
import type { PendingKind } from '@/lib/pendingNotes'

export interface CarryPick {
  tribe: string
  /** 遊戲內中文名 */
  nameZh: string
  /** null＝還沒核對（斯巴達、維京） */
  carry: number | null
  count: number
}

export type CarryTotal =
  | { ok: true; total: number }
  | { ok: false; missing: { tribe: string; nameZh: string }[] }

export function totalCarry(picks: readonly CarryPick[]): CarryTotal {
  const missing = picks.filter((p) => p.carry === null).map((p) => ({ tribe: p.tribe, nameZh: p.nameZh }))
  if (missing.length > 0) return { ok: false, missing }
  return { ok: true, total: picks.reduce((sum, p) => sum + (p.carry as number) * p.count, 0) }
}

/** 原因那一行用的部族短名（只有斯巴達、維京會是 null） */
const TRIBE_SHORT: Record<string, string> = { spartans: '斯巴達', vikings: '維京' }
const tribeShort = (tribe: string) => TRIBE_SHORT[tribe] ?? tribe

/** 單一兵種的頁面：「斯巴達運載量還沒核對」 */
export function missingCarryTribeReason(tribe: string): string {
  return `${tribeShort(tribe)}運載量還沒核對`
}

/** 多兵種的頁面：「維京：奴僕運載量還沒核對」，好幾個用「、」接 */
export function missingCarryReason(missing: readonly { tribe: string; nameZh: string }[]): string {
  return missing.map((m) => `${tribeShort(m.tribe)}：${m.nameZh}運載量還沒核對`).join('、')
}

/** 原因那一行旁邊的灰標種類（依出現順序、不重複） */
export function missingCarryKinds(missing: readonly { tribe: string }[]): PendingKind[] {
  const kinds: PendingKind[] = []
  for (const m of missing) {
    const isSpartan = m.tribe === 'spartans'
    const k: PendingKind = isSpartan ? 'spartanCarry' : 'vikingCarry'
    if (!kinds.includes(k)) kinds.push(k)
  }
  return kinds
}
