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
  'unitCarry',
  'fieldLevelZero',
  'buildingEffect',
  'vikingCarry',
  'launchSim',
  'arenaSpeed',
  'heroBootsSpeed',
  'arenaBootsSpeed',
  'smithyFormula',
] as const

export type PendingKind = (typeof PENDING_KINDS)[number]

/** 每一種出現在哪裡（給 PM 的文字表、也給完整性測試用） */
export const PENDING_KIND_USAGE: Record<PendingKind, string> = {
  units: '兵種資料庫詳情：「訓練成本」標題旁（花費、糧耗、訓練時間還沒核對的部族；data/unitCostVerified.json）；開局衝村模擬的「開拓者」花費（摘要、明細）；農場收益的兵力初始成本、回本天數',
  autofillUnits: '已帶入列（用到兵種資料的計算器，部族是斯巴達、維京或還不知道部族才出現）：一行，兵種數字（維京只剩攜帶量）＋斯巴達速度',
  spartanSpeed: '首頁來襲卡反推 TS 那一行、反推 TS 結果的「未列入反推」提示',
  unitSpeedOfficialPending: '兵種資料庫：斯巴達步兵／騎兵 6 種的速度（列表與詳情）',
  unitSpeedNoSource: '兵種資料庫：斯巴達破城槌、弩砲、監察官、開拓者的速度（列表與詳情）',
  building: '建築資料庫列表與詳情、建築升級花費結果的建築名稱旁；CP 與開村「每日被動 CP」摘要標題；建造順序摘要的成本（有加成建築時）；田地回本有加成建築時的摘要與產量；首都產量模擬有加成建築時的「總計 /hr」摘要標題、「產量分解」標題、合計列（只標用到的那幾種資源）',
  cpThreshold: 'CP 與開村的開村門檻表與下方說明、首頁開村卡進度',
  celebration: 'CP 與開村的慶典花費表與下方說明',
  unitCarry: '農場收益：結果摘要「每日收益」標題（第一個，後面接行軍速度）、搬運上限、每日預估收益、單位選單（選項裡有攜帶量）',
  fieldLevelZero: '資源田 0 級產量（3／小時）用到的地方：資源資料庫等級表的 0 級列、回本表的 0 → 1 級列；田地回本目標 1 級時的結果摘要、產量增加兩列、比較表；建造順序有田從 0 級升 1 級、或起始有 0 級的田（就算 20 步都沒升）時的結果摘要與清單標題（P0-23）',
  buildingEffect: '建築資料庫詳情：等級表「效果」欄標題旁（官方知識庫沒有可對照效果數字的建築：研究院、盔甲廠、大使館、集結點、寶物庫；gameData.gen.json effectsPending）（P0-23）',
  vikingCarry: '兵種資料庫詳情：維京兵種「基本資訊」的運載量那一列（官方說明頁 S139 沒有運載量）（P0-23）',
  launchSim: '開局衝村模擬：結果摘要第二行（第幾天）、總時數、伺服器天、里程碑表（開局花費是試算表每一步的加總）',
  arenaSpeed: '只有競技場（> 0 級、英雄靴子 0）時（兩個都 0 不標；speedPendingKinds 選）：行軍時間的結果摘要第二行（距離 · 速度）、行進時間、秒數、有效速度；攔截三張卡的標籤：「攻擊者回到家時間」（看攻方）、「你應該在此時發送攔截部隊」（攻方＋攔截方，依序列出）、「攔截行進時間」（看攔截方）；OP 規劃（TS 優化器）每張結果卡／每列的標題（村莊名，涵蓋建議 TS、發兵、行進時間；看那一列的攻擊者）；反推 TS 結果表每列的計算行進時間（看那一列的競技場等級和靴子欄位）；躲兵「計算結果」標題旁一個（整區同一份說明）（P0-21）；農場收益：「單程」、「每小時最多次數」，以及「每日收益」摘要標題、「每日預估收益」、「回本天數」的灰標裡接在原本種類後面（同一個灰標、依序列出；P0-22）',
  heroBootsSpeed: '只有英雄靴子（> 0%、競技場 0 級）時：位置同 arenaSpeed（P0-20、P0-21）',
  arenaBootsSpeed: '競技場 > 0 級且英雄靴子 > 0% 時：位置同 arenaSpeed（P0-20、P0-21）',
  smithyFormula: '盔甲廠升級：結果三張表的標題旁（攻擊力、步兵防禦、騎兵防禦；整張表同一份說明）（P0-18）',
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
