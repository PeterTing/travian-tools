import { describe, it, expect } from 'vitest';
import {
  FIELD_PRODUCTION, fieldTotalCost, bbTotalCost,
} from './data/travian';
import { planGreedy, type BB, type PlanInput } from './components/BuildOrderCalculator';

// =========================================================================
// BuildOrderCalculator.planGreedy — algorithm-correctness tests
//
// The calculator implements a "greedy ROI" planner: at each step it builds
// a list of candidates (lowest-level field of each resource type that's
// still below cap, plus each bonus building whose prerequisites are met),
// sorts them by ROI = cost / (daily production gain), picks the cheapest
// ROI, applies it, and repeats for up to 20 steps.
//
// These tests verify CORRECTNESS of step selection, not just that a result
// is produced. A drift in the greedy scoring function, or a bug in the
// prerequisite check, or a bug in the post-pick state update, should trip
// at least one of these.
// =========================================================================

const ALL_BB_ZERO: Record<BB, number> = {
  sawmill: 0, brickyard: 0, ironFoundry: 0, grainMill: 0, bakery: 0,
};

function baseInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    cropperId: '15c',
    isCap: true,
    start: { wood: 0, clay: 0, iron: 0, crop: 0 },
    bonus: { ...ALL_BB_ZERO },
    mb: 10,
    gold: false,
    ...overrides,
  };
}

describe('planGreedy — step 1 picks the candidate with lowest ROI', () => {
  it('all fields L0: picks a field upgrade (no bonus building qualifies yet)', () => {
    // At L0, no bonus building's prerequisite (crop>=5 or res>=10) is met.
    // Every field L0->L1 has ROI = 250 / (7 * 24) ≈ 1.49 days (wood/clay/crop)
    // or 270 / (7 * 24) ≈ 1.61 days (iron). Lowest is any of wood/clay/crop.
    const r = planGreedy(baseInput());
    expect(r.steps[0]!.kind).toBe('field');
    expect(r.steps[0]!.to).toBe(1);
    // ROI must match hand-computed value for the cheapest L1.
    // Array.prototype.sort is stable since ES2019, and wood is inserted first
    // among the tied candidates, so the winner is wood #1.
    expect(r.steps[0]!.type).toBe('wood');
    expect(r.steps[0]!.cost).toBe(250); // 40+100+50+60
    expect(r.steps[0]!.roi).toBeCloseTo(250 / (7 * 24), 3);
  });

  it('crop L5, non-crop L0: grain mill unlocks and its ROI beats most field upgrades', () => {
    // At this state, Mill is unlocked (crop>=5) with a massive daily delta
    // (15 cropfields × prod[5]=46 × 0.05 × 24 = 828/day vs. a single L1 field
    // at ~168/day).  Mill cost L1 = 2560.  Mill ROI ≈ 2560/828 = 3.09 days.
    //
    // But L0→L1 field upgrades are still cheaper: wood L1 ROI ≈ 1.49 days.
    // The greedy planner should therefore STILL pick a field L0→L1 first,
    // and Mill should NOT be step 1.
    const r = planGreedy(baseInput({
      start: { wood: 0, clay: 0, iron: 0, crop: 5 },
    }));
    expect(r.steps[0]!.kind).toBe('field');
    expect(r.steps[0]!.to).toBe(1);
  });

  it('all fields L5: mill should be picked first (prerequisite met, huge aggregate delta)', () => {
    // All 15 crop at L5, prod[5]=46. Mill daily delta = 15×46×0.05×24 = 828.
    // Mill L1 cost = 2560 → ROI 3.09 days.
    //
    // Best field L5→L6: base delta = prod[6]-prod[5] = 70-46 = 24/hr = 576/day.
    // Cheapest L6 field total cost (crop) scales by ~13x → ~3250.
    // Field ROI ~ 3250/576 = 5.6 days.
    //
    // Mill should win step 1.
    const r = planGreedy(baseInput({
      start: { wood: 5, clay: 5, iron: 5, crop: 5 },
    }));
    expect(r.steps[0]!.kind).toBe('bb');
    expect(r.steps[0]!.bb).toBe('grainMill');
    expect(r.steps[0]!.to).toBe(1);
  });

  it('gold +25% raises daily delta by 25% → ROI is 20% shorter (1/1.25 = 0.8)', () => {
    // Pure property test of the gold multiplier path.
    const noGold = planGreedy(baseInput({ gold: false }));
    const withGold = planGreedy(baseInput({ gold: true }));
    // Same first-step pick (all L0, neither has BBs unlocked), just faster ROI.
    expect(withGold.steps[0]!.kind).toBe(noGold.steps[0]!.kind);
    expect(withGold.steps[0]!.type).toBe(noGold.steps[0]!.type);
    expect(withGold.steps[0]!.cost).toBe(noGold.steps[0]!.cost);
    expect(withGold.steps[0]!.roi).toBeCloseTo(noGold.steps[0]!.roi * (1 / 1.25), 3);
  });

  it('deterministic: identical inputs produce identical output', () => {
    const a = planGreedy(baseInput({ start: { wood: 3, clay: 3, iron: 3, crop: 3 } }));
    const b = planGreedy(baseInput({ start: { wood: 3, clay: 3, iron: 3, crop: 3 } }));
    expect(a.steps.length).toBe(b.steps.length);
    for (let i = 0; i < a.steps.length; i++) {
      expect(a.steps[i]!.label).toBe(b.steps[i]!.label);
      expect(a.steps[i]!.cost).toBe(b.steps[i]!.cost);
      expect(a.steps[i]!.roi).toBeCloseTo(b.steps[i]!.roi, 6);
    }
    expect(a.totalCost).toBe(b.totalCost);
  });

  it('produces 20 steps when state has capacity for more upgrades', () => {
    // Fresh state → plenty of upgrade room → should fill all 20 slots.
    const r = planGreedy(baseInput({
      start: { wood: 0, clay: 0, iron: 0, crop: 0 },
    }));
    expect(r.steps.length).toBe(20);
  });

  it('caps at field L10 when not capital, even with room in bonus buildings', () => {
    // Non-capital server: maxLv = 10. Starting all L10 with no BBs means only
    // BBs can be picked. Mill requires crop>=5 (met), Sawmill/Brickyard/
    // IronFoundry all require res>=10 (met), Bakery requires crop>=10 AND
    // mill>=5 (mill not yet built, so bakery blocked).
    const r = planGreedy(baseInput({
      isCap: false,
      start: { wood: 10, clay: 10, iron: 10, crop: 10 },
    }));
    // Every pick should be a BB (no field upgrade is valid above L10 non-cap)
    for (const s of r.steps) {
      expect(s.kind).toBe('bb');
    }
    // Mill must come before Bakery (bakery prerequisite is mill>=5)
    const firstBakery = r.steps.findIndex(s => s.bb === 'bakery');
    const millAt5 = r.steps.findIndex(s => s.bb === 'grainMill' && s.to === 5);
    if (firstBakery >= 0 && millAt5 >= 0) {
      expect(firstBakery).toBeGreaterThan(millAt5);
    }
  });

  it('oasisPct on crop makes crop fields more attractive than peers', () => {
    // With +100% crop oasis, the crop delta doubles (+24 × (1+1) = 48/hr extra).
    // Compare two plans both starting all L0:
    //   base: ROI for crop L1 = 250 / (7*24) ≈ 1.488
    //   with 100% crop oasis: ROI for crop L1 = 250 / (7*24*2) ≈ 0.744
    // At step 1 the tie-break was insertion order (wood first). With crop oasis,
    // crop L1 now has strictly lower ROI than wood/clay L1.
    const r = planGreedy(baseInput({
      oasisPct: { crop: 1.0 },
    }));
    expect(r.steps[0]!.kind).toBe('field');
    expect(r.steps[0]!.type).toBe('crop');
  });

  it('steps are cumulatively state-consistent: a field picked twice has the right from/to', () => {
    // After a wood L0→L1 pick, the NEXT wood candidate (if chosen) must be
    // L1→L2, not L0→L1 again. This checks the post-pick state update.
    const r = planGreedy(baseInput({
      start: { wood: 0, clay: 10, iron: 10, crop: 10 },
      bonus: { sawmill: 5, brickyard: 5, ironFoundry: 5, grainMill: 5, bakery: 5 },
      isCap: false,
    }));
    // Now the only possible picks are wood field upgrades (all BBs maxed,
    // other fields at cap). There's only 1 wood field on 15c layout, so wood
    // steps should be L0→L1, L1→L2, L2→L3, ... without repeats.
    const woodSteps = r.steps.filter(s => s.kind === 'field' && s.type === 'wood');
    expect(woodSteps.length).toBeGreaterThan(1);
    for (let i = 0; i < woodSteps.length; i++) {
      expect(woodSteps[i]!.from).toBe(i);       // from level i
      expect(woodSteps[i]!.to).toBe(i + 1);     // to level i+1
    }
  });

  it('totalCost is sum of step costs (simple additive invariant)', () => {
    const r = planGreedy(baseInput());
    const handSum = r.steps.reduce((acc, s) => acc + s.cost, 0);
    expect(r.totalCost).toBe(handSum);
  });
});

// =========================================================================
// Reference ROI & cost spot-checks — ties the planGreedy scoring to the
// canonical fieldTotalCost / bbTotalCost / FIELD_PRODUCTION constants.
// =========================================================================
describe('planGreedy — ROI scoring reference values', () => {
  it('field L0→L1 ROI for wood with no bonuses = 250 / (7 × 24 × 1) days', () => {
    const r = planGreedy(baseInput());
    // First pick is wood L0→L1. Its ROI should equal the hand-computed value.
    const s = r.steps[0]!;
    expect(s.type).toBe('wood');
    expect(s.cost).toBe(fieldTotalCost('wood', 1));
    expect(s.cost).toBe(250);
    const expectedRoi = 250 / (FIELD_PRODUCTION[1]! * 24);
    expect(s.roi).toBeCloseTo(expectedRoi, 4);
  });

  it('mill L1 ROI at all-L5 = bbTotalCost(mill,1) / (15 × prod[5] × 0.05 × 24)', () => {
    const r = planGreedy(baseInput({
      start: { wood: 5, clay: 5, iron: 5, crop: 5 },
    }));
    // Mill should be the first pick per earlier test.
    const s = r.steps[0]!;
    expect(s.bb).toBe('grainMill');
    const expectedCost = bbTotalCost('grainMill', 1);
    expect(s.cost).toBe(expectedCost);
    // 15 crop fields × prod[5]=46 × 5% × 24 = 828/day
    const dailyDelta = 15 * FIELD_PRODUCTION[5]! * 0.05 * 24;
    expect(s.roi).toBeCloseTo(expectedCost / dailyDelta, 3);
  });

  it('bonus-building bakery is NEVER picked before grainMill reaches Lv 5 (prerequisite enforced)', () => {
    // Bakery requires crop>=10 AND grainMill>=5. We set all crop L10 with mill=4
    // (below threshold). Also cap non-crop at 10 so only BBs can happen.
    const r = planGreedy(baseInput({
      isCap: false,
      start: { wood: 10, clay: 10, iron: 10, crop: 10 },
      bonus: { sawmill: 5, brickyard: 5, ironFoundry: 5, grainMill: 4, bakery: 0 },
    }));
    const firstBakery = r.steps.findIndex(s => s.bb === 'bakery');
    const millTo5 = r.steps.findIndex(s => s.bb === 'grainMill' && s.to === 5);
    if (firstBakery >= 0) {
      expect(millTo5).toBeGreaterThanOrEqual(0);
      expect(firstBakery).toBeGreaterThan(millTo5);
    }
  });
});

// =========================================================================
// Applied-state invariant: at each step, the candidate pool is re-derived
// from the updated fields + bb map. This exercises the post-pick mutation.
// =========================================================================
describe('planGreedy — cross-step state propagation', () => {
  it('eventually picks grain mill once crop reaches L5 via repeated upgrades', () => {
    // Start all non-crop at L10, crop all at L4. Mill is blocked (needs
    // crop>=5). The planner must first upgrade at least one crop to L5
    // before the mill candidate becomes valid.
    const r = planGreedy(baseInput({
      isCap: false,
      start: { wood: 10, clay: 10, iron: 10, crop: 4 },
    }));

    const millIdx = r.steps.findIndex(s => s.kind === 'bb' && s.bb === 'grainMill');
    // If mill is picked anywhere, at least one crop field must have reached
    // L5 in an earlier step.
    if (millIdx >= 0) {
      const cropToFive = r.steps.findIndex(
        (s, i) => i < millIdx && s.kind === 'field' && s.type === 'crop' && s.to === 5,
      );
      expect(cropToFive).toBeGreaterThanOrEqual(0);
      expect(cropToFive).toBeLessThan(millIdx);
    }
  });

  it('same-type repeated upgrades produce monotonically increasing to-levels', () => {
    // Force-lock every non-wood path, then verify wood picks go 1,2,3,...
    const r = planGreedy(baseInput({
      isCap: false,
      start: { wood: 0, clay: 10, iron: 10, crop: 10 },
      bonus: { sawmill: 5, brickyard: 5, ironFoundry: 5, grainMill: 5, bakery: 5 },
    }));
    const woodPicks = r.steps.filter(s => s.kind === 'field' && s.type === 'wood');
    // Each subsequent wood pick's to must be strictly greater than the prior.
    for (let i = 1; i < woodPicks.length; i++) {
      expect(woodPicks[i]!.to).toBeGreaterThan(woodPicks[i - 1]!.to);
    }
  });
});
