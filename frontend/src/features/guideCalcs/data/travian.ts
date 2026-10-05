/**
 * Travian Legends T4.6 — Canonical Data Module
 *
 * Single source of truth for all calculators.
 * All values are for 1x server speed unless noted.
 *
 * Verified against:
 *   - kirilloid/travian source (authoritative game formulas)
 *   - support.travian.com / travian.fandom.com (public documentation)
 *   - Lumi/Eggstra/Dave advanced guide (ROI Tables 2 & 3)
 */

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
// Cost(L) = round5(base × 1.67^(L-1)) per resource
// =========================================================================
function _fieldCostTable(
  baseW: number, baseC: number, baseI: number, baseCr: number,
): FieldCostRow[] {
  const rows: FieldCostRow[] = [];
  for (let L = 1; L <= 20; L++) {
    const mult = Math.pow(1.67, L - 1);
    rows.push({
      level: L,
      wood: Math.round((baseW * mult) / 5) * 5,
      clay: Math.round((baseC * mult) / 5) * 5,
      iron: Math.round((baseI * mult) / 5) * 5,
      crop: Math.round((baseCr * mult) / 5) * 5,
    });
  }
  return rows;
}

export const FIELD_COSTS: Record<ResourceType, readonly FieldCostRow[]> = {
  wood: Object.freeze(_fieldCostTable(40, 100, 50, 60)),
  clay: Object.freeze(_fieldCostTable(80, 40, 80, 50)),
  iron: Object.freeze(_fieldCostTable(100, 80, 30, 60)),
  crop: Object.freeze(_fieldCostTable(70, 90, 70, 20)),
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

// Bonus-building L1 base cost (scales by 1.80^(L-1))
export const BB_BASE_COST: Record<keyof typeof BONUS_BUILDINGS, { wood: number; clay: number; iron: number; crop: number }> = {
  sawmill:     { wood: 520,  clay: 380,  iron: 290,  crop: 90 },
  brickyard:   { wood: 440,  clay: 480,  iron: 320,  crop: 50 },
  ironFoundry: { wood: 200,  clay: 450,  iron: 510,  crop: 120 },
  grainMill:   { wood: 500,  clay: 440,  iron: 380,  crop: 1240 },
  bakery:      { wood: 1200, clay: 1480, iron: 870,  crop: 1600 },
};

export function bbCost(bb: keyof typeof BONUS_BUILDINGS, lv: number): FieldCostRow {
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

export const CP_BASE: Record<CpBuilding, number> = {
  // base 1
  warehouse: 1, granary: 1, cranny: 1, barracks: 1, tournamentSquare: 1,
  heroMansion: 1, greatBarracks: 1, greatWarehouse: 1, greatGranary: 1,
  stonemason: 1, rallyPoint: 1, trapper: 1,
  cityWall: 1, earthWall: 1, palisade: 1, stoneWall: 1, makeshiftWall: 1, barricade: 1,
  woodcutter: 1, clayPit: 1, ironMine: 1, cropland: 1,
  sawmill: 1, brickyard: 1, ironFoundry: 1, grainMill: 1, bakery: 1,
  // base 2
  mainBuilding: 2, residence: 2, smithy: 2, armoury: 2, stable: 2, greatStable: 2,
  // base 3
  marketplace: 3, workshop: 3, tradeOffice: 3, horseDrinkingTrough: 3,
  // base 4
  embassy: 4, academy: 4, brewery: 4,
  // base 5
  townHall: 5, palace: 5,
  // base 6
  treasury: 6,
};

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
// Source: support.travian.com/en/support/solutions/articles/7000065115-culture-points-cp-
// x1 speed. Verified 2026-04-23. Delta = cumulative[N] - cumulative[N-1].
export const CP_REQUIRED: ReadonlyArray<{ village: number; delta: number; cumulative: number }> = Object.freeze([
  { village: 1,  delta: 0,      cumulative: 0 },
  { village: 2,  delta: 2000,   cumulative: 2000 },
  { village: 3,  delta: 6000,   cumulative: 8000 },
  { village: 4,  delta: 12000,  cumulative: 20000 },
  { village: 5,  delta: 19000,  cumulative: 39000 },
  { village: 6,  delta: 26000,  cumulative: 65000 },
  { village: 7,  delta: 34000,  cumulative: 99000 },
  { village: 8,  delta: 42000,  cumulative: 141000 },
  { village: 9,  delta: 50000,  cumulative: 191000 },
  { village: 10, delta: 60000,  cumulative: 251000 },
]);

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
// T4 override per kirilloid src/model/t4/buildings.ts:
//   [ID.HERO_MANSION]: { c: [80, 120, 70, 90] }  → L1 total = 360
//   Inherits k = 1.33 from T3 base (src/model/t3/buildings.ts)
//
// Cumulative(L) = base × (k^L − 1) / (k − 1) = 360 × (1.33^L − 1) / 0.33
//
// Note: Lumi Table 3 ROI values (e.g. 15c HM10 50%-crop = 1.83 days) were
// derived against an earlier HM cost table ~5× higher than modern T4.
// With the correct modern cost, 15c HM10 50%-crop ROI is ~0.37 days —
// meaning modern T4 makes capturing oases FAR more attractive than the
// numbers in the published Lumi guide suggest.
// =========================================================================
// Hero's Mansion cumulative cost (T4 formula, kirilloid-verified)
// Base L1 cost per resource: [80, 120, 70, 90] with k=1.33 geometric scaling, round5 per-level.
export function hmCumulativeCost(level: number): number {
  if (level <= 0) return 0;
  const base = [80, 120, 70, 90];
  const k = 1.33;
  let sum = 0;
  for (let L = 1; L <= level; L++) {
    const m = Math.pow(k, L - 1);
    for (const b of base) sum += Math.round((b * m) / 5) * 5;
  }
  return sum;
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
export const CELEBRATIONS = {
  small: {
    name: { zh: '小型慶典', en: 'Small Celebration' },
    minTownHall: 1, cp: 500, hours: 24,
    cost: { wood: 6400, clay: 6650, iron: 5940, crop: 500 },
  },
  great: {
    name: { zh: '大型慶典', en: 'Great Celebration' },
    minTownHall: 10, cp: 2000, hours: 60,
    cost: { wood: 29700, clay: 33250, iron: 32000, crop: 6700 },
  },
} as const;

// =========================================================================
// Main Building speed-up + Field build times
// =========================================================================
export function mbMultiplier(level: number): number {
  return Math.pow(0.964, Math.max(0, level - 1));
}

const FIELD_TIME_BASE: Record<ResourceType, number> = {
  wood: 1780 / 3, clay: 1660 / 3, iron: 2350 / 3, crop: 1450 / 3,
};

export function fieldBuildTime(type: ResourceType, level: number, mbLevel = 1): number {
  const a = FIELD_TIME_BASE[type];
  const baseSec = Math.max(0, a * Math.pow(1.6, level - 1) - 1000 / 3);
  return baseSec * mbMultiplier(mbLevel);
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
