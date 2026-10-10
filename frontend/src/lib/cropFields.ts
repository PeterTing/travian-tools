/** 一個村莊的資源田一共 18 塊（伐木場、泥坑、鐵礦場、農場） */
export const RESOURCE_FIELD_TOTAL = 18

export interface FieldCounts {
  wood: number
  clay: number
  iron: number
  crop: number
}

export type CropFieldsResult =
  | { ok: true; crop: number; layout: string; label: string }
  | { ok: false; error: string }

/**
 * 糧田判斷：輸入四種田各幾塊，就標出幾糧田。幾糧田＝農場有幾塊（3-3-3-9 是 9 糧田、4-4-4-6 是 6 糧田）。
 * 不猜、不用產量反推（之前用產量比例猜，同等級的 3-3-3-9 會被判成 15 糧田）。
 */
export function classifyCropFields(c: Partial<FieldCounts>): CropFieldsResult {
  const vals = [c.wood, c.clay, c.iron, c.crop]
  if (vals.some((v) => v == null || !Number.isInteger(v) || v < 0)) {
    return { ok: false, error: '四種田都要選' }
  }
  const [wood, clay, iron, crop] = vals as number[]
  const total = wood + clay + iron + crop
  if (total !== RESOURCE_FIELD_TOTAL) {
    return { ok: false, error: `四種田加起來要 ${RESOURCE_FIELD_TOTAL} 塊（現在 ${total} 塊）` }
  }
  return { ok: true, crop, layout: `${wood}-${clay}-${iron}-${crop}`, label: `${crop} 糧田` }
}
