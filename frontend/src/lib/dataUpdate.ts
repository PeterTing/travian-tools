import { INGAME_BUILDINGS, ingameUnitNameByGameId } from '@/lib/ingameNames'
import { readPref } from '@/lib/localPrefs'

/** 按「知道了」後記在這台裝置；換一次更新就換 key */
export const DATA_UPDATE_PREF_KEY = 'tt:dataUpdate:2026-10-10'
/** 10/10 起 14 天（台北時間 10/24 0:00）後自動不顯示 */
export const DATA_UPDATE_HIDE_AT = new Date('2026-10-24T00:00:00+08:00')

const smithy = INGAME_BUILDINGS.blacksmith!

/**
 * 10/10 資料更新卡（#33）：兵種、建築、資源田數值對照 ts11 遊戲內說明頁更正後，告訴玩家改了什麼。
 * 每一項的出處寫在 PR 說明。舊名從遊戲內名稱表的 aliases 取（站上其他地方不顯示舊名）。
 */
export const DATA_UPDATE_ITEMS: { label: string; before: string; after: string }[] = [
  { label: `${ingameUnitNameByGameId(64)}運載量`, before: '115', after: '75' },
  { label: '1 級資源田產量增加', before: '7', after: '4' },
  { label: '建築名稱', before: smithy.aliases[0]!, after: smithy.zh },
]

export function shouldShowDataUpdate(now: Date = new Date()): boolean {
  if (now.getTime() >= DATA_UPDATE_HIDE_AT.getTime()) return false
  return readPref(DATA_UPDATE_PREF_KEY) !== 'dismissed'
}
