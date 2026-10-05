/**
 * Verified settler cost + combat stats for all 7 tribes (1x server speed).
 *
 * This module is the canonical source of truth for settler data. It replaces
 * inconsistent per-tribe copies previously scattered across src/data/settlement/*.ts,
 * two of which were known to be wrong:
 *
 *   - Viking:   old website said 54,000 total (wrong); correct is 20,000/unit
 *   - Egyptian: old website said 19,000 total (wrong); correct is 21,000/unit
 *
 * Sources:
 *   - Roman / Teuton / Gaul:
 *       kirilloid/travian base/units.ts + xlsx T4.6 Start Guide "Other!R60-62"
 *   - Viking:
 *       https://support.travian.com/en/support/solutions/articles/7000090975
 *   - Egyptian / Hun / Spartan:
 *       Player-provided in-game stats screen (verified 2026-04-23)
 */
import type { TribeId } from '../travian';

export interface SettlerCombatStats {
  attack: number;
  defInf: number;
  defCav: number;
  /** Fields per hour (base travel speed). */
  speed: number;
  /** Carry capacity (resources per settler). */
  carry: number;
  /** Upkeep in crop per hour. */
  upkeep: number;
}

export interface SettlerCost {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  /** Sum of all four (per 1 settler). */
  total: number;
  /** Training time for 1 settler, in seconds (1x speed). */
  trainingSeconds: number;
  combat: SettlerCombatStats;
  /** True when the numbers have a named authoritative source. */
  verified: boolean;
  /** Where the numbers came from. */
  source: string;
}

const STANDARD_COMBAT: SettlerCombatStats = {
  attack: 10,
  defInf: 80,
  defCav: 80,
  speed: 5,
  carry: 3000,
  upkeep: 1,
};

const EGYPTIAN_COMBAT: SettlerCombatStats = {
  ...STANDARD_COMBAT,
  attack: 0,
};

export const TRIBE_SETTLER_COST: Record<TribeId, SettlerCost> = {
  romans: {
    wood: 4600, clay: 4200, iron: 5800, crop: 4400, total: 19000,
    trainingSeconds: 26900,
    combat: STANDARD_COMBAT,
    verified: true,
    source: 'kirilloid/travian base/units.ts + xlsx T4.6 Start Guide Other!R61',
  },
  teutons: {
    wood: 5800, clay: 4400, iron: 4600, crop: 5200, total: 20000,
    trainingSeconds: 31000,
    combat: STANDARD_COMBAT,
    verified: true,
    source: 'kirilloid/travian base/units.ts + xlsx T4.6 Start Guide Other!R62',
  },
  gauls: {
    wood: 4400, clay: 5600, iron: 4200, crop: 3900, total: 18100,
    trainingSeconds: 22700,
    combat: STANDARD_COMBAT,
    verified: true,
    source: 'kirilloid/travian base/units.ts + xlsx T4.6 Start Guide Other!R60',
  },
  vikings: {
    wood: 5800, clay: 4600, iron: 4800, crop: 4800, total: 20000,
    trainingSeconds: 31000,
    combat: STANDARD_COMBAT,
    verified: true,
    source: 'support.travian.com/en/support/solutions/articles/7000090975',
  },
  egyptians: {
    wood: 5040, clay: 6510, iron: 4830, crop: 4620, total: 21000,
    trainingSeconds: 24800,
    combat: EGYPTIAN_COMBAT,
    verified: true,
    source: 'Player-provided in-game stats screen (verified 2026-04-23)',
  },
  huns: {
    wood: 6100, clay: 4600, iron: 4800, crop: 5400, total: 20900,
    trainingSeconds: 28950,
    combat: STANDARD_COMBAT,
    verified: true,
    source: 'Player-provided in-game stats screen (verified 2026-04-23)',
  },
  spartans: {
    wood: 5115, clay: 5580, iron: 6045, crop: 3255, total: 19995,
    trainingSeconds: 34100,
    combat: STANDARD_COMBAT,
    verified: true,
    source: 'Player-provided in-game stats screen (verified 2026-04-23)',
  },
};
