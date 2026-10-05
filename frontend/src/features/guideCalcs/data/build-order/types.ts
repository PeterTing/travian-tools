import type { LangText } from '../../i18n/types';

export type StrategyId = '4p-sim' | '4p-farming' | '3p-sim' | '3p-farming' | 'lazy-decent';

export type Phase =
  | 'pre-party-1'
  | 'post-party-1'
  | 'post-party-2'
  | 'post-party-3'
  | 'post-party-final'
  | 'post-settle';

export interface BuildStep {
  /** xlsx row number (1-based); continuous across common (1-40) and branch (41+). */
  step: number;
  /** Building or action name (bilingual). */
  building: LangText;
  /** Target level; null for Party/Settler/Task special actions. */
  targetLevel: number | null;
  /** xlsx tier column (upgrade batch number per building). null = N/A. */
  tier: number | null;
  /** xlsx cost column (total resources). null = free or covered by task reward. */
  cost: number | null;
  /** xlsx cp prod column (CP gained by this action). */
  cpGain?: number;
  /** xlsx pop column. */
  popGain?: number;
  /** Which phase this step belongs to. */
  phase: Phase;
  /** xlsx General column (Carpis's strategy notes); only some steps have this. */
  notes?: LangText;
}

export interface Strategy {
  id: StrategyId;
  name: LangText;
  /** One-line tagline. */
  tagline: LangText;
  /** Settle time estimate in hours. best = ideal, typical = normal. */
  settleHours: { best: number; typical: number };
  farmingLoad: 'none' | 'light' | 'heavy';
  partyCount: 3 | 4;
  /** Post-settle field level target (descriptive). */
  fieldTarget: LangText;
  /** Estimated CP production (from xlsx Introduction sheet). */
  cpProd: number;
  pros: LangText[];
  cons: LangText[];
  /** xlsx's last-updated month stamp. */
  xlsxUpdated: string;
  /** Day-2+ build order (step 41+); does NOT include the 40 common steps. */
  branchSteps: BuildStep[];
}
