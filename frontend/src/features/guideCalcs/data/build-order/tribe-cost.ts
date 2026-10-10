/**
 * Settler cost + combat stats for all 7 tribes (1x server speed).
 *
 * Sources (P0-18; only first-hand numbers, no external tools):
 *   - Romans / Teutons / Gauls / Egyptians / Huns:
 *       ts11 in-game help (manual/troop/10, 20, 30, 60, 70), read 2026-10-10.
 *       The numbers are NOT typed here: they come from src/data/unitSpeeds.gen.json
 *       (scripts/game_data/gen_game_data.py, evidence/ts11_manual_2026-10-10.json).
 *   - Vikings:
 *       https://support.travian.com/en/articles/139-vikings-in-travian-legends
 *   - Spartans: no first-hand source yet (ts11 has no Spartans) -> verified=false,
 *       the UI shows 「待驗證」.
 *
 * Speed comes from the same generated file; null = no first-hand source (Spartans).
 */
import type { TribeId } from '../travian';
import { unitSpeed, unitSpeedValue } from '@/data/unitSpeeds';

export interface SettlerCombatStats {
  attack: number;
  defInf: number;
  defCav: number;
  /** Fields per hour (base travel speed); null = 待驗證. Generated, see header. */
  speed: number | null;
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

const STANDARD_COMBAT: Omit<SettlerCombatStats, 'speed'> = {
  attack: 10,
  defInf: 80,
  defCav: 80,
  carry: 3000,
  upkeep: 1,
};

const EGYPTIAN_COMBAT: Omit<SettlerCombatStats, 'speed'> = {
  ...STANDARD_COMBAT,
  attack: 0,
};

function settlerCombat(tribe: TribeId, base: Omit<SettlerCombatStats, 'speed'>): SettlerCombatStats {
  return { ...base, speed: unitSpeedValue(tribe, 'settler') };
}

/** ts11 說明頁讀到的開拓者（產生檔）；沒讀到就用 fallback（不應該發生，測試會擋） */
function ts11Settler(tribe: TribeId, fallback: SettlerCost): SettlerCost {
  const st = unitSpeed(tribe, 'settler')?.stats;
  if (!st) return fallback;
  const [wood, clay, iron, crop] = st.cost;
  return {
    wood, clay, iron, crop, total: wood + clay + iron + crop,
    trainingSeconds: st.trainTime,
    combat: { attack: st.attack, defInf: st.defInf, defCav: st.defCav, carry: st.carry, upkeep: st.upkeep, speed: unitSpeedValue(tribe, 'settler') },
    verified: true,
    source: `ts11 遊戲內說明 ${st.ref}（2026-10-10）`,
  };
}

const UNVERIFIED = 'ts11 還沒讀到（待驗證）';

export const TRIBE_SETTLER_COST: Record<TribeId, SettlerCost> = {
  romans: ts11Settler('romans', {
    wood: 4600, clay: 4200, iron: 5800, crop: 4400, total: 19000,
    trainingSeconds: 26900,
    combat: settlerCombat('romans', STANDARD_COMBAT),
    verified: false,
    source: UNVERIFIED,
  }),
  teutons: ts11Settler('teutons', {
    wood: 5800, clay: 4400, iron: 4600, crop: 5200, total: 20000,
    trainingSeconds: 31000,
    combat: settlerCombat('teutons', STANDARD_COMBAT),
    verified: false,
    source: UNVERIFIED,
  }),
  gauls: ts11Settler('gauls', {
    wood: 4400, clay: 5600, iron: 4200, crop: 3900, total: 18100,
    trainingSeconds: 22700,
    combat: settlerCombat('gauls', STANDARD_COMBAT),
    verified: false,
    source: UNVERIFIED,
  }),
  vikings: {
    wood: 5800, clay: 4600, iron: 4800, crop: 4800, total: 20000,
    trainingSeconds: 31000,
    combat: settlerCombat('vikings', STANDARD_COMBAT),
    verified: true,
    source: 'https://support.travian.com/en/articles/139-vikings-in-travian-legends',
  },
  egyptians: ts11Settler('egyptians', {
    wood: 5040, clay: 6510, iron: 4830, crop: 4620, total: 21000,
    trainingSeconds: 24800,
    combat: settlerCombat('egyptians', EGYPTIAN_COMBAT),
    verified: false,
    source: UNVERIFIED,
  }),
  huns: ts11Settler('huns', {
    wood: 6100, clay: 4600, iron: 4800, crop: 5400, total: 20900,
    trainingSeconds: 28950,
    combat: settlerCombat('huns', STANDARD_COMBAT),
    verified: false,
    source: UNVERIFIED,
  }),
  spartans: {
    wood: 5115, clay: 5580, iron: 6045, crop: 3255, total: 19995,
    trainingSeconds: 34100,
    combat: settlerCombat('spartans', STANDARD_COMBAT),
    verified: false,
    source: '沒有第一手來源（ts11 沒有斯巴達）：數字待驗證',
  },
};
