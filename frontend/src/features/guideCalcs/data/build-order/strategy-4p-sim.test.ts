import { describe, it, expect } from 'vitest';
import { strategy4pSim } from './strategy-4p-sim';

describe('strategy-4p-sim branch', () => {
  it('id is 4p-sim', () => {
    expect(strategy4pSim.id).toBe('4p-sim');
  });

  it('branch has 58 steps (step 41 to 98)', () => {
    expect(strategy4pSim.branchSteps.length).toBe(58);
    expect(strategy4pSim.branchSteps[0].step).toBe(41);
    expect(strategy4pSim.branchSteps[57].step).toBe(98);
  });

  it('step numbers are sequential from 41 to 98', () => {
    strategy4pSim.branchSteps.forEach((s, i) => {
      expect(s.step).toBe(41 + i);
    });
  });

  it('partyCount is 4, farmingLoad is none, cpProd is 180', () => {
    expect(strategy4pSim.partyCount).toBe(4);
    expect(strategy4pSim.farmingLoad).toBe('none');
    expect(strategy4pSim.cpProd).toBe(180);
  });

  it('has 4 Party steps at 67, 77, 80, 82', () => {
    const parties = strategy4pSim.branchSteps.filter(s => s.building.en.startsWith('Party'));
    expect(parties.map(p => p.step)).toEqual([67, 77, 80, 82]);
  });

  it('Residence Lv 10 is at step 78 (before first settler training)', () => {
    const res10 = strategy4pSim.branchSteps.find(
      s => s.building.en === 'Residence' && s.targetLevel === 10
    );
    expect(res10?.step).toBe(78);
  });

  it('phases transition correctly: Party 1 starts post-party-1, Party 4 starts post-party-final', () => {
    const party1 = strategy4pSim.branchSteps.find(s => s.step === 67);
    const party4 = strategy4pSim.branchSteps.find(s => s.step === 82);
    expect(party1?.phase).toBe('post-party-1');
    expect(party4?.phase).toBe('post-party-final');
  });

  it('step 84 onwards is post-settle', () => {
    const postSettle = strategy4pSim.branchSteps.filter(s => s.phase === 'post-settle');
    expect(postSettle.every(s => s.step >= 84)).toBe(true);
    expect(postSettle.map(s => s.step)[0]).toBe(84);
  });

  it('popGain is never stored as literal 0', () => {
    strategy4pSim.branchSteps.forEach(s => expect(s.popGain).not.toBe(0));
  });

  it('total branch cost matches xlsx (492,830 across 58 steps)', () => {
    const total = strategy4pSim.branchSteps.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    expect(total).toBe(492830);
  });
});
