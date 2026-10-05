import { describe, it, expectTypeOf } from 'vitest';
import type { BuildStep, StrategyId, Phase } from './types';

describe('build-order types', () => {
  it('BuildStep has required fields', () => {
    const step: BuildStep = {
      step: 1,
      building: { zh: '村莊大樓', en: 'Main Building' },
      targetLevel: 1,
      tier: 1,
      cost: 0,
      cpGain: 2,
      popGain: 2,
      phase: 'pre-party-1',
      notes: { zh: '派英雄打最短冒險拿馬', en: 'Hero on shortest adventure for horse' },
    };
    expectTypeOf(step).toMatchTypeOf<BuildStep>();
  });

  it('StrategyId enumerates 5 strategies', () => {
    const ids: StrategyId[] = ['4p-sim', '4p-farming', '3p-sim', '3p-farming', 'lazy-decent'];
    expectTypeOf(ids).toMatchTypeOf<StrategyId[]>();
  });

  it('Phase enumerates 6 phases', () => {
    const phases: Phase[] = ['pre-party-1', 'post-party-1', 'post-party-2', 'post-party-3', 'post-party-final', 'post-settle'];
    expectTypeOf(phases).toMatchTypeOf<Phase[]>();
  });
});
