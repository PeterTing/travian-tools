/**
 * 「待驗證」灰標的說明文字：全站一張表（P0-17 設計師規格）。
 * 每一種（kind）兩行：
 *   what   — 哪個數字還沒核對
 *   source — 現在這個數字從哪裡來（照實寫出處，PM 規則：社群來源寫「社群整理的數字」；
 *            不知道出處就寫「來源還在查」）
 * 使用者看得到的文字不寫內部用語（例如「T4」），「糧」一律用繁體。
 * 文字放在 i18n（zh-TW／en 的 pendingNotes.<kind>.what／source），這裡只管 kind 和用在哪裡。
 */
export const PENDING_KINDS = [
  'units',
  'autofillUnits',
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
  units: '兵種資料庫詳情：「訓練成本」標題旁（花費、糧耗、訓練時間還沒核對的部族；data/unitCostVerified.json）；開局衝村模擬的結果摘要（標題、拓荒者花費）',
  autofillUnits: '已帶入列（用到兵種資料的計算器）：一個灰標管兩行（兵種花費、斯巴達速度）',
  spartanSpeed: '首頁來襲卡反推 TS 那一行、反推 TS 結果的「未列入反推」提示',
  unitSpeedOfficialPending: '兵種資料庫：斯巴達步兵／騎兵 6 種的速度（列表與詳情）',
  unitSpeedNoSource: '兵種資料庫：斯巴達攻城槌、弩砲、監察官、移民的速度（列表與詳情）',
  building: '建築資料庫列表與詳情、建築升級花費結果的建築名稱旁；CP 與開村「每日被動 CP」摘要標題；資源田建造順序摘要的成本（有加成建築時）',
  cpThreshold: 'CP 與開村的開村門檻表與下方說明、首頁開村卡進度',
  celebration: 'CP 與開村的慶典花費表與下方說明',
  heroMansionCost: '綠洲收益的英雄宅累積成本（明細、比較表）與結果摘要（標題、英雄宅成本）',
  cropSim: '資源田與首都規劃（首都產量模擬）的 Plus／供水系統說明，以及有用到時的「總計 /hr」摘要標題',
}

export function pendingNoteKeys(kind: PendingKind): { what: string; source: string } {
  return { what: `pendingNotes.${kind}.what`, source: `pendingNotes.${kind}.source` }
}

/**
 * 把一句說明切成「子句」：每段是 inline-block，所以換行只會發生在逗號、分號、句號或括號，
 * 不會斷在詞中間（例如「官方說明頁」「第三方計算器」）。一段本身比一行還長時，段內才照常換行。
 * 切點：「，」「；」「。」「、」「, 」「; 」之後，「（」「 (」之前，「）」「)」之後（後面緊跟標點就一起帶走）。
 */
export function splitClauses(text: string): string[] {
  const parts: string[] = []
  let cur = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if ((ch === '（' || (ch === '(' && cur.endsWith(' '))) && cur.trim()) {
      parts.push(cur)
      cur = ''
    }
    cur += ch
    const next = text[i + 1] ?? ''
    const breakAfter = /[，；。、]/.test(ch) || ((ch === ',' || ch === ';') && next === ' ') || ch === '）' || ch === ')'
    if (breakAfter && !/[，；。、,;.]/.test(next)) {
      if (next === ' ') { cur += ' '; i++ }
      parts.push(cur)
      cur = ''
    }
  }
  if (cur) parts.push(cur)
  return parts
}
