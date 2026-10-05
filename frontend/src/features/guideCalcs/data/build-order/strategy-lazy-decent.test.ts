import { describe, it, expect } from 'vitest';
import { strategyLazyDecent } from './strategy-lazy-decent';

describe('strategy-lazy-decent branch', () => {
  it('id is lazy-decent', () => expect(strategyLazyDecent.id).toBe('lazy-decent'));

  it('branch has 38 steps (41 to 78)', () => {
    expect(strategyLazyDecent.branchSteps.length).toBe(38);
    expect(strategyLazyDecent.branchSteps[0].step).toBe(41);
    expect(strategyLazyDecent.branchSteps[37].step).toBe(78);
  });

  it('steps sequential 41-78', () => {
    strategyLazyDecent.branchSteps.forEach((s, i) => expect(s.step).toBe(41 + i));
  });

  it('metadata: partyCount 4, farmingLoad none, cpProd 200, settleHours 120-144', () => {
    expect(strategyLazyDecent.partyCount).toBe(4);
    expect(strategyLazyDecent.farmingLoad).toBe('none');
    expect(strategyLazyDecent.cpProd).toBe(200);
    expect(strategyLazyDecent.settleHours).toEqual({ best: 120, typical: 144 });
  });

  it('has 4 Party steps at 66, 71, 75, 77', () => {
    const parties = strategyLazyDecent.branchSteps.filter(s => s.building.en.startsWith('Party'));
    expect(parties.map(p => p.step)).toEqual([66, 71, 75, 77]);
  });

  it('no post-settle phase (branch ends at settlers)', () => {
    const postSettle = strategyLazyDecent.branchSteps.filter(s => s.phase === 'post-settle');
    expect(postSettle).toHaveLength(0);
  });

  it('phases: Party 1 post-party-1, Party 4 post-party-final', () => {
    expect(strategyLazyDecent.branchSteps.find(s => s.step === 66)?.phase).toBe('post-party-1');
    expect(strategyLazyDecent.branchSteps.find(s => s.step === 77)?.phase).toBe('post-party-final');
  });

  it('last step (78) is settlers and in post-party-final', () => {
    const last = strategyLazyDecent.branchSteps[37];
    expect(last.step).toBe(78);
    expect(last.phase).toBe('post-party-final');
    expect(last.building.en).toMatch(/settler/i);
  });

  it('popGain never literal 0', () => {
    strategyLazyDecent.branchSteps.forEach(s => expect(s.popGain).not.toBe(0));
  });

  it('total branch cost matches xlsx (361,160)', () => {
    const total = strategyLazyDecent.branchSteps.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    expect(total).toBe(361160);
  });
});
