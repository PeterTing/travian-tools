import type { PendingKind } from '@/lib/pendingNotes'

/**
 * 每個用 CalcResultPanel 的頁面都要在這裡登記：結果摘要（手機收合時看得到的那幾行）
 * 有沒有用到「待驗證」資料、用到哪幾種（P0-17 PM 規則：畫面上用待驗證資料算出的數字，
 * 旁邊都要有灰標，收合的摘要也算）。
 *
 * chips：預設輸入下摘要裡的灰標，一個灰標一個陣列（陣列裡是它點開後依序列出的種類）。
 *   空陣列 = 摘要沒用到待驗證資料。
 * 設計師規則：
 * - 一行只放一個灰標；同一行有好幾種待驗證資料時，依數字在這一行出現的順序列出（間隔 8px）
 * - 同一種不重複：第二行有灰標時，標題不再放同一種；標題的灰標只在它指的是不同的資料時才留
 * note：為什麼是這樣（給 review 看，也寫進 summary-audit.md）。
 * 新頁面沒登記，summaryPending.test.tsx 會失敗。
 */
export interface SummaryPendingDecl {
  chips: PendingKind[][]
  note: string
  /** 同一種出現在兩個灰標：只有 PM 明講要分開標時才可以，寫原因 */
  repeatOk?: string
}

export const SUMMARY_PENDING: Record<string, SummaryPendingDecl> = {
  'pages/calculator/PathCalculatorPage.tsx': {
    chips: [],
    note: '距離、移動時間：兵種速度是使用者自己打的數字（預設 7），這頁沒有兵種選單、不從網址或帳號帶入速度；已帶入列只帶伺服器速度和出發座標（幕僚長確認不用標）',
  },
  'features/guideCalcs/components/CropSimCalculator.tsx': {
    chips: [['fieldHighLevel', 'cropSim']],
    note: '總計 /hr 用到資源田產量（預設 18 級，3 級以上是公式推算，fieldHighLevel）、Plus ×1.25（預設開）／供水系統（cropSim）：標題旁一個，有用到才列',
  },
  'features/guideCalcs/components/OasisRoiCalculator.tsx': {
    chips: [['fieldHighLevel', 'cropSim', 'heroMansionCost']],
    note: '第二行一個灰標，依序：「每天 +X」（田地 3 級以上產量 fieldHighLevel、有勾 Plus 的 ×1.25 cropSim）、「英雄宅成本」（heroMansionCost）；回本天數就是這兩個相除，標題不再重複放',
  },
  'features/guideCalcs/components/TraderouteCalculator.tsx': {
    chips: [['merchantCapacity'], ['merchantCapacity']],
    note: '所需商人用商人容量和速度算（社群 wiki 的數字）：標題「所需商人」旁一個；第二行「容量 · 往返」（往返用商人速度）另一行，自己一個',
    repeatOk: 'PM 2026-10-10：往返時間那一行跟「所需商人」不同行，要有自己的灰標',
  },
  'features/guideCalcs/components/FarmingCalculator.tsx': {
    chips: [['unitCarry']],
    note: '每日收益受兵種攜帶量限制（社群整理的數字）：標題「每日收益」旁一個；第二行是建議馬數，沒用到待驗證資料',
  },
  'features/guideCalcs/components/FieldRoiCalculator.tsx': {
    chips: [['fieldHighLevel', 'plusFormula']],
    note: '第二行一個灰標，依序：「成本」（目標等級 ≥ 4 的花費）／「每天 +」（目標等級 ≥ 3 的產量）→ fieldHighLevel（同一種只列一次；預設 L7）、有勾 Plus → plusFormula、有加成建築 → building；標題不重複放',
  },
  'features/guideCalcs/components/PassiveCpCalculator.tsx': {
    chips: [['building']],
    note: '每日被動 CP 用建築 CP 數值算：等級 > 0 的建築裡有還沒核對的，標題旁放 building 灰標（不放大數字旁）',
  },
  'features/guideCalcs/components/BuildOrderCalculator.tsx': {
    chips: [['fieldHighLevel', 'building']],
    note: '第二行「成本」一個灰標：資源田升到 4 級以上（fieldHighLevel，也涵蓋上面的總時間）、加成建築（building）；有用到才列',
  },
  'features/guideCalcs/components/LaunchSimCalculator.tsx': {
    chips: [['launchSim', 'units']],
    note: '第二行一個灰標：「第 X 天」＝試算表每一步加總（launchSim）、「拓荒者」花費（units）；時數用同一份資料，標題不重複放',
  },
}
