/** 「01,000,000」「1 000 000」→ 1000000；空白或含其他字元 → NaN（不當 0） */
export function parseLooseInteger(text: string): number {
  const t = text
    .replace(/[\uff10-\uff19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/[,\s\uff0c]/g, '')
  if (!/^\d+$/.test(t)) return NaN
  return Number(t)
}

/** 1000000 → 「1,000,000」；NaN → 空白 */
export function formatThousands(n: number): string {
  return Number.isFinite(n) ? Math.trunc(n).toLocaleString('en-US') : ''
}
