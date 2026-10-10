/**
 * Travian Legends T4.6 — Canonical Data Module
 *
 * Building costs / times / CP and village CP thresholds come from
 * src/data/gameData.gen.json (scripts/game_data/gen_game_data.py) — the same
 * generated numbers the backend serves, so every page shows one set of values.
 * All values are for 1x server speed unless noted.
 *
 * Checked against: ts11 measurements (review/realtest/tool-verification.md),
 * support.travian.com (official rules), Lumi/Eggstra/Dave guide (ROI tables).
 * External calculators were only used to compare output, not copied.
 */

import {
  buildingRows, CP_BASE_BY_ID, villageRequirements, celebration, celebrationCap,
} from '../../../data/gameData';

export type ResourceType = 'wood' | 'clay' | 'iron' | 'crop';
export type CropperId = '15c' | '9c' | '7c' | '6c';

export interface FieldCostRow {
  level: number;
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

// =========================================================================
// Resource field production per hour, L0–L21 (1x speed)
// Formula: prod(L) = round(base_T35(L) * 1.4), same for all 4 field types
// =========================================================================
export const FIELD_PRODUCTION: readonly number[] = Object.freeze([
  3,    // L0
  7,    // L1
  13,   // L2
  21,   // L3
  31,   // L4
  46,   // L5
  70,   // L6
  98,   // L7
  140,  // L8
  203,  // L9
  280,  // L10  (normal village cap)
  392,  // L11
  525,  // L12
  693,  // L13
  889,  // L14
  1120, // L15
  1400, // L16
  1820, // L17
  2240, // L18
  2800, // L19
  3430, // L20  (capital cap for wood/clay/iron)
  4270, // L21  (crop-only bonus level)
]);

// =========================================================================
// Field upgrade costs (per-level, NOT cumulative)
// Cost(L) = round5(base × 1.67^(L-1)) per resource — generated data
// =========================================================================
function _fieldCostTable(buildingId: string): FieldCostRow[] {
  return buildingRows(buildingId).map(r => ({
    level: r.level, wood: r.wood, clay: r.clay, iron: r.iron, crop: r.crop,
  }));
}

export const FIELD_COSTS: Record<ResourceType, readonly FieldCostRow[]> = {
  wood: Object.freeze(_fieldCostTable('woodcutter')),
  clay: Object.freeze(_fieldCostTable('clay_pit')),
  iron: Object.freeze(_fieldCostTable('iron_mine')),
  crop: Object.freeze(_fieldCostTable('cropland')),
};

export function fieldTotalCost(type: ResourceType, level: number): number {
  const row = FIELD_COSTS[type][level - 1];
  if (!row) return 0;
  return row.wood + row.clay + row.iron + row.crop;
}

// =========================================================================
// Bonus buildings: +5%/level, linear, max L5 (+25%)
// Mill + Bakery stack additively → +50% crop max
// =========================================================================
export const BONUS_BUILDINGS = {
  sawmill:     { resource: 'wood' as const, perLevel: 0.05, maxLevel: 5, requires: 'Woodcutter L10, MB L5' },
  brickyard:   { resource: 'clay' as const, perLevel: 0.05, maxLevel: 5, requires: 'Clay Pit L10, MB L5' },
  ironFoundry: { resource: 'iron' as const, perLevel: 0.05, maxLevel: 5, requires: 'Iron Mine L10, MB L5' },
  grainMill:   { resource: 'crop' as const, perLevel: 0.05, maxLevel: 5, requires: 'Cropland L5, MB L5' },
  bakery:      { resource: 'crop' as const, perLevel: 0.05, maxLevel: 5, requires: 'Cropland L10, Grain Mill L5' },
} as const;

const BB_ID: Record<keyof typeof BONUS_BUILDINGS, string> = {
  sawmill: 'sawmill', brickyard: 'brickyard', ironFoundry: 'iron_foundry',
  grainMill: 'grain_mill', bakery: 'bakery',
};

// Bonus-building L1 base cost (scales by 1.80^(L-1)) — generated data
export const BB_BASE_COST: Record<keyof typeof BONUS_BUILDINGS, { wood: number; clay: number; iron: number; crop: number }> =
  Object.fromEntries((Object.keys(BB_ID) as (keyof typeof BONUS_BUILDINGS)[]).map(bb => {
    const r = buildingRows(BB_ID[bb])[0]!;
    return [bb, { wood: r.wood, clay: r.clay, iron: r.iron, crop: r.crop }];
  })) as Record<keyof typeof BONUS_BUILDINGS, { wood: number; clay: number; iron: number; crop: number }>;

export function bbCost(bb: keyof typeof BONUS_BUILDINGS, lv: number): FieldCostRow {
  const r = buildingRows(BB_ID[bb])[lv - 1];
  if (r) return { level: lv, wood: r.wood, clay: r.clay, iron: r.iron, crop: r.crop };
  const b = BB_BASE_COST[bb];
  const m = Math.pow(1.80, lv - 1);
  return {
    level: lv,
    wood: Math.round((b.wood * m) / 5) * 5,
    clay: Math.round((b.clay * m) / 5) * 5,
    iron: Math.round((b.iron * m) / 5) * 5,
    crop: Math.round((b.crop * m) / 5) * 5,
  };
}

export function bbTotalCost(bb: keyof typeof BONUS_BUILDINGS, lv: number): number {
  const c = bbCost(bb, lv);
  return c.wood + c.clay + c.iron + c.crop;
}

// =========================================================================
// Culture Points: CP(L) = round(base × 1.2^L)
// =========================================================================
export type CpBuilding =
  | 'mainBuilding' | 'marketplace' | 'embassy' | 'academy' | 'townHall'
  | 'residence' | 'palace' | 'treasury' | 'tradeOffice' | 'smithy' | 'armoury'
  | 'stable' | 'greatStable' | 'barracks' | 'greatBarracks' | 'workshop'
  | 'warehouse' | 'granary' | 'greatWarehouse' | 'greatGranary'
  | 'tournamentSquare' | 'heroMansion' | 'cranny' | 'trapper' | 'rallyPoint'
  | 'stonemason' | 'brewery' | 'horseDrinkingTrough'
  | 'cityWall' | 'earthWall' | 'palisade' | 'stoneWall' | 'makeshiftWall' | 'barricade'
  | 'woodcutter' | 'clayPit' | 'ironMine' | 'cropland'
  | 'sawmill' | 'brickyard' | 'ironFoundry' | 'grainMill' | 'bakery';

// camelCase key → building_id in the generated data
const CP_ID: Partial<Record<CpBuilding, string>> = {
  mainBuilding: 'main_building', marketplace: 'marketplace', embassy: 'embassy',
  academy: 'academy', townHall: 'town_hall', residence: 'residence', palace: 'palace',
  treasury: 'treasury', tradeOffice: 'trade_office', smithy: 'blacksmith', armoury: 'armoury',
  stable: 'stable', greatStable: 'great_stable', barracks: 'barracks',
  greatBarracks: 'great_barracks', workshop: 'workshop', warehouse: 'warehouse',
  granary: 'granary', greatWarehouse: 'great_warehouse', greatGranary: 'great_granary',
  tournamentSquare: 'tournament_square', heroMansion: 'heros_mansion', cranny: 'cranny',
  trapper: 'trapper', rallyPoint: 'rally_point', stonemason: 'stonemasons_lodge',
  brewery: 'brewery', horseDrinkingTrough: 'horse_drinking_trough',
  cityWall: 'city_wall', earthWall: 'earth_wall', palisade: 'palisade',
  woodcutter: 'woodcutter', clayPit: 'clay_pit', ironMine: 'iron_mine', cropland: 'cropland',
  sawmill: 'sawmill', brickyard: 'brickyard', ironFoundry: 'iron_foundry',
  grainMill: 'grain_mill', bakery: 'bakery',
};

const ALL_CP_BUILDINGS: CpBuilding[] = [
  'mainBuilding', 'marketplace', 'embassy', 'academy', 'townHall', 'residence', 'palace',
  'treasury', 'tradeOffice', 'smithy', 'armoury', 'stable', 'greatStable', 'barracks',
  'greatBarracks', 'workshop', 'warehouse', 'granary', 'greatWarehouse', 'greatGranary',
  'tournamentSquare', 'heroMansion', 'cranny', 'trapper', 'rallyPoint', 'stonemason',
  'brewery', 'horseDrinkingTrough', 'cityWall', 'earthWall', 'palisade', 'stoneWall',
  'makeshiftWall', 'barricade', 'woodcutter', 'clayPit', 'ironMine', 'cropland',
  'sawmill', 'brickyard', 'ironFoundry', 'grainMill', 'bakery',
];

// Walls not in the app's building list (stone / makeshift wall, barricade) are CP base 1.
export const CP_BASE: Record<CpBuilding, number> = Object.fromEntries(
  ALL_CP_BUILDINGS.map(b => [b, CP_ID[b] ? (CP_BASE_BY_ID[CP_ID[b]!] ?? 1) : 1]),
) as Record<CpBuilding, number>;

export function cpAtLevel(building: CpBuilding, level: number): number {
  const base = CP_BASE[building];
  if (base == null || level <= 0) return 0;
  return Math.round(base * Math.pow(1.2, level));
}

export function cpSum(building: CpBuilding, minLevel: number, maxLevel: number): number {
  let sum = 0;
  for (let L = minLevel; L <= maxLevel; L++) sum += cpAtLevel(building, L);
  return sum;
}

// =========================================================================
// Culture Points required to settle village N
// =========================================================================
// Source: support.travian.com/en/articles/51-culture-points-cp (official table;
// our formula round(1600 / speed × (N−1)^2.3) reproduces every cell). x1 here;
// other speeds via villageRequirements(speed) in src/data/gameData.ts.
// Only village 2 (2,000) has been confirmed in ts11 — UI marks the rest 待驗證.
const _X1 = villageRequirements(1);
export const CP_REQUIRED: ReadonlyArray<{ village: number; delta: number; cumulative: number }> = Object.freeze(
  _X1.slice(0, 10).map((cumulative, i) => ({
    village: i + 1,
    delta: i === 0 ? 0 : cumulative - _X1[i - 1]!,
    cumulative,
  })),
);

// =========================================================================
// Oasis types
// =========================================================================
export interface OasisType {
  id: string;
  label: { zh: string; en: string };
  bonuses: Partial<Record<ResourceType, number>>;
}

export const OASIS_TYPES: readonly OasisType[] = Object.freeze([
  { id: 'single25_wood', label: { zh: '木 +25%', en: 'Wood +25%' }, bonuses: { wood: 0.25 } },
  { id: 'single25_clay', label: { zh: '土 +25%', en: 'Clay +25%' }, bonuses: { clay: 0.25 } },
  { id: 'single25_iron', label: { zh: '鐵 +25%', en: 'Iron +25%' }, bonuses: { iron: 0.25 } },
  { id: 'single25_crop', label: { zh: '糧 +25%', en: 'Crop +25%' }, bonuses: { crop: 0.25 } },
  { id: 'dual25_wood_crop', label: { zh: '木 +25% / 糧 +25%', en: 'Wood +25% / Crop +25%' }, bonuses: { wood: 0.25, crop: 0.25 } },
  { id: 'dual25_clay_crop', label: { zh: '土 +25% / 糧 +25%', en: 'Clay +25% / Crop +25%' }, bonuses: { clay: 0.25, crop: 0.25 } },
  { id: 'dual25_iron_crop', label: { zh: '鐵 +25% / 糧 +25%', en: 'Iron +25% / Crop +25%' }, bonuses: { iron: 0.25, crop: 0.25 } },
  { id: 'single50_wood', label: { zh: '木 +50%', en: 'Wood +50%' }, bonuses: { wood: 0.50 } },
  { id: 'single50_clay', label: { zh: '土 +50%', en: 'Clay +50%' }, bonuses: { clay: 0.50 } },
  { id: 'single50_iron', label: { zh: '鐵 +50%', en: 'Iron +50%' }, bonuses: { iron: 0.50 } },
  { id: 'single50_crop', label: { zh: '糧 +50%', en: 'Crop +50%' }, bonuses: { crop: 0.50 } },
]);

// =========================================================================
// Hero's Mansion oasis unlocks + cumulative build cost
//
// T4 cost: L1 80/120/70/90 (total 360), ×1.33 per level, round5 per level.
//
// Note: Lumi Table 3 ROI values (e.g. 15c HM10 50%-crop = 1.83 days) were
// derived against an earlier HM cost table ~5× higher than modern T4.
// With the correct modern cost, 15c HM10 50%-crop ROI is ~0.37 days —
// meaning modern T4 makes capturing oases FAR more attractive than the
// numbers in the published Lumi guide suggest.
// =========================================================================
// Hero's Mansion cumulative cost — generated data (T4: 80/120/70/90 × 1.33^(L-1)).
// 待驗證: not yet seen on a ts11 building page.
export function hmCumulativeCost(level: number): number {
  if (level <= 0) return 0;
  return buildingRows('heros_mansion')
    .slice(0, level)
    .reduce((sum, r) => sum + r.wood + r.clay + r.iron + r.crop, 0);
}

export const HERO_MANSION = {
  oasesUnlocked: { 10: 1, 15: 2, 20: 3 } as Record<number, number>,
  cumulativeCost: Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => [i + 1, hmCumulativeCost(i + 1)]),
  ) as Record<number, number>,
};

// =========================================================================
// Cropper layouts
// =========================================================================
export interface CropperLayout {
  id: CropperId;
  name: { zh: string; en: string };
  wood: number; clay: number; iron: number; crop: number;
  note: { zh: string; en: string };
}

export const CROPPER_LAYOUTS: readonly CropperLayout[] = Object.freeze([
  { id: '15c', name: { zh: '15 糧田 (1-1-1-15)', en: '15-cropper (1-1-1-15)' },
    wood: 1, clay: 1, iron: 1, crop: 15,
    note: { zh: '超大首都；錘子村必選。糧食壓倒性，木土鐵需靠商路補。',
            en: 'Super-capital / premier hammer village. Overwhelming crop, relies on feeder wood/clay/iron.' } },
  { id: '9c', name: { zh: '9 糧田 (3-3-3-9)', en: '9-cropper (3-3-3-9)' },
    wood: 3, clay: 3, iron: 3, crop: 9,
    note: { zh: '防守型首都、錘鐵村；自給自足較佳。',
            en: 'Defensive capital / anvil. More self-sufficient.' } },
  { id: '7c', name: { zh: '7 糧田 (3-4-4-7)', en: '7-cropper (3-4-4-7)' },
    wood: 3, clay: 4, iron: 4, crop: 7,
    note: { zh: '常見的平衡型 7c；資源均衡。',
            en: 'Classic balanced 7-cropper.' } },
  { id: '6c', name: { zh: '6 糧田 (4-4-4-6)', en: '6-cropper (4-4-4-6)' },
    wood: 4, clay: 4, iron: 4, crop: 6,
    note: { zh: '標準出生村；不建議當大錘子首都，糧食不足。',
            en: 'Standard spawn tile. Not recommended as a hammer capital (crop-limited).' } },
]);

// =========================================================================
// Merchants / Trade Office
//
// Trade Office bonus is **tribe-dependent**:
//   - Romans: +20%/level (max +400% / 5× at Lv 20)
//   - Other tribes: +10%/level (max +200% / 3× at Lv 20)
// (Per travian.fandom.com/wiki/Trade_office and Travian Answers aid 48.)
// =========================================================================
export type TribeId = 'romans' | 'teutons' | 'gauls' | 'egyptians' | 'huns' | 'spartans' | 'vikings';

export const MERCHANTS: Record<TribeId, { capacity: number; speed: number }> = {
  romans:    { capacity: 500,  speed: 16 },
  teutons:   { capacity: 1000, speed: 12 },
  gauls:     { capacity: 750,  speed: 24 },
  egyptians: { capacity: 750,  speed: 16 },
  huns:      { capacity: 750,  speed: 20 },
  spartans:  { capacity: 500,  speed: 14 },
  vikings:   { capacity: 750,  speed: 18 },
};

export const TRADE_OFFICE_PER_LEVEL_DEFAULT = 0.10; // +10%/level (most tribes)
export const TRADE_OFFICE_PER_LEVEL_ROMAN = 0.20;   // Roman exception: +20%/level

export function tradeOfficePerLevel(tribe: TribeId): number {
  return tribe === 'romans' ? TRADE_OFFICE_PER_LEVEL_ROMAN : TRADE_OFFICE_PER_LEVEL_DEFAULT;
}

export function merchantCapacity(tribe: TribeId, tradeOfficeLevel: number): number {
  const base = MERCHANTS[tribe]?.capacity ?? 500;
  const lv = Math.max(0, Math.min(20, Math.floor(tradeOfficeLevel)));
  return Math.round(base * (1 + lv * tradeOfficePerLevel(tribe)));
}

// Backwards-compat re-export (some callers may still want a constant)
export const TRADE_OFFICE_PER_LEVEL = TRADE_OFFICE_PER_LEVEL_DEFAULT;

// =========================================================================
// Town Hall Celebrations (1x speed)
// =========================================================================
// CP gained = daily CP production (small: that village, great: whole account),
// capped by world speed (x1: 500 / 2,000). `cp` below is the x1 cap, NOT a fixed
// reward — use celebrationCp() from src/data/gameData.ts.
// Costs: small crop 1,340 and the great costs are 待驗證 (ts11 has no Town Hall yet).
const _small = celebration('small');
const _great = celebration('great');
export const CELEBRATIONS = {
  small: {
    name: { zh: '小型慶典', en: 'Small Celebration' },
    minTownHall: _small.minTownHall, cp: celebrationCap('small', 1), hours: 24,
    cost: { wood: _small.cost[0], clay: _small.cost[1], iron: _small.cost[2], crop: _small.cost[3] },
  },
  great: {
    name: { zh: '大型慶典', en: 'Great Celebration' },
    minTownHall: _great.minTownHall, cp: celebrationCap('great', 1), hours: 60,
    cost: { wood: _great.cost[0], clay: _great.cost[1], iron: _great.cost[2], crop: _great.cost[3] },
  },
} as const;

// =========================================================================
// Main Building speed-up + Field build times
// =========================================================================
export function mbMultiplier(level: number): number {
  return Math.pow(0.964, Math.max(0, level - 1));
}

const FIELD_ID: Record<ResourceType, string> = {
  wood: 'woodcutter', clay: 'clay_pit', iron: 'iron_mine', crop: 'cropland',
};

const FIELD_TIME_BASE: Record<ResourceType, number> = {
  wood: 1780 / 3, clay: 1660 / 3, iron: 2350 / 3, crop: 1450 / 3,
};

// Base seconds come from the generated data (a × 1.6^(L−1) − 1000/3); the
// formula is only a fallback for levels outside the table (e.g. crop L21).
export function fieldBuildTime(type: ResourceType, level: number, mbLevel = 1): number {
  const row = buildingRows(FIELD_ID[type])[level - 1];
  const baseSec = row
    ? row.buildTimeBase
    : Math.max(0, FIELD_TIME_BASE[type] * Math.pow(1.6, level - 1) - 1000 / 3);
  return baseSec * mbMultiplier(mbLevel);
}

/** 加成建築（鋸木廠等）升到 level 的建造秒數（產生檔的基礎秒數 × 村莊大樓加速，x1） */
export function bbBuildTime(bb: keyof typeof BONUS_BUILDINGS, level: number, mbLevel = 1): number {
  const row = buildingRows(BB_ID[bb])[level - 1];
  return row ? row.buildTimeBase * mbMultiplier(mbLevel) : 0;
}

export function formatDuration(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '—';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m && d === 0) parts.push(`${m}m`);
  return parts.join(' ') || `${Math.floor(sec)}s`;
}

// =========================================================================
// ROI helpers — calibrated to Lumi Table 2
// Lumi convention: L1 compared against 0 production, L2+ compared against
// prev level. Multipliers stack additively: (1 + bb + oasis + gold).
// =========================================================================
export interface FieldRoiOpts {
  goldBonus?: number;        // 0 or 0.25 (Plus)
  bonusBuildingPct?: number; // 0, 0.05, ..., 0.50 for crop
  oasisPct?: number;         // 0..1.5
}

export interface FieldRoi {
  cost: number;
  deltaBase: number;
  productionGainPerHour: number;
  productionGainPerDay: number;
  roiDays: number;
}

export function fieldRoi(
  type: ResourceType,
  targetLevel: number,
  opts: FieldRoiOpts = {},
): FieldRoi {
  const goldBonus = opts.goldBonus ?? 0.25;
  const bonusBuildingPct = opts.bonusBuildingPct ?? 0;
  const oasisPct = opts.oasisPct ?? 0;

  const cost = fieldTotalCost(type, targetLevel);
  const prodAtL = FIELD_PRODUCTION[targetLevel] ?? 0;
  const prodAtPrev = targetLevel === 1 ? 0 : (FIELD_PRODUCTION[targetLevel - 1] ?? 0);
  const delta = prodAtL - prodAtPrev;
  const multiplier = 1 + bonusBuildingPct + oasisPct + goldBonus;
  const perHour = delta * multiplier;
  const perDay = perHour * 24;
  return {
    cost, deltaBase: delta,
    productionGainPerHour: perHour,
    productionGainPerDay: perDay,
    roiDays: perDay > 0 ? cost / perDay : Infinity,
  };
}

export function fieldProduction(
  _type: ResourceType,
  level: number,
  opts: FieldRoiOpts = {},
): number {
  const goldBonus = opts.goldBonus ?? 0;
  const bonusBuildingPct = opts.bonusBuildingPct ?? 0;
  const oasisPct = opts.oasisPct ?? 0;
  const base = FIELD_PRODUCTION[level] ?? 0;
  return base * (1 + bonusBuildingPct + oasisPct + goldBonus);
}
