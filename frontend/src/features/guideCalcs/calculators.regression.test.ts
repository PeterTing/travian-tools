import { describe, it, expect } from 'vitest';
import {
  fieldRoi,
  fieldTotalCost,
  hmCumulativeCost,
  cpAtLevel,
  FIELD_PRODUCTION,
  OASIS_TYPES,
  CROPPER_LAYOUTS,
  type ResourceType,
} from './data/travian';
import { lumiBracket } from './components/FarmingCalculator';
import { PRESET_LUMI_CP } from './components/PassiveCpCalculator';

// =========================================================================
// FieldRoiCalculator — fieldRoi() reference cases
//
// The canonical Lumi Table 2 anchor (per FieldRoiCalculator.tsx comment):
//   "Wood L7 = 6.46 days exact match" — bb=0, oasis=0, gold=0.25.
//
// Remaining test cases pin CURRENT calculator output so any drift trips CI.
// These snapshots are derived from the fieldRoi formula on 2026-04-23 and
// serve as regression anchors, not independent truth.
// =========================================================================
describe('FieldRoiCalculator.fieldRoi — Lumi Table 2 anchor + regression snapshots', () => {
  it('Wood L7 (bb=0, oasis=0, gold=0.25) = 6.46 days [Lumi Table 2 canonical]', () => {
    const r = fieldRoi('wood', 7, { goldBonus: 0.25, bonusBuildingPct: 0, oasisPct: 0 });
    expect(r.roiDays).toBeCloseTo(6.46, 1); // within 0.1 day
  });

  it('Wood L7 (bb=0.25, oasis=0, gold=0.25) = 5.17 days (Plus multiplies the total, S129)', () => {
    const r = fieldRoi('wood', 7, { goldBonus: 0.25, bonusBuildingPct: 0.25, oasisPct: 0 });
    expect(r.roiDays).toBeCloseTo(5.17, 1);
  });

  it('Iron L10 (bb=0.25, oasis=0.75, gold=0.25) = 5.90 days (Plus multiplies the total, S129)', () => {
    const r = fieldRoi('iron', 10, { goldBonus: 0.25, bonusBuildingPct: 0.25, oasisPct: 0.75 });
    expect(r.roiDays).toBeCloseTo(5.90, 1);
  });

  it('Iron L10 (bb=0, oasis=0, gold=0.25) = 11.81 days', () => {
    const r = fieldRoi('iron', 10, { goldBonus: 0.25, bonusBuildingPct: 0, oasisPct: 0 });
    expect(r.roiDays).toBeCloseTo(11.81, 1);
  });

  it('Crop L8 (bb=0.50, oasis=0, gold=0.25) = 4.79 days [max crop bonus; Plus multiplies the total, S129]', () => {
    const r = fieldRoi('crop', 8, { goldBonus: 0.25, bonusBuildingPct: 0.50, oasisPct: 0 });
    expect(r.roiDays).toBeCloseTo(4.79, 1);
  });

  it('Crop L8 (bb=0, oasis=0, gold=0.25) = 7.19 days', () => {
    const r = fieldRoi('crop', 8, { goldBonus: 0.25, bonusBuildingPct: 0, oasisPct: 0 });
    expect(r.roiDays).toBeCloseTo(7.19, 1);
  });

  it('Clay L5 (bb=0, oasis=0, gold=0.25) = 4.31 days [low-level fast ROI]', () => {
    const r = fieldRoi('clay', 5, { goldBonus: 0.25, bonusBuildingPct: 0, oasisPct: 0 });
    expect(r.roiDays).toBeCloseTo(4.31, 1);
  });

  it('Wood L1 (no bonuses) — L0 already makes 3/hr, so L1 gains 4 (P0-18, ts11)', () => {
    const r = fieldRoi('wood', 1, { goldBonus: 0, bonusBuildingPct: 0, oasisPct: 0 });
    // L0 = 3/hr, L1 = 7/hr (ts11). cost = 250. 4*24 = 96/day. 250/96 ≈ 2.604
    expect(r.deltaBase).toBe(4);
    expect(r.cost).toBe(250);
    expect(r.roiDays).toBeCloseTo(2.604, 2);
  });

  it('No production gain → ROI is Infinity', () => {
    // No bonuses, level 0 would yield no gain — use out-of-range level to force zero delta
    const r = fieldRoi('wood', 22, { goldBonus: 0 });
    expect(r.roiDays).toBe(Infinity);
  });

  it('bonus buildings and oasis add up on the base; Plus multiplies the total (official S129, P0-23)', () => {
    // Base delta for crop L10 = 280 - 203 = 77
    const r = fieldRoi('crop', 10, { goldBonus: 0.25, bonusBuildingPct: 0.50, oasisPct: 1.50 });
    // multiplier = (1 + 0.50 + 1.50) × 1.25 = 3.75 (the old additive 3.25 was wrong)
    expect(r.productionGainPerHour).toBeCloseTo(77 * 3.75, 0);
  });
});

// =========================================================================
// Field cost regression (used throughout calculators)
// =========================================================================
describe('fieldTotalCost — reference costs', () => {
  it('wood L7 total cost = 5425', () => {
    expect(fieldTotalCost('wood', 7)).toBe(5425);
  });
  it('iron L10 total cost = 27275', () => {
    expect(fieldTotalCost('iron', 10)).toBe(27275);
  });
  it('crop L8 total cost = 9055', () => {
    expect(fieldTotalCost('crop', 8)).toBe(9055);
  });
  it('out-of-range level returns 0', () => {
    expect(fieldTotalCost('wood', 99)).toBe(0);
  });
});

// =========================================================================
// OasisRoiCalculator — hmCumulativeCost + the production × oasis math
// verified against the component formula in OasisRoiCalculator.tsx.
//
// HM cost regression: L20 must be 326110, NOT 249170 (the pre-fix buggy
// value). Anything 249k-ish means the earlier off-by-level bug regressed.
// =========================================================================
describe('OasisRoi — Hero\'s Mansion cumulative cost (T4 formula)', () => {
  it('hmCumulativeCost(0) = 0', () => {
    expect(hmCumulativeCost(0)).toBe(0);
  });
  it('hmCumulativeCost(1) = 2310 (L1 700/670/700/240 read on ts11 manual/building/37)', () => {
    expect(hmCumulativeCost(1)).toBe(2310);
  });
  it('hmCumulativeCost(10) = 114240 [+1 oasis unlock; ×1.33 per level still 待驗證]', () => {
    expect(hmCumulativeCost(10)).toBe(114240);
  });
  it('hmCumulativeCost(15) = 497535 [+2 oases unlock]', () => {
    expect(hmCumulativeCost(15)).toBe(497535);
  });
  it('hmCumulativeCost(20) = 2092605 [+3 oases]', () => {
    expect(hmCumulativeCost(20)).toBe(2092605);
  });
});

describe('OasisRoi — component math reproduction (prod × oasis × 24 × gold)', () => {
  // Mirrors the useMemo in OasisRoiCalculator.tsx exactly.
  function oasisDailyGain(cropperId: string, fieldLv: number, oasisId: string, gold: boolean): number {
    const layout = CROPPER_LAYOUTS.find(l => l.id === cropperId)!;
    const base = FIELD_PRODUCTION[fieldLv];
    const oasis = OASIS_TYPES.find(o => o.id === oasisId);
    if (!base || !oasis) return 0;
    const counts: Record<ResourceType, number> = {
      wood: layout.wood, clay: layout.clay, iron: layout.iron, crop: layout.crop,
    };
    let total = 0;
    Object.entries(oasis.bonuses).forEach(([k, v]) => {
      total += counts[k as ResourceType] * base * (v ?? 0);
    });
    return total * 24 * (gold ? 1.25 : 1);
  }

  it('15c + Lv 10 fields + 50% crop oasis + gold = 63,000/day', () => {
    // 15 crop fields × 280/hr × 0.50 × 24 × 1.25 = 63000
    expect(oasisDailyGain('15c', 10, 'single50_crop', true)).toBeCloseTo(63000, 0);
  });

  it('15c + Lv 10 fields + 50% crop oasis, no gold = 50,400/day', () => {
    expect(oasisDailyGain('15c', 10, 'single50_crop', false)).toBeCloseTo(50400, 0);
  });

  it('ROI (HM Lv 10 / daily gain): 114240 / 63000 ≈ 1.81 days for 15c + 50% crop oasis + gold', () => {
    const daily = oasisDailyGain('15c', 10, 'single50_crop', true);
    const roi = hmCumulativeCost(10) / daily;
    expect(roi).toBeCloseTo(1.81, 1);
  });

  it('7c + Lv 10 + dual 25% wood/crop oasis + gold = (3×280×0.25 + 7×280×0.25) × 24 × 1.25', () => {
    // counts: wood=3, crop=7. bonuses: wood 0.25, crop 0.25. Base=280 at L10.
    // (3*280*0.25 + 7*280*0.25) * 24 * 1.25 = 21000
    expect(oasisDailyGain('7c', 10, 'dual25_wood_crop', true)).toBeCloseTo(21000, 0);
  });
});

// =========================================================================
// PassiveCpCalculator — cpAtLevel() reference values
// Validation anchor from component: Lumi "MB 20 + Market 20 + Embassy 20 +
// Academy 20 + Town Hall 10 = 529 CP/day" (no empty-village base; ts11 sum = game 12/day).
// =========================================================================
describe('PassiveCpCalculator.cpAtLevel — Lumi 529 CP/day config', () => {
  it('mainBuilding Lv 20 = round(2 × 1.2^20)', () => {
    // 1.2^20 ≈ 38.3376, × 2 = 76.675 → round = 77
    expect(cpAtLevel('mainBuilding', 20)).toBe(77);
  });
  it('marketplace Lv 20 = round(3 × 1.2^20) = 115', () => {
    expect(cpAtLevel('marketplace', 20)).toBe(115);
  });
  it('embassy Lv 20 = round(4 × 1.2^20) = 153', () => {
    expect(cpAtLevel('embassy', 20)).toBe(153);
  });
  it('academy Lv 20 = round(4 × 1.2^20) = 153', () => {
    expect(cpAtLevel('academy', 20)).toBe(153);
  });
  it('townHall Lv 10 = round(5 × 1.2^10) = 31', () => {
    expect(cpAtLevel('townHall', 10)).toBe(31);
  });
  it('Lumi preset total (MB20 + Mkt20 + Emb20 + Acad20 + TH10) = 529, no +2 base', () => {
    const sum = cpAtLevel('mainBuilding', 20)
      + cpAtLevel('marketplace', 20)
      + cpAtLevel('embassy', 20)
      + cpAtLevel('academy', 20)
      + cpAtLevel('townHall', 10);
    expect(sum).toBe(529);
    expect(PRESET_LUMI_CP).toBe(529);
  });
  it('Lv 0 always returns 0', () => {
    expect(cpAtLevel('mainBuilding', 0)).toBe(0);
    expect(cpAtLevel('townHall', 0)).toBe(0);
  });
});

// =========================================================================
// FarmingCalculator.lumiBracket — pop → horse-count bracket
// =========================================================================
describe('FarmingCalculator.lumiBracket', () => {
  it('0 pop → "< 150" bracket, 0 horses', () => {
    const r = lumiBracket(0, 'en');
    expect(r.bracket).toBe('< 150');
    expect(r.n).toBe(0);
    expect(r.msg).toBe('Usually skip');
  });

  it('149 pop → "< 150" (boundary exclusive)', () => {
    expect(lumiBracket(149, 'en').n).toBe(0);
  });

  it('150 pop → "150–400" bracket, 1 horse', () => {
    const r = lumiBracket(150, 'en');
    expect(r.bracket).toBe('150–400');
    expect(r.n).toBe(1);
    expect(r.msg).toBe('1 horse');
  });

  it('399 pop → "150–400" bracket (boundary exclusive on right)', () => {
    expect(lumiBracket(399, 'en').n).toBe(1);
  });

  it('400 pop → "400–550" bracket, 2 horses', () => {
    const r = lumiBracket(400, 'en');
    expect(r.bracket).toBe('400–550');
    expect(r.n).toBe(2);
    expect(r.msg).toBe('2 horses');
  });

  it('549 pop → "400–550" bracket', () => {
    expect(lumiBracket(549, 'en').n).toBe(2);
  });

  it('550 pop → "550+" bracket, 5 horses (default from 3–7 range)', () => {
    const r = lumiBracket(550, 'en');
    expect(r.bracket).toBe('550+');
    expect(r.n).toBe(5);
    expect(r.msg).toBe('3–7 horses (5 default)');
  });

  it('800 pop → "550+" bracket (same bracket per consolidation)', () => {
    const r = lumiBracket(800, 'en');
    expect(r.bracket).toBe('550+');
    expect(r.n).toBe(5);
  });

  it('2000 pop → "550+" bracket (hard upper still same bucket)', () => {
    expect(lumiBracket(2000, 'en').n).toBe(5);
  });

  it('Chinese locale messages (150 pop → "1 馬")', () => {
    expect(lumiBracket(150, 'zh').msg).toBe('1 馬');
    expect(lumiBracket(0, 'zh').msg).toBe('通常不值得');
    expect(lumiBracket(550, 'zh').msg).toBe('3–7 馬（預設 5）');
  });
});
