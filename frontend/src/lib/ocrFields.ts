import type { OcrField, OcrFieldName, OcrMovementMeta } from '@/services/ocrApi'
import { formatCountdownSeconds } from './formatCountdown'

/** 原因代碼 → i18n key（畫面文字照設計稿的對照表） */
export function reasonKey(code: string): string {
  return `ocr.reasons.${code}`
}

export const OCR_FIELD_ORDER: OcrFieldName[] = ['coords', 'countdown', 'arrival']

type Row = Record<string, unknown>

export function ocrMeta(m: Row): OcrMovementMeta | null {
  const meta = m.ocr as OcrMovementMeta | undefined
  return meta && typeof meta === 'object' && meta.fields ? meta : null
}

/** 座標顯示：負號用 U+2212，跟遊戲一樣 */
export function formatCoords(v: unknown): string {
  if (!v || typeof v !== 'object') return '？'
  const { x, y } = v as { x?: number; y?: number }
  if (typeof x !== 'number' || typeof y !== 'number') return '？'
  const axis = (n: number) => (n < 0 ? `\u2212${Math.abs(n)}` : String(n))
  return `(${axis(x)}|${axis(y)})`
}

export function formatFieldValue(name: OcrFieldName, v: unknown): string {
  if (v == null) return '—'
  if (name === 'coords') return formatCoords(v)
  if (name === 'countdown') return typeof v === 'number' ? formatCountdownSeconds(v) : String(v)
  return String(v)
}

export function needsConfirm(f: OcrField | undefined): boolean {
  return Boolean(f && f.status === 'low' && !f.confirmed)
}

/** 所有來襲裡還沒確認的低信心欄位數 */
export function countUnconfirmed(movements: Row[]): number {
  let n = 0
  for (const m of movements) {
    const meta = ocrMeta(m)
    if (!meta) continue
    for (const name of OCR_FIELD_ORDER) if (needsConfirm(meta.fields[name])) n += 1
  }
  return n
}

export function countLow(movements: Row[]): number {
  let n = 0
  for (const m of movements) {
    const meta = ocrMeta(m)
    if (!meta) continue
    for (const name of OCR_FIELD_ORDER) if (meta.fields[name]?.status === 'low') n += 1
  }
  return n
}

/** 解析 "x|y"、"(−45|12)"、"-45 12" 之類的手動輸入 */
export function parseCoordsInput(text: string): { x: number; y: number } | null {
  const t = text.replace(/[\u2212\u2010-\u2015\uff0d]/g, '-').trim()
  const m = t.match(/^\(?\s*(-?\d{1,3})\s*[|,\s]\s*(-?\d{1,3})\s*\)?$/)
  if (!m) return null
  const x = Number(m[1])
  const y = Number(m[2])
  if (Math.abs(x) > 400 || Math.abs(y) > 400) return null
  return { x, y }
}

/** "2:41:10" → 秒數；"13:10:28"（clock=true 時時 < 24） */
export function parseTimeInput(text: string, clock: boolean): number | null {
  const m = text.trim().match(/^(\d{1,3}):(\d{2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  const s = Number(m[3])
  if (mi > 59 || s > 59 || (clock && h > 23)) return null
  return h * 3600 + mi * 60 + s
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function clockFromSeconds(secs: number): string {
  const s = ((secs % 86400) + 86400) % 86400
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/**
 * 設定某一筆某一欄的值並標成已確認；同時更新存入用的頂層欄位
 * （coordinate_x/y、timer_seconds、arrival_time）。回傳新的 data（不改舊物件）。
 */
export function applyFieldValue(
  data: Row,
  index: number,
  name: OcrFieldName,
  value: unknown,
  confirmed = true,
): Row {
  const list = ((data.movements as Row[] | undefined)?.length
    ? (data.movements as Row[])
    : ((data.incoming as Row[] | undefined) ?? [])) as Row[]
  const next = list.map((m, i) => {
    if (i !== index) return m
    const meta = ocrMeta(m)
    if (!meta) return m
    const field: OcrField = { ...meta.fields[name], value, confirmed }
    const row: Row = {
      ...m,
      ocr: { ...meta, fields: { ...meta.fields, [name]: field } },
    }
    if (name === 'coords') {
      const v = value as { x?: number; y?: number } | null
      row.coordinate_x = v?.x ?? null
      row.coordinate_y = v?.y ?? null
    } else if (name === 'countdown') {
      row.timer_seconds = typeof value === 'number' ? value : null
    } else {
      row.arrival_time = typeof value === 'string' ? value : null
    }
    return row
  })
  return { ...data, movements: next, incoming: next }
}

export function setFieldConfirmed(data: Row, index: number, name: OcrFieldName, confirmed: boolean): Row {
  const list = ((data.movements as Row[] | undefined)?.length
    ? (data.movements as Row[])
    : ((data.incoming as Row[] | undefined) ?? [])) as Row[]
  const meta = list[index] ? ocrMeta(list[index]) : null
  if (!meta) return data
  return applyFieldValue(data, index, name, meta.fields[name].value, confirmed)
}

const DAY_MS = 24 * 3600 * 1000

/** 擷取時間：截圖裡有伺服器時鐘就用它；否則用檔案時間（24 小時內）；再不然用現在。之後都可以改。 */
export function defaultOcrCaptureAt(
  files: File[],
  suggested: string | null | undefined,
  now = Date.now(),
): { captureAt: string; timeSource: 'server_clock' | 'file' | 'now' } {
  if (suggested) return { captureAt: suggested, timeSource: 'server_clock' }
  const lm = files[0]?.lastModified
  if (lm && lm <= now + 60_000 && now - lm < DAY_MS) {
    return { captureAt: new Date(lm).toISOString(), timeSource: 'file' }
  }
  return { captureAt: new Date(now).toISOString(), timeSource: 'now' }
}
