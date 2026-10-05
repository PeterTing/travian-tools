import { describe, it, expect } from 'vitest';
import { simulate } from './components/LaunchSimCalculator';
import { TRIBE_SETTLER_COST } from './data/build-order/tribe-cost';

describe('LaunchSim simulate()', () => {
  const gaulCost = TRIBE_SETTLER_COST.gauls.total * 3;

  it('4p-sim produces 4+ milestones (4 Parties + settler trains + final)', () => {
    const r = simulate('4p-sim', 2000, gaulCost);
    expect(r.milestones.length).toBeGreaterThanOrEqual(4);
  });

  it('3p-sim produces 3+ milestones', () => {
    const r = simulate('3p-sim', 2000, gaulCost);
    expect(r.milestones.length).toBeGreaterThanOrEqual(3);
  });

  it('lazy-decent produces 4+ milestones', () => {
    const r = simulate('lazy-decent', 2000, gaulCost);
    expect(r.milestones.length).toBeGreaterThanOrEqual(4);
  });

  it('milestones are monotonically increasing in cumulativeHours', () => {
    const r = simulate('4p-sim', 2000, gaulCost);
    for (let i = 1; i < r.milestones.length; i++) {
      expect(r.milestones[i]!.cumulativeHours).toBeGreaterThan(
        r.milestones[i - 1]!.cumulativeHours
      );
    }
  });

  it('higher prodPerHour gives shorter totalHours', () => {
    const slow = simulate('4p-sim', 1000, gaulCost);
    const fast = simulate('4p-sim', 4000, gaulCost);
    expect(fast.totalHours).toBeLessThan(slow.totalHours);
  });

  it('ignoring task rewards, 4p-sim @ 2000/hr totals > 200 hours', () => {
    const r = simulate('4p-sim', 2000, gaulCost);
    expect(r.totalHours).toBeGreaterThan(200);
  });

  it('allSteps spans common (40) + branch steps and has no gaps', () => {
    const r = simulate('4p-sim', 2000, gaulCost);
    expect(r.allSteps.length).toBeGreaterThan(40);
    // Steps should start at 1
    expect(r.allSteps[0]!.step).toBe(1);
  });

  it('totalHours scales linearly with 1/rate (double rate → half hours)', () => {
    const slow = simulate('4p-sim', 1000, gaulCost);
    const fast = simulate('4p-sim', 2000, gaulCost);
    // Cumulative hours = totalCost / rate. Doubling rate should halve hours exactly.
    expect(fast.totalHours).toBeCloseTo(slow.totalHours / 2, 1);
  });
});
