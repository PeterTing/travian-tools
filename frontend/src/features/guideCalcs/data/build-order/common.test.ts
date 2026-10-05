import { describe, it, expect } from 'vitest';
import { common } from './common';

describe('common build order (steps 1-40, shared by all 5 strategies)', () => {
  it('has exactly 40 steps', () => {
    expect(common.length).toBe(40);
  });

  it('steps are numbered 1-40 sequentially', () => {
    common.forEach((s, i) => expect(s.step).toBe(i + 1));
  });

  it('step 1 is Main Building to 1 (tier 1, free)', () => {
    const s = common[0];
    expect(s.building.en).toBe('Main Building');
    expect(s.building.zh).toBe('村莊大樓');
    expect(s.targetLevel).toBe(1);
    expect(s.tier).toBe(1);
    expect(s.cost).toBeNull(); // xlsx step 1 cost is empty
  });

  it('step 5 is Clay pits 1x to 2 (cost 420)', () => {
    const s = common[4];
    expect(s.building.en).toBe('Clay pits');
    expect(s.targetLevel).toBe(2);
    expect(s.cost).toBe(420);
  });

  it('step 36 is Academy to 1 (cost 510)', () => {
    const s = common[35];
    expect(s.building.en).toBe('Academy');
    expect(s.targetLevel).toBe(1);
    expect(s.cost).toBe(510);
  });

  it('step 40 is Population 100 task (cost null)', () => {
    const s = common[39];
    expect(s.building.en).toContain('Population');
    expect(s.cost).toBeNull();
  });

  it('all 40 steps have phase = pre-party-1', () => {
    common.forEach((s) => expect(s.phase).toBe('pre-party-1'));
  });

  it('total cost of all 40 steps sums to 36340', () => {
    const total = common.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    expect(total).toBe(36340);
  });

  it('step 1 has hero adventure note', () => {
    expect(common[0].notes?.en).toMatch(/adventure.*horse|hero/i);
  });

  it('popGain is never stored as literal 0 (always omitted when zero)', () => {
    common.forEach((s) => expect(s.popGain).not.toBe(0));
  });
});
