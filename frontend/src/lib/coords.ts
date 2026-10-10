/**
 * 座標輸入（全站共用，2026-10-10 Peter 回報「座標框預設 0、打不出負號」）。
 *
 * - 從遊戲複製的座標夾著看不見的方向字元（U+202D／U+202C…），負號是 U+2212「−」，
 *   例：ts11 複製下來的「‭(‭33‬|‭−‭4‬‬)‬」。打字和貼上都先清掉這些字元、把各種破折號換成「-」再解析。
 * - 範圍跟目前世界的地圖大小走；還沒有地圖大小時才退回 ±200（401×401 的世界）。
 */

/** 沒有地圖大小資料時的半徑：401×401 → −200～200 */
export const DEFAULT_MAP_RADIUS = 200

// 看不見的字元：方向標記（LRM／RLM、LRE～RLO、LRI～PDI）、零寬空白、BOM
const INVISIBLE_RE = /[\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g
// 各種長得像負號的字元：U+2212 減號、U+2010–2015 連字號／破折號、U+FE58／U+FE63 小型、U+FF0D 全形
const DASH_RE = /[\u2212\u2010-\u2015\ufe58\ufe63\uff0d]/g
// 全形數字、全形直線
const FULLWIDTH_DIGIT_RE = /[\uff10-\uff19]/g

/** 清掉看不見的字元、破折號換成「-」、全形數字和「｜」換成半形 */
export function sanitizeCoordText(text: string): string {
  return text
    .replace(INVISIBLE_RE, '')
    .replace(DASH_RE, '-')
    .replace(FULLWIDTH_DIGIT_RE, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/\uff5c/g, '|')
}

/** 地圖大小（邊長，例如 401）→ 半徑（200）；沒有資料就用 ±200 */
export function mapRadiusFromSize(mapSize: number | null | undefined): number {
  if (typeof mapSize !== 'number' || !Number.isFinite(mapSize) || mapSize < 3) return DEFAULT_MAP_RADIUS
  return Math.floor(mapSize / 2)
}

/** 單一軸：只接受整數、範圍 −radius～radius；空白或不合格回 null（不會變成 0） */
export function parseCoordAxis(text: string, radius: number = DEFAULT_MAP_RADIUS): number | null {
  const t = sanitizeCoordText(text).trim()
  if (!/^[-+]?\d{1,4}$/.test(t)) return null
  const n = Number(t)
  if (!Number.isInteger(n) || n < -radius || n > radius) return null
  return n === 0 ? 0 : n // -0 → 0
}

/** 「(33|-4)」「33|-4」「33 | −4」→ { x, y }；不是一對座標就回 null（範圍另外檢查） */
export function parseCoordPair(text: string): { x: number; y: number } | null {
  const t = sanitizeCoordText(text).trim()
  const m = t.match(/^\(?\s*([-+]?\d{1,4})\s*[|,]\s*([-+]?\d{1,4})\s*\)?$/)
  if (!m) return null
  const x = Number(m[1])
  const y = Number(m[2])
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y }
}

/** 欄位下方的錯誤字：跟其他有範圍的欄位同一句「請輸入 min–max」，負號照全站顯示用「−」 */
export function coordRangeMessage(radius: number = DEFAULT_MAP_RADIUS): string {
  return `請輸入 \u2212${radius}–${radius} 的整數`
}

export interface CoordText {
  x: string
  y: string
}

export const EMPTY_COORD: CoordText = { x: '', y: '' }

/** 一對座標都合格才回數字；有一格空白或超出範圍就回 null（頁面不要算） */
export function coordPairValue(v: CoordText, radius: number = DEFAULT_MAP_RADIUS): { x: number; y: number } | null {
  const x = parseCoordAxis(v.x, radius)
  const y = parseCoordAxis(v.y, radius)
  return x == null || y == null ? null : { x, y }
}

/** 已知數字（例如帶入的村莊）→ 輸入框文字；null 留空白 */
export function coordText(x: number | null | undefined, y: number | null | undefined): CoordText {
  return { x: x == null ? '' : String(x), y: y == null ? '' : String(y) }
}
