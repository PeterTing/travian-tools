/**
 * Tribe + unit type definitions. All numbers are for 1x server speed.
 * Stats verified against kirilloid/travian source.
 */

import type { TribeId } from './travian';

export type { TribeId };

export type UnitCategory = 'infantry' | 'cavalry' | 'scout' | 'siege' | 'chief' | 'settler';

export interface UnitCost {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

export interface Unit {
  id: string;
  name: { zh: string; en: string };
  category: UnitCategory;
  attack: number;
  defInfantry: number;
  defCavalry: number;
  speed: number;        // fields/hour at 1x
  carry: number;        // carry capacity
  upkeep: number;       // crop per hour
  cost: UnitCost;
  trainTime: number;    // seconds at 1x, building L1
  role: { zh: string; en: string };
}

export interface TribeSpecial {
  zh: string;
  en: string;
}

export interface Tribe {
  id: TribeId;
  name: { zh: string; en: string };
  archetype: { zh: string; en: string };
  difficulty: 1 | 2 | 3 | 4 | 5;   // 1 = most beginner, 5 = advanced
  color: string;    // CSS color var token name
  icon: string;
  tagline: { zh: string; en: string };
  summary: { zh: string; en: string };

  heroPassive: { zh: string; en: string };
  specials: TribeSpecial[];
  strengths: { zh: string; en: string }[];
  weaknesses: { zh: string; en: string }[];

  units: Unit[];

  wallType: { name: { zh: string; en: string }; bonusPerLevel: number };
  merchant: { capacity: number; speed: number };
  defenseMix: { zh: string; en: string };

  offTips?: { zh: string; en: string }[];
  defTips?: { zh: string; en: string }[];
}
