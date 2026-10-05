import { describe, it, expect } from 'vitest';
import { STRATEGY_LIST, STRATEGY_ORDER, STRATEGIES, common } from './index';
import type { StrategyId } from './index';

describe('strategies registry (integration)', () => {
  it('has 5 strategies with unique ids', () => {
    expect(STRATEGY_LIST.length).toBe(5);
    expect(new Set(STRATEGY_LIST.map((s) => s.id)).size).toBe(5);
  });

  it('STRATEGY_ORDER covers all 5 ids exactly once', () => {
    expect(STRATEGY_ORDER.length).toBe(5);
    expect(new Set(STRATEGY_ORDER).size).toBe(5);
  });

  it('STRATEGIES record maps each id to its strategy object', () => {
    STRATEGY_ORDER.forEach((id) => {
      expect(STRATEGIES[id].id).toBe(id);
    });
  });

  it('common + branchSteps total matches xlsx row count for each strategy', () => {
    const expected: Record<StrategyId, number> = {
      '4p-sim': 98,
      '4p-farming': 101,
      '3p-sim': 97,
      '3p-farming': 102,
      'lazy-decent': 78,
    };
    STRATEGY_LIST.forEach((s) => {
      const total = common.length + s.branchSteps.length;
      expect(total, `${s.id} total`).toBe(expected[s.id]);
    });
  });

  it('every branch starts at step 41 (immediately after common 1-40)', () => {
    STRATEGY_LIST.forEach((s) => {
      expect(s.branchSteps[0].step, `${s.id} first branch step`).toBe(41);
    });
  });

  it('every strategy has non-empty pros and cons', () => {
    STRATEGY_LIST.forEach((s) => {
      expect(s.pros.length).toBeGreaterThan(0);
      expect(s.cons.length).toBeGreaterThan(0);
    });
  });

  it('every strategy has non-empty tagline in both languages', () => {
    STRATEGY_LIST.forEach((s) => {
      expect(s.tagline.zh.length).toBeGreaterThan(0);
      expect(s.tagline.en.length).toBeGreaterThan(0);
    });
  });

  it('partyCount values: 4P strategies have 4, 3P strategies have 3, lazy has 4', () => {
    expect(STRATEGIES['4p-sim'].partyCount).toBe(4);
    expect(STRATEGIES['4p-farming'].partyCount).toBe(4);
    expect(STRATEGIES['3p-sim'].partyCount).toBe(3);
    expect(STRATEGIES['3p-farming'].partyCount).toBe(3);
    expect(STRATEGIES['lazy-decent'].partyCount).toBe(4);
  });

  it('no branch step has a step number <= 40 (collision with common)', () => {
    STRATEGY_LIST.forEach((s) => {
      s.branchSteps.forEach((step) => {
        expect(step.step, `${s.id} step ${step.step}`).toBeGreaterThan(40);
      });
    });
  });

  it('no step has both cost:null AND tier:null unless it is a task/party/special (sanity check)', () => {
    // Sanity: regular building upgrades should have either cost or tier. Only tasks/parties/decisions may have both null.
    // This is a soft check — we allow special rows.
    STRATEGY_LIST.forEach((s) => {
      s.branchSteps.forEach((step) => {
        if (step.cost === null && step.tier === null) {
          // Must be a task, party, or recognized special action
          const isSpecial =
            /Party|Train \d+|settler|task|Research|Farm units|3k resc|Hold on|CP buffer|N\/A|Remove/i.test(
              step.building.en
            );
          expect(isSpecial, `${s.id} step ${step.step} (${step.building.en}) unexpectedly has null cost+tier`).toBe(true);
        }
      });
    });
  });
});
