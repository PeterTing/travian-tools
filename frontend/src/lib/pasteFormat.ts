/**
 * P0-05 明訂的貼上文字格式（plain text）。
 * 解析器走 backend/app/parsers；這裡只給 UI 說明用。
 */
export const PASTE_FORMAT_HELP = `可貼 HTML（從遊戲全選複製）或下列文字格式：

【集結點】
來村軍團 (N)
來源村 搶奪|攻擊 目標村
(x|y)
士兵 …
到達
在 HH:MM:SS 時

村內部隊
自軍
士兵 …

【多村資源】
村名  木  泥  鐵  糧

詳細見 docs/paste-format.md`

export function looksLikeHtml(value: string): boolean {
  const v = value.trim().slice(0, 200).toLowerCase()
  return v.includes('<html') || v.includes('<!doctype') || v.includes('<div') || v.includes('<table')
}

export function pageTypeLabel(pageType: string): string {
  switch (pageType) {
    case 'rally_point':
      return '集結點'
    case 'reports':
      return '戰報'
    case 'village_overview':
      return '村莊總覽'
    case 'village_center':
      return '村莊中心'
    case 'troop_statistics':
    case 'statistics_troops':
      return '軍隊統計'
    case 'statistics_overview':
    case 'statistics_resources':
      return '多村總覽'
    default:
      return '不明頁面'
  }
}

export function movementKindLabel(kind: string): string {
  if (kind.includes('raid')) return '突襲'
  if (kind.includes('attack')) return '攻擊'
  if (kind.includes('spy')) return '偵查'
  if (kind.includes('reinforcement') || kind.includes('supply')) return '支援'
  return kind
}

/** 接近午夜（前後 30 分鐘）提醒確認日期 */
export function nearMidnight(d: Date = new Date()): boolean {
  const minutes = d.getHours() * 60 + d.getMinutes()
  return minutes >= 23 * 60 + 30 || minutes < 30
}


/** 確認畫面要不要顯示「村莊」列（線框：集結點有；多村總覽／戰報沒有單村選擇） */
export function pageNeedsVillageSelector(pageType: string): boolean {
  return pageType === 'rally_point' || pageType === 'village_center'
}

export interface VillagePick {
  village_id: string
  name: string
  coordinate_x: number
  coordinate_y: number
  is_capital?: boolean
}

/** 預設村莊：解析結果指定 > 座標／名稱對上 > 首都 > 名單第一個 */
export function pickDefaultVillageId(
  villages: VillagePick[],
  data?: Record<string, unknown> | null,
): string | null {
  if (!villages.length) return null
  const byId = data?.village_id
  if (typeof byId === 'string' && villages.some((v) => v.village_id === byId)) {
    return byId
  }
  const name = data?.village_name
  if (typeof name === 'string') {
    const hit = villages.find((v) => v.name === name)
    if (hit) return hit.village_id
  }
  const x = data?.coordinate_x
  const y = data?.coordinate_y
  if (typeof x === 'number' && typeof y === 'number') {
    const hit = villages.find((v) => v.coordinate_x === x && v.coordinate_y === y)
    if (hit) return hit.village_id
  }
  const capital = villages.find((v) => v.is_capital)
  if (capital) return capital.village_id
  return villages[0].village_id
}

export function formatVillageLabel(v: {
  name: string
  coordinate_x: number
  coordinate_y: number
}): string {
  const y = v.coordinate_y < 0 ? `−${Math.abs(v.coordinate_y)}` : String(v.coordinate_y)
  return `${v.name} (${v.coordinate_x}|${y})`
}

/** 線框擷取時間：MM/DD HH:MM（24 小時） */
export function formatCaptureShort(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 解析 MM/DD HH:MM；年沿用 base 的年。失敗回 null */
export function parseCaptureShort(text: string, base: Date): Date | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  const hour = Number(m[3])
  const minute = Number(m[4])
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null
  }
  const next = new Date(base)
  next.setMonth(month - 1, day)
  next.setHours(hour, minute, 0, 0)
  if (Number.isNaN(next.getTime())) return null
  return next
}
