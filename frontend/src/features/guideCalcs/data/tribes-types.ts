/**
 * Tribe + unit type definitions. All numbers are for 1x server speed.
 * Stats verified against kirilloid/travian source.
 *
 * Unit speed is the exception (P0-15 phase 1): it is not stored in the tribe
 * files any more. withUnitSpeeds() attaches it from src/data/unitSpeeds.gen.json
 * (ts11 in-game help / support.travian.com, generated with the backend copy).
 * Carry capacity works the same way (P0-23): one generated value per unit, the
 * same one the backend troops.json gets.
 */

import type { TribeId } from './travian';
import { unitSpeed, type UnitSpeedSource } from '@/data/unitSpeeds';
import { ingameUnitEn, ingameUnitName } from '@/lib/ingameNames';

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
  /** carry capacity — generated (unitSpeeds.gen.json), same as backend troops.json; null = not verified (Vikings), never treat as 0 */
  carry: number | null;
  upkeep: number;       // crop per hour
  cost: UnitCost;
  trainTime: number;    // seconds at 1x, building L1
  /** 花費／攻防／運載量／糧耗／訓練時間是 ts11 遊戲內說明頁讀到的（P0-18） */
  statsVerified: boolean;
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

/** Unit as written in the tribe files: everything except the generated speed and carry. */
export type UnitData = Omit<Unit, 'speed' | 'speedSource' | 'speedRef' | 'statsVerified' | 'carry'>;

export type TribeData = Omit<Tribe, 'units'> & { units: UnitData[] };

/** Attach the generated speed (one source of truth with the backend) to every unit. */
export function withUnitSpeeds(tribe: TribeData): Tribe {
  return {
    ...tribe,
    units: tribe.units.map(u => {
      const s = unitSpeed(tribe.id, u.id);
      if (!s) throw new Error(`no generated speed for ${tribe.id}.${u.id}`);
      const st = s.stats;
      // ts11 說明頁讀到的數字（P0-18）蓋掉檔案裡的舊數字；沒讀到的兵種維持原樣
      const fromTs11 = st
        ? {
            name: { ...u.name, zh: st.nameZh },
            attack: st.attack, defInfantry: st.defInf, defCavalry: st.defCav,
            upkeep: st.upkeep, trainTime: st.trainTime,
            cost: { wood: st.cost[0], clay: st.cost[1], iron: st.cost[2], crop: st.cost[3] },
          }
        : {};
      // 中文名一律讀名稱表（斯巴達、維京也是；#34），表裡沒有才用檔案裡的
      const zhName = ingameUnitName(tribe.id, u.id);
      // 英文名：維京照官方說明頁（S139），表裡沒有才用檔案裡的（斯巴達用檔案裡的，跟 ASIA x1 說明頁一樣）
      const enName = ingameUnitEn(tribe.id, u.id) ?? u.name.en;
      const named = zhName ? { name: { ...u.name, zh: zhName, en: enName } } : {};
      // 運載量一律用產生檔（跟後端 troops.json 同一份；P0-23）
      return { ...u, ...fromTs11, ...named, carry: s.carry, speed: s.speed, speedSource: s.source, speedRef: s.ref, statsVerified: !!st };
    }),
  };
}
