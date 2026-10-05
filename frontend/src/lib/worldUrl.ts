/**
 * 世界（伺服器）網址：和後端 app/utils/world_url.py 同一套規則。
 * 可以直接貼遊戲裡的完整網址，只留下 scheme + host；
 * 伺服器名稱和速度從 ts<N>.x<速度>.<區域>.travian.com 推出來，推不出來就是 null。
 */

const HOST_LABEL = /^[a-z0-9-]+$/
const SPEED_LABEL = /^x(\d{1,2})$/

export const REGION_NAMES: Record<string, string> = {
  international: '國際服',
  asia: '亞洲服',
  europe: '歐洲服',
  america: '美洲服',
  arabics: '阿拉伯服',
}

export const ALLOWED_SPEEDS = [1, 2, 3, 5, 10] as const

/** 整理成 https://host；格式不對回傳 null */
export function normalizeServerUrl(raw: string): string | null {
  let text = (raw ?? '').trim()
  if (!text) return null
  if (!text.includes('://')) text = `https://${text}`
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  const scheme = url.protocol.replace(':', '').toLowerCase()
  if (scheme !== 'http' && scheme !== 'https') return null
  const host = url.hostname.toLowerCase()
  const labels = host.split('.')
  if (labels.length < 2 || !labels.every((label) => HOST_LABEL.test(label))) return null
  return `${scheme}://${url.port ? `${host}:${url.port}` : host}`
}

export interface WorldUrlInfo {
  serverUrl: string
  serverName: string | null
  serverSpeed: number | null
}

/** 正規化網址，並盡量推出伺服器名稱（例如「ts3 亞洲服」）和速度 */
export function describeServerUrl(raw: string): WorldUrlInfo | null {
  const serverUrl = normalizeServerUrl(raw)
  if (!serverUrl) return null
  const labels = new URL(serverUrl).hostname.split('.')
  const first = labels[0]
  let serverName: string | null = null
  let serverSpeed: number | null = null
  if (/^ts\d+$/.test(first)) {
    let region: string | null = null
    for (const label of labels.slice(1, -2)) {
      const match = SPEED_LABEL.exec(label)
      if (match) {
        const value = Number(match[1])
        serverSpeed = (ALLOWED_SPEEDS as readonly number[]).includes(value) ? value : null
      } else if (label !== 'travian') {
        region = REGION_NAMES[label] ?? label
      }
    }
    serverName = region ? `${first} ${region}` : first
  }
  return { serverUrl, serverName, serverSpeed }
}

/** 世界上實際用到的 UTC 時差（分鐘） */
export const UTC_OFFSET_CHOICES: readonly number[] = [
  -720, -660, -600, -570, -540, -480, -420, -360, -300, -240, -210, -180, -120, -60, 0, 60, 120,
  180, 210, 240, 270, 300, 330, 345, 360, 390, 420, 480, 525, 540, 570, 600, 630, 660, 720, 765,
  780, 840,
]

/** 60 → 「UTC+1」、-210 → 「UTC−3:30」、0 → 「UTC±0」 */
export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return 'UTC±0'
  const sign = minutes > 0 ? '+' : '−'
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const rest = abs % 60
  return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, '0')}` : ''}`
}
