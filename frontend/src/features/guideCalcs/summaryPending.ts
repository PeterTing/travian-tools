import type { PendingKind } from '@/lib/pendingNotes'

/**
 * 每個用 CalcResultPanel 的頁面都要在這裡登記：結果摘要（手機收合時看得到的那幾行）
 * 有沒有用到「待驗證」資料、用到哪一種（P0-17 PM 規則：畫面上用待驗證資料算出的數字，
 * 旁邊都要有灰標，收合的摘要也算）。
 *
 * kinds：預設輸入下，摘要裡應該出現的灰標種類（空陣列 = 摘要沒用到待驗證資料）。
 * note：為什麼是這樣（給 review 看，也寫進 summary-audit.md）。
 * 新頁面沒登記，summaryPending.test.tsx 會失敗。
 */
export interface SummaryPendingDecl {
  kinds: PendingKind[]
  note: string
}

export const SUMMARY_PENDING: Record<string, SummaryPendingDecl> = {
  'pages/calculator/PathCalculatorPage.tsx': {
    kinds: [],
    note: '距離、移動時間：兵種速度由使用者自己輸入，沒有用到待驗證資料',
  },
  'features/guideCalcs/components/CropSimCalculator.tsx': {
    kinds: ['cropSim'],
    note: '總計 /hr 用到 Plus ×1.25（預設開）、供水系統加成：有用到時標題旁放 cropSim 灰標',
  },
  'features/guideCalcs/components/OasisRoiCalculator.tsx': {
    kinds: ['heroMansionCost', 'heroMansionCost'],
    note: '回本天數用英雄宅成本算（標題旁）＋第二行「英雄宅成本」本身（字後面）',
  },
  'features/guideCalcs/components/TraderouteCalculator.tsx': {
    kinds: [],
    note: '商人容量來自 fandom wiki，目前不在待驗證清單（匈人容量待 P0-16 決定）；沒有對應灰標種類，列為待決問題',
  },
  'features/guideCalcs/components/FarmingCalculator.tsx': {
    kinds: [],
    note: '每日搶奪量用兵種攜帶量（社群數字），目前不在待驗證清單；列為待決問題',
  },
  'features/guideCalcs/components/FieldRoiCalculator.tsx': {
    kinds: [],
    note: '資源田成本、產量不在待驗證清單',
  },
  'features/guideCalcs/components/PassiveCpCalculator.tsx': {
    kinds: ['building'],
    note: '每日被動 CP 用建築 CP 數值算：等級 > 0 的建築裡有還沒核對的，標題旁放 building 灰標（不放大數字旁）',
  },
  'features/guideCalcs/components/BuildOrderCalculator.tsx': {
    kinds: ['building'],
    note: '成本裡有加成建築（鋸木廠等，還沒核對）時，「成本」後面放 building 灰標',
  },
  'features/guideCalcs/components/LaunchSimCalculator.tsx': {
    kinds: ['units', 'units'],
    note: '結帳時間和拓荒者花費都用社群整理的兵種花費：標題旁＋「拓荒者」後面各一個 units 灰標',
  },
}
