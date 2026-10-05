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
