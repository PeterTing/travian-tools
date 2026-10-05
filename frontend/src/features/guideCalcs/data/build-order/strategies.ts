import type { Strategy, StrategyId } from './types';
import { strategy4pSim } from './strategy-4p-sim';
import { strategy4pFarming } from './strategy-4p-farming';
import { strategy3pSim } from './strategy-3p-sim';
import { strategy3pFarming } from './strategy-3p-farming';
import { strategyLazyDecent } from './strategy-lazy-decent';

/**
 * Strategies registry — maps StrategyId to Strategy objects.
 *
 * Combines the 5 branch strategies with the shared 40-step common prefix.
 * UI components should consume STRATEGY_LIST (iteration) or STRATEGIES (lookup).
 */
export const STRATEGIES: Record<StrategyId, Strategy> = {
  '4p-sim': strategy4pSim,
  '4p-farming': strategy4pFarming,
  '3p-sim': strategy3pSim,
  '3p-farming': strategy3pFarming,
  'lazy-decent': strategyLazyDecent,
};

/**
 * Canonical display order for the 5 strategies.
 * Matches the xlsx sheet order: 4P Sim → 4P Farming → 3P Sim → 3P Farming → Lazy Decent.
 */
export const STRATEGY_ORDER: StrategyId[] = [
  '4p-sim',
  '4p-farming',
  '3p-sim',
  '3p-farming',
  'lazy-decent',
];

/**
 * Ordered list of all strategies for iteration (e.g. rendering tabs or cards).
 */
export const STRATEGY_LIST: Strategy[] = STRATEGY_ORDER.map((id) => STRATEGIES[id]);
