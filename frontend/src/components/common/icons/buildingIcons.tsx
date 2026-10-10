// 建築、資源田圖示：藝途自己畫的線條圖示（不描、不抄遊戲原圖或第三方圖示）。
// 設計師規格：viewBox 0 0 24 24、四邊留 2px、只有線條不填色、線寬 1.75、圓角端點；
// 一個主外框＋最多 3 條細節線，16px 也認得出來；圖示裡不放文字、數字、等級。
// 「大」字頭的建築（大兵營、大馬廄、大倉庫、大穀倉）＝原建築的外框＋一個「＋」記號。
import type { ReactNode } from 'react'
import { INGAME_BUILDINGS } from '@/lib/ingameNames'

type Icon = ReactNode

const swords = (
  <>
    <path d="M4 4 19 19" />
    <path d="M20 4 5 19" />
  </>
)
const horseshoe = <path d="M7.5 20H5.5L4.5 12a7.5 7.5 0 0 1 15 0l-1 8h-2l.5-7.5a4 4 0 0 0-8 0Z" />
const warehouseOutline = <path d="M3 10 12 4l9 6v10H3Z" />
const siloOutline = <path d="M6 20V9a6 5 0 0 1 12 0v11Z" />

export const BUILDING_ICONS: Readonly<Record<string, Icon>> = {
  // 四種資源田
  woodcutter: (
    <>
      <path d="M12 3 6.5 11H9l-3.5 6h13L15 11h2.5Z" />
      <path d="M12 17v4" />
    </>
  ),
  clay_pit: (
    <>
      <path d="M3 12h18l-2.5 8h-13Z" />
      <path d="M7 16h10" />
      <path d="M12 3v6" />
      <path d="M10 9h4" />
    </>
  ),
  iron_mine: (
    <>
      <path d="M2.5 20 9 9l4 6 2.5-3.5L21.5 20Z" />
      <path d="M14 4c2.5-.8 5 .2 6.5 2" />
      <path d="M17.5 4.5 15.5 8" />
    </>
  ),
  cropland: (
    <>
      <path d="M12 21V5" />
      <path d="M12 9.5c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4 2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4" />
      <path d="M12 15c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4 2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4" />
      <path d="M7 21h10" />
    </>
  ),
  // 加成建築
  sawmill: (
    <>
      <circle cx="12" cy="10.5" r="7" />
      <circle cx="12" cy="10.5" r="1.5" />
      <path d="M3 21h18" />
    </>
  ),
  brickyard: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="1" />
      <path d="M3 12.5h18" />
      <path d="M10 6v6.5" />
      <path d="M14 12.5V19" />
    </>
  ),
  iron_foundry: (
    <>
      <path d="M4 20 6.5 14h11l2.5 6Z" />
      <path d="M12 11c-2-1.5-2-3.5 0-6.5 2 3 2 5 0 6.5Z" />
    </>
  ),
  grain_mill: (
    <>
      <path d="M9 21l1.2-11h3.6L15 21Z" />
      <path d="M6 3 18 15" />
      <path d="M18 3 6 15" />
    </>
  ),
  bakery: (
    <>
      <path d="M4 18v-5a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v5Z" />
      <path d="M9 11.5 8 14" />
      <path d="M13 11.5 12 14" />
      <path d="M17 11.5 16 14" />
    </>
  ),
  // 經濟、基礎
  warehouse: (
    <>
      {warehouseOutline}
      <rect x="8" y="13" width="8" height="7" />
      <path d="M8 13l8 7" />
    </>
  ),
  great_warehouse: (
    <>
      {warehouseOutline}
      <path d="M12 12.5v6" />
      <path d="M9 15.5h6" />
    </>
  ),
  granary: (
    <>
      {siloOutline}
      <path d="M6 13h12" />
      <path d="M3 20h18" />
    </>
  ),
  great_granary: (
    <>
      {siloOutline}
      <path d="M12 11.5v6" />
      <path d="M9 14.5h6" />
      <path d="M3 20h18" />
    </>
  ),
  main_building: (
    <>
      <path d="M3 21V9l9-6 9 6v12Z" />
      <path d="M8 12v6" />
      <path d="M12 12v6" />
      <path d="M16 12v6" />
    </>
  ),
  rally_point: (
    <>
      <path d="M6 21V4h11l-2.5 4 2.5 4H6" />
      <path d="M3 21h7" />
    </>
  ),
  marketplace: (
    <>
      <path d="M3 9 5 4h14l2 5Z" />
      <path d="M5 9v11" />
      <path d="M19 9v11" />
      <path d="M3 20h18" />
    </>
  ),
  embassy: (
    <>
      <path d="M4 21V11h16v10Z" />
      <path d="M7 11a5 5 0 0 1 10 0" />
      <path d="M12 6V3" />
      <path d="M10 21v-5h4v5" />
    </>
  ),
  trade_office: (
    <>
      <path d="M3 5h3l2 11h11l2-7H7" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
  cranny: (
    <>
      <path d="M3 20v-6a9 8 0 0 1 18 0v6Z" />
      <path d="M9 20v-4a3 3 0 0 1 6 0v4" />
    </>
  ),
  town_hall: (
    <>
      <path d="M4 21V11l8-7 8 7v10Z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M10 21v-3h4v3" />
    </>
  ),
  residence: (
    <>
      <path d="M5 21V11l7-6 7 6v10Z" />
      <path d="M10 21v-5h4v5" />
      <path d="M16 7.5V4h2v5" />
    </>
  ),
  palace: (
    <>
      <path d="M3 18 4 7l5 4 3-6 3 6 5-4 1 11Z" />
      <path d="M4 21h16" />
    </>
  ),
  treasury: (
    <>
      <rect x="3" y="9" width="18" height="11" rx="1" />
      <path d="M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3" />
      <path d="M3 13h18" />
      <path d="M12 13v3" />
    </>
  ),
  academy: (
    <>
      <path d="M12 6c-2-1.5-5-2-9-2v14c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2Z" />
      <path d="M12 6v14" />
    </>
  ),
  heros_mansion: (
    <>
      <path d="M5 19v-6a7 7 0 0 1 14 0v6Z" />
      <path d="M5 13h14" />
      <path d="M12 6V3" />
    </>
  ),
  tournament_square: (
    <>
      <ellipse cx="12" cy="15.5" rx="9" ry="5" />
      <ellipse cx="12" cy="15.5" rx="4.5" ry="2.2" />
      <path d="M12 10.5V3l4 2-4 2" />
    </>
  ),
  stonemasons_lodge: (
    <>
      <path d="M3 13h11v8H3Z" />
      <path d="M16 3l4 4-2 2-4-4Z" />
      <path d="M15 8l-4 4" />
    </>
  ),
  brewery: (
    <>
      <path d="M5 6h10v14H5Z" />
      <path d="M15 9h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
      <path d="M8.5 9.5v7" />
      <path d="M11.5 9.5v7" />
    </>
  ),
  wonder_of_the_world: (
    <>
      <path d="M3 21h18l-2.5-5h-13ZM5.5 16 8 11h8l2.5 5M8 11l4-7 4 7" />
    </>
  ),
  waterworks: (
    <>
      <path d="M12 3c3.5 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-11Z" />
      <path d="M9 14a3 3 0 0 0 3 3" />
    </>
  ),
  command_center: (
    <>
      <path d="M3 20 12 4.5 21 20Z" />
      <path d="M10 20l2-5 2 5" />
      <path d="M12 4.5V2.5" />
    </>
  ),
  // 軍事
  barracks: (
    <>
      {swords}
      <path d="M6.5 13.5l4 4" />
      <path d="M13.5 17.5l4-4" />
    </>
  ),
  great_barracks: (
    <>
      {swords}
      <path d="M12 2.5v4" />
      <path d="M10 4.5h4" />
    </>
  ),
  stable: (
    <>
      {horseshoe}
      <path d="M6.5 9h.01" />
      <path d="M17.5 9h.01" />
    </>
  ),
  great_stable: (
    <>
      {horseshoe}
      <path d="M12 2.5v4" />
      <path d="M10 4.5h4" />
    </>
  ),
  workshop: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3.5v17" />
      <path d="M3.5 12h17" />
    </>
  ),
  blacksmith: (
    <>
      <path d="M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6Z" />
      <path d="M12 7v10" />
    </>
  ),
  horse_drinking_trough: (
    <>
      <path d="M3 11h18l-2 8H5Z" />
      <path d="M6 14.5c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0" />
      <path d="M7 19v2" />
      <path d="M17 19v2" />
    </>
  ),
  trapper: (
    <>
      <rect x="4" y="6" width="16" height="15" rx="1" />
      <path d="M9 6v15" />
      <path d="M15 6v15" />
      <path d="M12 6V3" />
    </>
  ),
  // 城牆（各部族）
  city_wall: (
    <>
      <path d="M3 21V7h3.6v3h3.6V7h3.6v3h3.6V7H21v14Z" />
      <path d="M3 15h18" />
      <path d="M12 15v6" />
    </>
  ),
  earth_wall: (
    <>
      <path d="M2.5 20c2-6 5-9 9.5-9s7.5 3 9.5 9Z" />
      <path d="M9 11V7.5h6V11" />
      <path d="M7 16h10" />
    </>
  ),
  palisade: (
    <>
      <path d="M4 21V8l2-3 2 3v13M10 21V8l2-3 2 3v13M16 21V8l2-3 2 3v13" />
      <path d="M3 14h18" />
    </>
  ),
  stone_wall: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="1" />
      <path d="M3 11.5h18" />
      <path d="M3 16h18" />
      <path d="M12 7v4.5" />
    </>
  ),
  makeshift_wall: (
    <>
      <path d="M3 9h18v5H3Z" />
      <path d="M5 14l-1 7" />
      <path d="M19 14l1 7" />
      <path d="M8 9l8 5" />
    </>
  ),
}

/** 四種資源田的顏色（設計師：木 amber-700、土 orange-600、鐵 slate-500、糧 yellow-600）；建築一律跟文字同色 */
export const FIELD_TONE: Readonly<Record<string, string>> = {
  woodcutter: 'text-amber-700',
  clay_pit: 'text-orange-600',
  iron_mine: 'text-slate-500',
  cropland: 'text-yellow-600',
}

const ALIASES: Record<string, string> = {
  // 資源類型、貼上解析用的田地 id
  wood: 'woodcutter', clay: 'clay_pit', iron: 'iron_mine', crop: 'cropland',
  wood_field: 'woodcutter', clay_field: 'clay_pit', iron_field: 'iron_mine', crop_field: 'cropland',
  // 舊名、英文別名
  smithy: 'blacksmith', armoury: 'blacksmith', armory: 'blacksmith',
}

const byGid = new Map<number, string>()
for (const [id, b] of Object.entries(INGAME_BUILDINGS)) byGid.set(b.gid, id)

const byName = new Map<string, string>()
for (const [id, b] of Object.entries(INGAME_BUILDINGS)) {
  byName.set(b.zh, id)
  for (const a of b.aliases) byName.set(a, id)
}

/**
 * 各種寫法 → 建築 id：buildings.json 的 id、'building_15'（遊戲 gid）、'wood_field'、'wood'、
 * 遊戲內中文名（含舊名）。認不得回 null（畫面就不放圖示）。
 */
export function resolveBuildingIconId(key: string | null | undefined): string | null {
  if (!key) return null
  if (key in BUILDING_ICONS) return key
  const alias = ALIASES[key]
  if (alias) return alias
  const m = /^building_(\d+)$/.exec(key)
  if (m) return byGid.get(Number(m[1])) ?? null
  return byName.get(key.trim()) ?? null
}

/** 開局清單那種「所有伐木場」「一塊農場」：去掉前面的量詞再找 */
export function resolveBuildingIconIdFromText(text: string | null | undefined): string | null {
  if (!text) return null
  const direct = resolveBuildingIconId(text)
  if (direct) return direct
  const stripped = text.replace(/^(所有|一塊|全部)/, '')
  return resolveBuildingIconId(stripped)
}
