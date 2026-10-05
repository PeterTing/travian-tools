import { describe, it, expect } from 'vitest';
import { strategy3pFarming } from './strategy-3p-farming';

describe('strategy-3p-farming branch', () => {
  it('id is 3p-farming', () => expect(strategy3pFarming.id).toBe('3p-farming'));

  it('branch has 62 steps (41 to 102)', () => {
    expect(strategy3pFarming.branchSteps.length).toBe(62);
    expect(strategy3pFarming.branchSteps[0].step).toBe(41);
    expect(strategy3pFarming.branchSteps[61].step).toBe(102);
  });

  it('steps sequential 41-102', () => {
    strategy3pFarming.branchSteps.forEach((s, i) => expect(s.step).toBe(41 + i));
  });

  it('metadata: partyCount 3, farmingLoad heavy, cpProd 230, xlsxUpdated APR-2022', () => {
    expect(strategy3pFarming.partyCount).toBe(3);
    expect(strategy3pFarming.farmingLoad).toBe('heavy');
    expect(strategy3pFarming.cpProd).toBe(230);
    expect(strategy3pFarming.xlsxUpdated).toBe('APR-2022');
  });

  it('has 3 Party steps at 80, 84, 86 (normalized labels Party 1/2/3)', () => {
    const parties = strategy3pFarming.branchSteps.filter(s => s.building.en.startsWith('Party'));
    expect(parties.map(p => p.step)).toEqual([80, 84, 86]);
    expect(parties[0].building.en).toBe('Party 1');
    expect(parties[1].building.en).toBe('Party 2');
    expect(parties[2].building.en).toBe('Party 3');
  });

  it('steps 84 and 86 have notes explaining xlsx typo', () => {
    const step84 = strategy3pFarming.branchSteps.find(s => s.step === 84);
    const step86 = strategy3pFarming.branchSteps.find(s => s.step === 86);
    expect(step84?.notes?.en).toMatch(/typo|xlsx/i);
    expect(step86?.notes?.en).toMatch(/typo|xlsx/i);
  });

  it('no step has phase post-party-3 (3P has no Party 4)', () => {
    expect(strategy3pFarming.branchSteps.filter(s => s.phase === 'post-party-3')).toHaveLength(0);
  });

  it('step 83 has cost 0 (literal, xlsx Train settler 0 decision point)', () => {
    const s = strategy3pFarming.branchSteps.find(st => st.step === 83);
    expect(s?.cost).toBe(0);
  });

  it('step 85 is Train 3 settlers with cost 54300', () => {
    const s = strategy3pFarming.branchSteps.find(st => st.step === 85);
    expect(s?.building.en).toMatch(/3 settlers/i);
    expect(s?.cost).toBe(54300);
  });

  it('has farming-related steps (Stable, Farm units, Research)', () => {
    const farming = strategy3pFarming.branchSteps.filter(s =>
      /Stable|Farm units|Research|Legionnaire/i.test(s.building.en)
    );
    expect(farming.length).toBeGreaterThanOrEqual(3);
  });

  it('popGain never literal 0', () => {
    strategy3pFarming.branchSteps.forEach(s => expect(s.popGain).not.toBe(0));
  });

  it('total branch cost matches xlsx (500,365)', () => {
    const total = strategy3pFarming.branchSteps.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    expect(total).toBe(500365);
  });
});
