import { describe, it, expect } from 'vitest';
import { strategy3pSim } from './strategy-3p-sim';

describe('strategy-3p-sim branch', () => {
  it('id is 3p-sim', () => expect(strategy3pSim.id).toBe('3p-sim'));

  it('branch has 57 steps (41 to 97)', () => {
    expect(strategy3pSim.branchSteps.length).toBe(57);
    expect(strategy3pSim.branchSteps[0].step).toBe(41);
    expect(strategy3pSim.branchSteps[56].step).toBe(97);
  });

  it('steps sequential 41-97', () => {
    strategy3pSim.branchSteps.forEach((s, i) => expect(s.step).toBe(41 + i));
  });

  it('metadata: partyCount 3, farmingLoad none, cpProd 210, xlsxUpdated MAR-2022', () => {
    expect(strategy3pSim.partyCount).toBe(3);
    expect(strategy3pSim.farmingLoad).toBe('none');
    expect(strategy3pSim.cpProd).toBe(210);
    expect(strategy3pSim.xlsxUpdated).toBe('MAR-2022');
  });

  it('has exactly 3 Party steps at 76, 79, 81', () => {
    const parties = strategy3pSim.branchSteps.filter(s => s.building.en.startsWith('Party'));
    expect(parties.map(p => p.step)).toEqual([76, 79, 81]);
  });

  it('Party 3 (step 81) is in phase post-party-final (no post-party-3 in 3P)', () => {
    const p3 = strategy3pSim.branchSteps.find(s => s.step === 81);
    expect(p3?.phase).toBe('post-party-final');
  });

  it('Party 1 phase post-party-1, Party 2 phase post-party-2', () => {
    expect(strategy3pSim.branchSteps.find(s => s.step === 76)?.phase).toBe('post-party-1');
    expect(strategy3pSim.branchSteps.find(s => s.step === 79)?.phase).toBe('post-party-2');
  });

  it('no step has phase post-party-3 (3P has no Party 4)', () => {
    const postParty3 = strategy3pSim.branchSteps.filter(s => s.phase === 'post-party-3');
    expect(postParty3).toHaveLength(0);
  });

  it('post-settle starts at step 83', () => {
    const ps = strategy3pSim.branchSteps.filter(s => s.phase === 'post-settle');
    expect(ps[0]?.step).toBe(83);
  });

  it('popGain never literal 0', () => {
    strategy3pSim.branchSteps.forEach(s => expect(s.popGain).not.toBe(0));
  });

  it('total branch cost matches xlsx (499,500)', () => {
    const total = strategy3pSim.branchSteps.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    expect(total).toBe(499500);
  });
});
