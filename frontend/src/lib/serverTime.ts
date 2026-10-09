/**
 * 伺服器時間／本地時間（IA v2.2）
 *
 * - 世界存的是伺服器的 UTC 時差（分鐘，UTC+1 = 60）；null = 還沒讀到
 * - 「時差 +6 小時」＝本地時間 − 伺服器時間（ts11：伺服器 14:45、台北 20:45）
 * - 貼上集結點或村莊頁時，用頁面上的伺服器時鐘和貼上當下的本地時間反推，
 *   不請使用者手動填
 */

/** 這台裝置目前的 UTC 時差（分鐘；台北 = 480） */
export function localUtcOffsetMinutes(at: Date = new Date()): number {
  return -at.getTimezoneOffset()
}

/** 時差（本地 − 伺服器，小時）；世界還沒有 UTC 時差時是 null */
export function displayOffsetHours(worldUtcOffset: number | null | undefined, at: Date = new Date()): number | null {
  if (worldUtcOffset == null) return null
  return (localUtcOffsetMinutes(at) - worldUtcOffset) / 60
}

/** +6、−1.5、0 */
export function formatOffsetHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100
  if (rounded === 0) return '0'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}`
}

function parseClock(clock: string): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(clock)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  const s = Number(m[3] ?? 0)
  if (h > 23 || min > 59 || s > 59) return null
  return h * 3600 + min * 60 + s
}

/**
 * 從頁面上的伺服器時鐘（HH:MM:SS）和貼上當下的時間，推出伺服器的 UTC 時差（分鐘）。
 * 時差取到 15 分鐘（世界上的時區都是 15 分鐘的倍數）；讀不懂就回傳 null。
 */
export function deriveServerUtcOffset(serverClock: string | null | undefined, capturedAt: Date): number | null {
  if (!serverClock) return null
  const server = parseClock(serverClock)
  if (server == null || Number.isNaN(capturedAt.getTime())) return null
  const utcSeconds =
    capturedAt.getUTCHours() * 3600 + capturedAt.getUTCMinutes() * 60 + capturedAt.getUTCSeconds()
  let diff = (server - utcSeconds) / 60
  // 收到 (−12h, +14h]
  while (diff <= -12 * 60) diff += 24 * 60
  while (diff > 14 * 60) diff -= 24 * 60
  return Math.round(diff / 15) * 15
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 某個時差（分鐘）下的時鐘 */
function clockAt(date: Date, offsetMinutes: number, withSeconds: boolean): { text: string; dayIndex: number } {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000)
  const text = `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}${withSeconds ? `:${pad(shifted.getUTCSeconds())}` : ''}`
  const dayIndex = Math.floor(shifted.getTime() / 86_400_000)
  return { text, dayIndex }
}

export interface ServerLocalTime {
  /** 伺服器時間；世界還沒有時差時是 null（只顯示本地時間） */
  server: string | null
  local: string
  /** 本地時間跟「現在」比是明天（跨日加「（明天）」） */
  localTomorrow: boolean
}

/** 一個時間點換成「伺服器 14:58:31／本地 20:58:31（明天）」 */
export function serverAndLocal(
  date: Date,
  worldUtcOffset: number | null | undefined,
  now: Date = new Date(),
  withSeconds = true,
): ServerLocalTime {
  const localOffset = localUtcOffsetMinutes(date)
  const local = clockAt(date, localOffset, withSeconds)
  const today = clockAt(now, localUtcOffsetMinutes(now), withSeconds).dayIndex
  return {
    server: worldUtcOffset == null ? null : clockAt(date, worldUtcOffset, withSeconds).text,
    local: local.text,
    localTomorrow: local.dayIndex > today,
  }
}

/** 這台裝置的時區名稱（台北），拿不到就空字串 */
export function localZoneLabel(lang: 'zh' | 'en'): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (zone === 'Asia/Taipei') return lang === 'zh' ? '台北' : 'Taipei'
    const city = zone.split('/').pop() ?? ''
    return city.replace(/_/g, ' ')
  } catch {
    return ''
  }
}
