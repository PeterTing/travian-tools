import { readPref } from '@/lib/localPrefs'

/**
 * 資料更新卡的上線日（台北時間，YYYY-MM-DD）。#38～#41 這一批一起上線：deploy 當天改這一行就好——
 * 卡片標題（M/D 資料更新）、「知道了」記住的 key、14 天後自動不顯示的時間都從這裡算。
 */
export const DATA_UPDATE_RELEASE_DATE = '2026-10-11'

const [, releaseMonth, releaseDay] = DATA_UPDATE_RELEASE_DATE.split('-').map(Number)

/** 卡片標題：上線日的 M/D */
export const DATA_UPDATE_TITLE = `${releaseMonth}/${releaseDay} 資料更新`
/** 按「知道了」後記在這台裝置；上線日換了 key 就跟著換（新的一次更新會再顯示） */
export const DATA_UPDATE_PREF_KEY = `tt:dataUpdate:${DATA_UPDATE_RELEASE_DATE}`
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
}

/**
 * 資料更新卡（#38～#41 這一批，PM＋幕僚長）：只放這兩項，斯巴達的項目跟 #43 一起上。
 * x1、x2 世界看不到行軍時間那項，只剩慶典一項；不拿別的項目補。每一項的出處寫在 PR 說明。
 */
export const DATA_UPDATE_ITEMS: DataUpdateItem[] = [
  // #38 官方說明頁 S20：兵速 x2/x3/x5 ×2、x10 ×4（之前直接乘倍速）。x1、x2 沒變，只給 x3 以上的世界看；放第一項（PM）
  { label: 'x3 以上世界的行軍時間已修正（之前算得太短，請重新確認排好的攻擊）', minServerSpeed: 3 },
  // #41 Travian Answers（官方）＋Travian Wiki 兩份一致：小慶典的糧、大慶典全部花費
  { label: '小慶典的糧、大慶典的花費', before: '待驗證', after: '已核對' },
]

/** 這個世界要顯示的項目（倍速不夠的項目拿掉；不知道倍速就當 x1） */
export function dataUpdateItemsFor(serverSpeed?: number | null): DataUpdateItem[] {
  const speed = serverSpeed ?? 1
  return DATA_UPDATE_ITEMS.filter((it) => it.minServerSpeed === undefined || speed >= it.minServerSpeed)
}

/** 不展開時顯示幾項 */
export const DATA_UPDATE_VISIBLE = 3

export function shouldShowDataUpdate(now: Date = new Date()): boolean {
  if (now.getTime() >= DATA_UPDATE_HIDE_AT.getTime()) return false
  return readPref(DATA_UPDATE_PREF_KEY) !== 'dismissed'
}
