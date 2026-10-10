import { readPref } from '@/lib/localPrefs'
import { spartanDataUpdateItems } from '@/lib/dataUpdateSpartans'

/**
 * 資料更新卡的上線日（台北時間，YYYY-MM-DD）。#38～#41 這一批和 #43（斯巴達）都是這天上線：deploy 當天改這一行就好——
 * 卡片標題（M/D 資料更新）、「知道了」記住的 key、14 天後自動不顯示的時間都從這裡算。
 */
export const DATA_UPDATE_RELEASE_DATE = '2026-10-11'

const [, releaseMonth, releaseDay] = DATA_UPDATE_RELEASE_DATE.split('-').map(Number)

/** 卡片標題：上線日的 M/D */
export const DATA_UPDATE_TITLE = `${releaseMonth}/${releaseDay} 資料更新`
/**
 * 同一天的卡片內容又改了（一天一張卡；#43 的斯巴達兩項併進 #41 那張 10/11 卡）就把版本加 1：
 * 已經按過「知道了」的人會再看到合併後的卡。換上線日時改回 1。
 */
export const DATA_UPDATE_REVISION = 2
/** 按「知道了」後記在這台裝置；上線日或版本換了 key 就跟著換（新的一次更新會再顯示）。版本 1 沿用舊格式（沒有 :v1） */
export const DATA_UPDATE_PREF_KEY = `tt:dataUpdate:${DATA_UPDATE_RELEASE_DATE}${DATA_UPDATE_REVISION > 1 ? `:v${DATA_UPDATE_REVISION}` : ''}`
/** 上線日起 14 天（台北時間第 15 天 0:00）後自動不顯示 */
export const DATA_UPDATE_HIDE_AT = new Date(new Date(`${DATA_UPDATE_RELEASE_DATE}T00:00:00+08:00`).getTime() + 14 * 86_400_000)

export interface DataUpdateItem {
  /** 改了什麼 */
  label: string
  /** 舊值、新值；只有一句話的項目（例如行軍時間修正）兩個都不填 */
  before?: string
  after?: string
  /** 只在伺服器倍速 ≥ 這個值的世界顯示（例如 x3 以上才有的修正） */
  minServerSpeed?: number
  /** 縮排的第二行（例如羅馬人另外一組數字） */
  sub?: { label: string; before: string; after: string }
  /** 灰色小字補充（例如「田地回本會變短」） */
  note?: string
  /** 不放在前 3 項：一律收在「再看 N 項」裡（例如前一次已經公布過的項目） */
  expandedOnly?: boolean
}

/**
 * 10/11 資料更新卡（一天一張；設計師＋幕僚長）：#38～#41 那一批的兩項＋#43 的斯巴達兩項（lib/dataUpdateSpartans.ts）。
 * 前 3 項依序：x3 行軍時間（只給 x3 以上看；x1、x2 拿掉，後面的往上補）→ 斯巴達數值 → 斯巴達正式名稱。
 * 慶典已核對（#41 已公布過）一律收在「再看 N 項」裡。每一項的出處寫在 PR 說明。
 */
export const DATA_UPDATE_ITEMS: DataUpdateItem[] = [
  // #38 官方說明頁 S20：兵速 x2/x3/x5 ×2、x10 ×4（之前直接乘倍速）。x1、x2 沒變，只給 x3 以上的世界看；放第一項（PM）
  { label: 'x3 以上世界的行軍時間已修正（之前算得太短，請重新確認排好的攻擊）', minServerSpeed: 3 },
  // #43 ASIA x1 遊戲內說明：(a) 數值已核對（賴達投石機、五長官訓練時間只確定 RoG 世界）(b) 遊戲內正式名稱
  ...spartanDataUpdateItems(),
  // #41 Travian Answers（官方）＋Travian Wiki 兩份一致：小慶典的糧、大慶典全部花費
  { label: '小慶典的糧、大慶典的花費', before: '待驗證', after: '已核對', expandedOnly: true },
]

/** 這個世界要顯示的項目（倍速不夠的項目拿掉；不知道倍速就當 x1） */
export function dataUpdateItemsFor(serverSpeed?: number | null): DataUpdateItem[] {
  const speed = serverSpeed ?? 1
  return DATA_UPDATE_ITEMS.filter((it) => it.minServerSpeed === undefined || speed >= it.minServerSpeed)
}

/** 不展開時顯示幾項 */
export const DATA_UPDATE_VISIBLE = 3

/** 這個世界的卡片：前面直接看到的（最多 DATA_UPDATE_VISIBLE 項，不含 expandedOnly）和收在「再看 N 項」的 */
export function dataUpdateSections(serverSpeed?: number | null): { first: DataUpdateItem[]; rest: DataUpdateItem[] } {
  const items = dataUpdateItemsFor(serverSpeed)
  const main = items.filter((it) => !it.expandedOnly)
  return {
    first: main.slice(0, DATA_UPDATE_VISIBLE),
    rest: [...main.slice(DATA_UPDATE_VISIBLE), ...items.filter((it) => it.expandedOnly)],
  }
}

export function shouldShowDataUpdate(now: Date = new Date()): boolean {
  if (now.getTime() >= DATA_UPDATE_HIDE_AT.getTime()) return false
  return readPref(DATA_UPDATE_PREF_KEY) !== 'dismissed'
}
