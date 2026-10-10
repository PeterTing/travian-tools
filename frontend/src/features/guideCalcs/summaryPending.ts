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
}

export const SUMMARY_PENDING: Record<string, SummaryPendingDecl> = {
  'pages/calculator/PathCalculatorPage.tsx': {
    chips: [],
    note: '預設（競技場 0 級）沒用到待驗證資料：兵種速度是使用者自己打的數字（預設 7），這頁沒有兵種選單、不從網址或帳號帶入速度；已帶入列只帶伺服器速度和出發座標（幕僚長確認不用標）。競技場 > 0 級或英雄靴子 > 0% 時第二行（距離 · 速度）放一個：只有競技場 arenaSpeed、只有靴子 heroBootsSpeed、兩個都有 arenaBootsSpeed（#27 後續、P0-20）',
  },
  'features/guideCalcs/components/CropSimCalculator.tsx': {
    chips: [],
    note: '總計 /hr＝田產量 ×（1＋加成建築＋綠洲）× Plus 1.25：資源田、加成建築、供水系統照官方知識庫，Plus 相乘照官方 S129（P0-23），都核對過，不放灰標；加成建築的資料哪天又標待驗證，標題旁會自動放 building',
  },
  'features/guideCalcs/components/OasisRoiCalculator.tsx': {
    chips: [],
    note: '「每天 +X」（資源田產量：官方知識庫；Plus ×1.25：官方 S129）、「英雄宅成本」（官方知識庫 2–20 級）都核對過（P0-23），不放灰標',
  },
  'features/guideCalcs/components/TraderouteCalculator.tsx': {
    chips: [],
    note: '商人容量和速度：官方 S3；交易所每級 +20%（羅馬人 +40%）：官方知識庫＋S213、S88（P0-23），不放灰標',
  },
  'features/guideCalcs/components/FarmingCalculator.tsx': {
    chips: [],
    note: '每日收益用兵種運載量、花費算：6 種兵都是 ts11 遊戲內說明頁讀到的數字（P0-18），不放 unitCarry；之後加的兵種沒讀到時（statsVerified false）標題旁放 unitCarry。有競技場或靴子時標題旁一個灰標依序列出 unitCarry（有的話）→ 行軍速度（P0-22），預設兩個都 0 不放。第二行是建議馬數，沒用到待驗證資料',
  },
  'features/guideCalcs/components/FieldRoiCalculator.tsx': {
    chips: [],
    note: '資源田 1–20 級花費、產量：官方知識庫；Plus 乘在總產量上：官方 S129（P0-23），不放灰標；有加成建築且加成建築資料又標待驗證時第二行放 building',
  },
  'features/guideCalcs/components/PassiveCpCalculator.tsx': {
    chips: [],
    note: '每日被動 CP 用建築 CP 數值算：全部建築照官方知識庫核對過（P0-23），不放灰標；等級 > 0 的建築裡有還沒核對的（isBuildingVerified false），標題旁放 building 灰標（不放大數字旁）',
  },
  'features/guideCalcs/components/BuildOrderCalculator.tsx': {
    chips: [],
    note: '資源田、加成建築的花費和時間：官方知識庫；排序用的 Plus 相乘：官方 S129（P0-23），不放灰標；加成建築資料又標待驗證時第二行「成本」放 building',
  },
  'features/guideCalcs/components/LaunchSimCalculator.tsx': {
    chips: [['launchSim']],
    note: '第二行一個灰標：「第 X 天」＝試算表每一步加總（launchSim）；時數用同一份資料，標題不重複放。開拓者花費沒有用在計算裡，P0-17 (b) 從摘要拿掉（明細最後一列仍列出，旁邊有 units 灰標）',
  },
}
