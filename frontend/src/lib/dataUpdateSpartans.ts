import type { DataUpdateItem } from '@/lib/dataUpdate'
import { INGAME_UNITS, ingameTribeName } from '@/lib/ingameNames'
import { vikingCarryPending } from '@/data/unitSpeeds'

const ballista = INGAME_UNITS.ballista!

/**
 * #43（斯巴達、維京運載量）上線那天的資料更新卡項目：先備好，不放進目前這一批（PM：#43 之後另外上線，有自己的一張卡）。
 * 上線那天：DATA_UPDATE_ITEMS 換成這兩項（有 x3 那項就排在它後面）、DATA_UPDATE_RELEASE_DATE 改成上線日。
 * 名稱一律讀遊戲內名稱表；舊名從表的 aliases 取。
 */
export function spartanDataUpdateItems(carryPending: boolean = vikingCarryPending()): DataUpdateItem[] {
  const tribe = ingameTribeName('spartans')
  // (a) 數值：ASIA x1 遊戲內說明；賴達投石機、五長官的訓練時間只確定 RoG 年度特別世界（一般世界待驗證）。
  //     維京運載量 ✓（Fandom、Siegewise 兩份一致）才接在同一行後面
  const checked = `${tribe}兵種數值已核對（${ballista.zh}、${INGAME_UNITS.ephor!.zh}訓練時間除外）${carryPending ? '' : `、${ingameTribeName('vikings').replace(/人$/, '')}運載量`}`
  return [
    { label: checked },
    // (b) ASIA x1 遊戲內中文名
    { label: `${tribe}兵種改用遊戲內正式名稱（${ballista.aliases[0]!}→${ballista.zh}）` },
  ]
}
