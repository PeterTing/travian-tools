import { describe, it, expect } from 'vitest';
import { strategy4pFarming } from './strategy-4p-farming';

describe('strategy-4p-farming branch', () => {
  it('id is 4p-farming', () => {
    expect(strategy4pFarming.id).toBe('4p-farming');
  });

  it('branch has 61 steps (step 41 to 101)', () => {
    expect(strategy4pFarming.branchSteps.length).toBe(61);
    expect(strategy4pFarming.branchSteps[0].step).toBe(41);
    expect(strategy4pFarming.branchSteps[60].step).toBe(101);
  });

  it('step numbers are sequential 41-101', () => {
    strategy4pFarming.branchSteps.forEach((s, i) => expect(s.step).toBe(41 + i));
  });

  it('metadata: partyCount 4, farmingLoad heavy, cpProd 180, xlsxUpdated AUG-2022', () => {
    expect(strategy4pFarming.partyCount).toBe(4);
    expect(strategy4pFarming.farmingLoad).toBe('heavy');
    expect(strategy4pFarming.cpProd).toBe(180);
    expect(strategy4pFarming.xlsxUpdated).toBe('AUG-2022');
  });

  it('has 4 Party steps at 69, 80, 83, 85', () => {
    const parties = strategy4pFarming.branchSteps.filter(s => s.building.en.startsWith('Party'));
    expect(parties.map(p => p.step)).toEqual([69, 80, 83, 85]);
  });

  it('has at least 2 farming-related steps (Stable or Farm units or Research)', () => {
    const farmingRelated = strategy4pFarming.branchSteps.filter(s =>
      s.building.en.includes('Stable') ||
      s.building.en.includes('Farm units') ||
      s.building.en.includes('Research') ||
      s.building.en.includes('Legionnaire')
    );
    expect(farmingRelated.length).toBeGreaterThanOrEqual(2);
  });

  it('phases: Party 1 -> post-party-1, Party 4 -> post-party-final', () => {
    const p1 = strategy4pFarming.branchSteps.find(s => s.step === 69);
    const p4 = strategy4pFarming.branchSteps.find(s => s.step === 85);
    expect(p1?.phase).toBe('post-party-1');
    expect(p4?.phase).toBe('post-party-final');
  });

  it('popGain never literal 0', () => {
    strategy4pFarming.branchSteps.forEach(s => expect(s.popGain).not.toBe(0));
  });

  it('total branch cost matches xlsx (499,930)', () => {
    const total = strategy4pFarming.branchSteps.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    expect(total).toBe(499930);
  });

  it('step 70 (Farm units ROI call) has cost === 0 (literal, faithful to xlsx)', () => {
    const step70 = strategy4pFarming.branchSteps.find((s) => s.step === 70);
    expect(step70?.cost).toBe(0);
  });
});
