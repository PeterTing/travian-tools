/** 時:分:秒（0–23:0–59:0–59），例如 23:05:00；也收 9:05:00 */
export const HMS_RE = /^([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)$/

export function isHms(text: string): boolean {
  return HMS_RE.test(text.trim())
}

/** 跟基準那天差幾天 → 畫面上的小字：1 →「（明天）」、-1 →「（前一天）」、0 → 空白 */
export function dayOffsetLabel(offset: number | null | undefined): string {
  if (!offset) return ''
  if (offset === 1) return '（明天）'
  if (offset === -1) return '（前一天）'
  return offset > 0 ? `（${offset} 天後）` : `（${-offset} 天前）`
}
