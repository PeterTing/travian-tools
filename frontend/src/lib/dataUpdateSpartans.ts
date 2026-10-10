import type { DataUpdateItem } from '@/lib/dataUpdate'
import { INGAME_UNITS, ingameTribeName } from '@/lib/ingameNames'

const ballista = INGAME_UNITS.ballista!

/**
 * #43（斯巴達）的資料更新卡項目：DATA_UPDATE_ITEMS 排在 x3 那項後面（2026-10-11 上線，幕僚長核准）。
 * 名稱一律讀遊戲內名稱表；舊名從表的 aliases 取。
 */
export function spartanDataUpdateItems(): DataUpdateItem[] {
  const tribe = ingameTribeName('spartans')
  // (a) 數值：ASIA x1 遊戲內說明；賴達投石機、五長官的訓練時間只確定 RoG 年度特別世界（一般世界待驗證）。
  //     維京運載量不寫（2026-10-11 幕僚長：出處不明，退回待驗證）
  const checked = `${tribe}兵種數值已核對（${ballista.zh}、${INGAME_UNITS.ephor!.zh}訓練時間除外）`
  return [
    { label: checked },
    // (b) ASIA x1 遊戲內中文名
    { label: `${tribe}兵種改用遊戲內正式名稱（${ballista.aliases[0]!}→${ballista.zh}）` },
  ]
}
