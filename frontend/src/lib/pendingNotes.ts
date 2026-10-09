/**
 * 「待驗證」灰標的說明文字：全站一張表（P0-17 設計師規格）。
 * 每一種（kind）兩行：
 *   what   — 哪個數字還沒核對
 *   source — 現在這個數字從哪裡來（照實寫出處，PM 規則：社群來源寫「社群整理的數字」）
 * 文字放在 i18n（zh-TW／en 的 pendingNotes.<kind>.what／source），這裡只管 kind 和用在哪裡。
 */
export const PENDING_KINDS = [
  'units',
  'spartanSpeed',
  'unitSpeedOfficialPending',
  'unitSpeedNoSource',
  'building',
  'cpThreshold',
  'celebration',
  'heroMansionCost',
  'cropSim',
] as const

export type PendingKind = (typeof PENDING_KINDS)[number]

/** 每一種出現在哪裡（給 PM 的文字表、也給完整性測試用） */
export const PENDING_KIND_USAGE: Record<PendingKind, string> = {
  units: '已帶入列（用到兵種資料的計算器）',
  spartanSpeed: '首頁來襲卡反推 TS 那一行、反推 TS 結果的「未列入反推」提示',
  unitSpeedOfficialPending: '兵種資料庫：斯巴達步兵／騎兵 6 種的速度（列表與詳情）',
  unitSpeedNoSource: '兵種資料庫：斯巴達攻城槌、弩砲、監察官、移民的速度（列表與詳情）',
  building: '建築資料庫列表與詳情、建築升級花費結果的建築名稱旁',
  cpThreshold: 'CP 與開村的開村門檻表與下方說明、首頁開村卡進度',
  celebration: 'CP 與開村的慶典花費表與下方說明',
  heroMansionCost: '綠洲收益的英雄宅累積成本',
  cropSim: '資源田與首都規劃（首都產量模擬）的 Plus／供水系統說明',
}

export function pendingNoteKeys(kind: PendingKind): { what: string; source: string } {
  return { what: `pendingNotes.${kind}.what`, source: `pendingNotes.${kind}.source` }
}
