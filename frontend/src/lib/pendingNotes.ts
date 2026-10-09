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
  'merchantCapacity',
  'unitCarry',
  'plusFormula',
  'fieldHighLevel',
  'launchSim',
] as const

export type PendingKind = (typeof PENDING_KINDS)[number]

/** 每一種出現在哪裡（給 PM 的文字表、也給完整性測試用） */
export const PENDING_KIND_USAGE: Record<PendingKind, string> = {
  units: '兵種資料庫詳情：「訓練成本」標題旁（花費、糧耗、訓練時間還沒核對的部族；data/unitCostVerified.json）；開局衝村模擬的「拓荒者」花費（摘要、明細）；農場收益的兵力初始成本、回本天數',
  autofillUnits: '已帶入列（用到兵種資料的計算器）：一個灰標管兩行（兵種花費、斯巴達速度）',
  spartanSpeed: '首頁來襲卡反推 TS 那一行、反推 TS 結果的「未列入反推」提示',
  unitSpeedOfficialPending: '兵種資料庫：斯巴達步兵／騎兵 6 種的速度（列表與詳情）',
  unitSpeedNoSource: '兵種資料庫：斯巴達攻城槌、弩砲、監察官、移民的速度（列表與詳情）',
  building: '建築資料庫列表與詳情、建築升級花費結果的建築名稱旁；CP 與開村「每日被動 CP」摘要標題；建造順序摘要的成本（有加成建築時）；田地回本有加成建築時的摘要與產量',
  cpThreshold: 'CP 與開村的開村門檻表與下方說明、首頁開村卡進度',
  celebration: 'CP 與開村的慶典花費表與下方說明',
  heroMansionCost: '綠洲收益的英雄宅累積成本（明細、比較表）與結果摘要第二行「英雄宅成本」',
  cropSim: '資源田與首都規劃（首都產量模擬）的 Plus／供水系統說明，以及有用到時的「總計 /hr」摘要標題；綠洲收益有勾 Plus 時的結果摘要與產量',
  merchantCapacity: '貿易路線：結果摘要「所需商人」標題、第二行（容量、往返）、每商人容量、速度、單程／往返、所需商人表、總商人、部族選單（選項裡有容量和速度）',
  unitCarry: '農場收益：結果摘要「每日收益」標題、搬運上限、每日預估收益、單位選單（選項裡有攜帶量）',
  plusFormula: '田地回本（資源田 ROI）有勾 Plus 時：結果摘要第二行、產量增加、四種資源比較表（這頁 Plus 用加總，產量模擬和綠洲用相乘）',
  fieldHighLevel: '用到資源田 4 級以上花費或時間、3 級以上產量的地方：田地回本的結果摘要、升級成本、產量增加、比較表；建造順序的結果摘要（總時間、成本）與清單；綠洲收益的結果摘要、產量兩列、比較表；首都產量模擬的「總計 /hr」標題、明細表表頭與三列合計',
  launchSim: '開局衝村模擬：結果摘要第二行（第幾天）、總時數、伺服器天、里程碑表（開局花費是試算表每一步的加總）',
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
