/**
 * Build-order data module — barrel exports.
 *
 * Consumers should import from this module (not individual strategy files)
 * so the public surface stays stable if internals are reorganized.
 */
export type { BuildStep, Strategy, StrategyId, Phase } from './types';
export { common } from './common';
export { STRATEGIES, STRATEGY_ORDER, STRATEGY_LIST } from './strategies';
