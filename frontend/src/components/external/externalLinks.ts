/**
 * 只放連結的 8 項外部工具（IA v2.2「外連 ↗」）。
 * 不抄資料也不抄程式，點了先跳「即將離開 Travian Tools」再開新分頁。
 */
export interface ExternalLink {
  id: string
  /** i18n key */
  labelKey: string
  /** 網站名稱（顯示用） */
  site: string
  url: string
  /** 額外說明（i18n key），例如 travco 的邀請步驟 */
  noteKey?: string
}

export const EXTERNAL_LINKS: ExternalLink[] = [
  { id: 'hero-revive', labelKey: 'external.heroRevive', site: 'kirilloid', url: 'http://travian.kirilloid.ru/hero.php' },
  { id: 'items', labelKey: 'external.items', site: 'kirilloid', url: 'http://travian.kirilloid.ru/items.php' },
  { id: 'server-news', labelKey: 'external.serverNews', site: 'kirilloid', url: 'http://travian.kirilloid.ru/' },
  {
    id: 'adventure-damage',
    labelKey: 'external.adventureDamage',
    site: 'Travian Help Center',
    url: 'https://support.travian.com/en/articles/141-hero-in-the-early-game',
  },
  {
    id: 'adventure-loot',
    labelKey: 'external.adventureLoot',
    site: 'Travian Help Center',
    url: 'https://support.travian.com/en/articles/141-hero-in-the-early-game',
  },
  { id: 'gettermap', labelKey: 'external.getterMap', site: 'GetterMap', url: 'https://www.gettertools.com/en/67-Travian-server-list', noteKey: 'external.getterMapNote' },
  { id: 'hero-tracking', labelKey: 'external.heroTracking', site: 'travco', url: 'https://travcotools.com/' },
  {
    id: 'travco-dual',
    labelKey: 'external.travcoDual',
    site: 'travco',
    url: 'https://travcotools.com/en/documentation/general/basicsfirst-steps/adding-a-dual/',
    noteKey: 'external.travcoDualNote',
  },
]
