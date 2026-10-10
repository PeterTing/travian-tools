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
  'merchantTradeOffice',
  'arenaSpeed',
  'heroBootsSpeed',
  'arenaBootsSpeed',
  'smithyFormula',
] as const

export type PendingKind = (typeof PENDING_KINDS)[number]

/** 每一種出現在哪裡（給 PM 的文字表、也給完整性測試用） */
export const PENDING_KIND_USAGE: Record<PendingKind, string> = {
  units: '兵種資料庫詳情：「訓練成本」標題旁（花費、糧耗、訓練時間還沒核對的部族；data/unitCostVerified.json）；開局衝村模擬的「拓荒者」花費（摘要、明細）；農場收益的兵力初始成本、回本天數',
  autofillUnits: '已帶入列（用到兵種資料的計算器）：一個灰標管兩行（兵種花費、斯巴達速度）',
  spartanSpeed: '首頁來襲卡反推 TS 那一行、反推 TS 結果的「未列入反推」提示',
  unitSpeedOfficialPending: '兵種資料庫：斯巴達步兵／騎兵 6 種的速度（列表與詳情）',
  unitSpeedNoSource: '兵種資料庫：斯巴達攻城槌、弩砲、監察官、移民的速度（列表與詳情）',
  building: '建築資料庫列表與詳情、建築升級花費結果的建築名稱旁；CP 與開村「每日被動 CP」摘要標題；建造順序摘要的成本（有加成建築時）；田地回本有加成建築時的摘要與產量；首都產量模擬有加成建築時的「總計 /hr」摘要標題、「產量分解」標題、合計列（只標用到的那幾種資源）',
  cpThreshold: 'CP 與開村的開村門檻表與下方說明、首頁開村卡進度',
  celebration: 'CP 與開村的慶典花費表與下方說明',
  heroMansionCost: '綠洲收益的英雄宅累積成本（明細、比較表）與結果摘要第二行「英雄宅成本」',
  cropSim: '資源田與首都規劃（首都產量模擬）的 Plus／供水系統說明，以及有用到時的「總計 /hr」摘要標題、「產量分解」標題、合計列；綠洲收益有勾 Plus 時的結果摘要與產量',
  merchantCapacity: '貿易路線：速度、單程／往返、部族選單（選項裡有容量和速度）；交易所 0 級時也標結果摘要第二行（容量、往返；標題「所需商人」同一份資料不重複放）、每商人容量、所需商人表、總商人',
  unitCarry: '農場收益：結果摘要「每日收益」標題（第一個，後面接行軍速度）、搬運上限、每日預估收益、單位選單（選項裡有攜帶量）',
  plusFormula: '田地回本（資源田 ROI）有勾 Plus 時：結果摘要第二行、產量增加、四種資源比較表；建造順序有勾 Plus 時（排序用到）：結果摘要第二行、「接下來 20 步」清單標題（這兩頁 Plus 用加總，產量模擬和綠洲用相乘）',
  fieldHighLevel: '用到資源田 4 級以上花費或時間、3 級以上產量的地方：田地回本的結果摘要、升級成本、產量增加、比較表；建造順序的結果摘要（總時間、成本）與清單；綠洲收益的結果摘要、產量兩列、比較表；首都產量模擬的「總計 /hr」標題、「產量分解」標題與三列合計；資源資料庫等級表與回本表 3 級以上每列的等級欄',
  launchSim: '開局衝村模擬：結果摘要第二行（第幾天）、總時數、伺服器天、里程碑表（開局花費是試算表每一步的加總）',
  merchantTradeOffice: '貿易路線交易所 > 0 級時：結果摘要第二行（容量、往返）、每商人容量（含交易所）、所需商人表的「次數」、總商人（取代這幾處的 merchantCapacity；速度、單程／往返、部族選單不受交易所影響，維持 merchantCapacity）',
  arenaSpeed: '只有競技場（> 0 級、英雄靴子 0）時（兩個都 0 不標；speedPendingKinds 選）：行軍時間的結果摘要第二行（距離 · 速度）、行進時間、秒數、有效速度；攔截三張卡的標籤：「攻擊者回到家時間」（看攻方）、「你應該在此時發送攔截部隊」（攻方＋攔截方，依序列出）、「攔截行進時間」（看攔截方）；OP 規劃（TS 優化器）每張結果卡／每列的標題（村莊名，涵蓋建議 TS、發兵、行進時間；看那一列的攻擊者）；反推 TS 結果表每列的計算行進時間（看那一列的競技場等級和靴子欄位）；躲兵「計算結果」標題旁一個（整區同一份說明）（P0-21）；農場收益：「單程」、「每小時最多次數」，以及「每日收益」摘要標題、「每日預估收益」、「回本天數」的灰標裡接在原本種類後面（同一個灰標、依序列出；P0-22）',
  heroBootsSpeed: '只有英雄靴子（> 0%、競技場 0 級）時：位置同 arenaSpeed（P0-20、P0-21）',
  arenaBootsSpeed: '競技場 > 0 級且英雄靴子 > 0% 時：位置同 arenaSpeed（P0-20、P0-21）',
  smithyFormula: '鐵匠升級：結果三張表的標題旁（攻擊力、步兵防禦、騎兵防禦；整張表同一份說明）（P0-18）',
}

/**
 * 行軍速度的灰標（P0-20、P0-21）：一行一個，三種擇一——只有競技場 arenaSpeed、只有靴子 heroBootsSpeed、
 * 兩個都有 arenaBootsSpeed；兩個都 0 不標（回傳空陣列）。行軍時間、攔截、OP 規劃、反推 TS、躲兵共用。
 */
export function speedPendingKinds(arenaLevel: number, bootsPercent: number): PendingKind[] {
  const kinds: PendingKind[] = arenaLevel > 0 && bootsPercent > 0 ? ['arenaBootsSpeed' as const] : arenaLevel > 0 ? ['arenaSpeed' as const] : bootsPercent > 0 ? ['heroBootsSpeed' as const] : []
  return kinds
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
