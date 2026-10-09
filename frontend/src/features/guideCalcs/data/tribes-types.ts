/**
 * Tribe + unit type definitions. All numbers are for 1x server speed.
 * Stats verified against kirilloid/travian source.
 *
 * Unit speed is the exception (P0-15 phase 1): it is not stored in the tribe
 * files any more. withUnitSpeeds() attaches it from src/data/unitSpeeds.gen.json
 * (ts11 in-game help / support.travian.com, generated with the backend copy).
 */

import type { TribeId } from './travian';
import { unitSpeed, type UnitSpeedSource } from '@/data/unitSpeeds';

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
  speed: number | null; // fields/hour at 1x; null = no first-hand source yet (待驗證)
  speedSource: UnitSpeedSource;
  speedRef: string | null;
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

/** Unit as written in the tribe files: everything except the generated speed. */
export type UnitData = Omit<Unit, 'speed' | 'speedSource' | 'speedRef'>;

export type TribeData = Omit<Tribe, 'units'> & { units: UnitData[] };

/** Attach the generated speed (one source of truth with the backend) to every unit. */
export function withUnitSpeeds(tribe: TribeData): Tribe {
  return {
    ...tribe,
    units: tribe.units.map(u => {
      const s = unitSpeed(tribe.id, u.id);
      if (!s) throw new Error(`no generated speed for ${tribe.id}.${u.id}`);
      return { ...u, speed: s.speed, speedSource: s.source, speedRef: s.ref };
    }),
  };
}
