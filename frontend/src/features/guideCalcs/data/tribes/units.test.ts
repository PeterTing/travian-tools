/**
 * Snapshot tests pinning every unit's stats against the verified values
 * currently in the tribe data files. These were audited against
 * kirilloid/travian + support.travian.com; this suite guards against
 * accidental regressions.
 *
 * Each `it` pins: attack, defInfantry, defCavalry, speed, carry, upkeep,
 * cost (wood/clay/iron/crop), and trainTime.
 */

import { describe, it, expect } from 'vitest';
import type { Unit } from '../tribes-types';
import { romans } from './romans';
import { teutons } from './teutons';
import { gauls } from './gauls';
import { egyptians } from './egyptians';
import { huns } from './huns';
import { spartans } from './spartans';
import { vikings } from './vikings';

type PinnedStats = {
  attack: number;
  defInfantry: number;
  defCavalry: number;
  speed: number;
  carry: number;
  upkeep: number;
  cost: [number, number, number, number];
  trainTime: number;
};

function pin(u: Unit | undefined, s: PinnedStats) {
  expect(u).toBeDefined();
  if (!u) return;
  expect(u.attack).toBe(s.attack);
  expect(u.defInfantry).toBe(s.defInfantry);
  expect(u.defCavalry).toBe(s.defCavalry);
  expect(u.speed).toBe(s.speed);
  expect(u.carry).toBe(s.carry);
  expect(u.upkeep).toBe(s.upkeep);
  expect([u.cost.wood, u.cost.clay, u.cost.iron, u.cost.crop]).toEqual(s.cost);
  expect(u.trainTime).toBe(s.trainTime);
}

function find(units: Unit[], id: string): Unit | undefined {
  return units.find((x) => x.id === id);
}

// ---------------------------------------------------------------------------
// Romans
// ---------------------------------------------------------------------------

describe('Romans unit stats', () => {
  it('Legionnaire: atk 40 / defInf 35 / defCav 50 / speed 6 / carry 50 / upkeep 1', () => {
    pin(find(romans.units, 'legionnaire'), {
      attack: 40, defInfantry: 35, defCavalry: 50, speed: 6, carry: 50, upkeep: 1,
      cost: [120, 100, 150, 30], trainTime: 2000,
    });
  });

  it('Praetorian: atk 30 / defInf 65 / defCav 35 / speed 5 / carry 20 / upkeep 1', () => {
    pin(find(romans.units, 'praetorian'), {
      attack: 30, defInfantry: 65, defCavalry: 35, speed: 5, carry: 20, upkeep: 1,
      cost: [100, 130, 160, 70], trainTime: 2200,
    });
  });

  it('Imperian: atk 70 / defInf 40 / defCav 25 / speed 7 / carry 50 / upkeep 1', () => {
    pin(find(romans.units, 'imperian'), {
      attack: 70, defInfantry: 40, defCavalry: 25, speed: 7, carry: 50, upkeep: 1,
      cost: [150, 160, 210, 80], trainTime: 2400,
    });
  });

  it('Equites Legati: atk 0 / defInf 20 / defCav 10 / speed 16 / carry 0 / upkeep 2', () => {
    pin(find(romans.units, 'equitesLegati'), {
      attack: 0, defInfantry: 20, defCavalry: 10, speed: 16, carry: 0, upkeep: 2,
      cost: [140, 160, 20, 40], trainTime: 1700,
    });
  });

  it('Equites Imperatoris: atk 120 / defInf 65 / defCav 50 / speed 14 / carry 100 / upkeep 3', () => {
    pin(find(romans.units, 'equitesImperatoris'), {
      attack: 120, defInfantry: 65, defCavalry: 50, speed: 14, carry: 100, upkeep: 3,
      cost: [550, 440, 320, 100], trainTime: 3300,
    });
  });

  it('Equites Caesaris: atk 180 / defInf 80 / defCav 105 / speed 10 / carry 70 / upkeep 4', () => {
    pin(find(romans.units, 'equitesCaesaris'), {
      attack: 180, defInfantry: 80, defCavalry: 105, speed: 10, carry: 70, upkeep: 4,
      cost: [550, 640, 800, 180], trainTime: 4400,
    });
  });

  it('Battering Ram: atk 60 / defInf 30 / defCav 75 / speed 4 / carry 0 / upkeep 3', () => {
    pin(find(romans.units, 'ram'), {
      attack: 60, defInfantry: 30, defCavalry: 75, speed: 4, carry: 0, upkeep: 3,
      cost: [900, 360, 500, 70], trainTime: 4600,
    });
  });

  it('Fire Catapult: atk 75 / defInf 60 / defCav 10 / speed 3 / carry 0 / upkeep 6', () => {
    pin(find(romans.units, 'fireCatapult'), {
      attack: 75, defInfantry: 60, defCavalry: 10, speed: 3, carry: 0, upkeep: 6,
      cost: [950, 1350, 600, 90], trainTime: 9000,
    });
  });

  it('Senator: atk 50 / defInf 40 / defCav 30 / speed 4 / carry 0 / upkeep 5', () => {
    pin(find(romans.units, 'senator'), {
      attack: 50, defInfantry: 40, defCavalry: 30, speed: 4, carry: 0, upkeep: 5,
      cost: [30750, 27200, 45000, 37500], trainTime: 90700,
    });
  });

  it('Settler: atk 0 / defInf 80 / defCav 80 / speed 5 / carry 3000 / upkeep 1', () => {
    pin(find(romans.units, 'settler'), {
      attack: 0, defInfantry: 80, defCavalry: 80, speed: 5, carry: 3000, upkeep: 1,
      cost: [4600, 4200, 5800, 4400], trainTime: 26900,
    });
  });
});

// ---------------------------------------------------------------------------
// Teutons
// ---------------------------------------------------------------------------

describe('Teutons unit stats', () => {
  it('Clubswinger: atk 40 / defInf 20 / defCav 5 / speed 7 / carry 60 / upkeep 1', () => {
    pin(find(teutons.units, 'maceman'), {
      attack: 40, defInfantry: 20, defCavalry: 5, speed: 7, carry: 60, upkeep: 1,
      cost: [95, 75, 40, 40], trainTime: 900,
    });
  });

  it('Spearman: atk 10 / defInf 35 / defCav 60 / speed 7 / carry 40 / upkeep 1', () => {
    pin(find(teutons.units, 'spearman'), {
      attack: 10, defInfantry: 35, defCavalry: 60, speed: 7, carry: 40, upkeep: 1,
      cost: [145, 70, 85, 40], trainTime: 1400,
    });
  });

  it('Axeman: atk 60 / defInf 30 / defCav 30 / speed 6 / carry 50 / upkeep 1', () => {
    pin(find(teutons.units, 'axeman'), {
      attack: 60, defInfantry: 30, defCavalry: 30, speed: 6, carry: 50, upkeep: 1,
      cost: [130, 120, 170, 70], trainTime: 1500,
    });
  });

  it('Scout: atk 0 / defInf 10 / defCav 5 / speed 9 / carry 0 / upkeep 1', () => {
    pin(find(teutons.units, 'scout'), {
      attack: 0, defInfantry: 10, defCavalry: 5, speed: 9, carry: 0, upkeep: 1,
      cost: [160, 100, 50, 50], trainTime: 1400,
    });
  });

  it('Paladin: atk 55 / defInf 100 / defCav 40 / speed 10 / carry 110 / upkeep 2', () => {
    pin(find(teutons.units, 'paladin'), {
      attack: 55, defInfantry: 100, defCavalry: 40, speed: 10, carry: 110, upkeep: 2,
      cost: [370, 270, 290, 75], trainTime: 3000,
    });
  });

  it('Teutonic Knight: atk 150 / defInf 50 / defCav 75 / speed 9 / carry 80 / upkeep 3', () => {
    pin(find(teutons.units, 'tk'), {
      attack: 150, defInfantry: 50, defCavalry: 75, speed: 9, carry: 80, upkeep: 3,
      cost: [450, 515, 480, 80], trainTime: 3700,
    });
  });

  it('Ram: atk 65 / defInf 30 / defCav 80 / speed 4 / carry 0 / upkeep 3', () => {
    pin(find(teutons.units, 'ram'), {
      attack: 65, defInfantry: 30, defCavalry: 80, speed: 4, carry: 0, upkeep: 3,
      cost: [1000, 300, 350, 70], trainTime: 4200,
    });
  });

  it('Catapult: atk 50 / defInf 60 / defCav 10 / speed 3 / carry 0 / upkeep 6', () => {
    pin(find(teutons.units, 'catapult'), {
      attack: 50, defInfantry: 60, defCavalry: 10, speed: 3, carry: 0, upkeep: 6,
      cost: [900, 1200, 600, 60], trainTime: 9000,
    });
  });

  it('Chief: atk 40 / defInf 60 / defCav 40 / speed 4 / carry 0 / upkeep 4', () => {
    pin(find(teutons.units, 'chief'), {
      attack: 40, defInfantry: 60, defCavalry: 40, speed: 4, carry: 0, upkeep: 4,
      cost: [35500, 26600, 25000, 27200], trainTime: 70500,
    });
  });

  it('Settler: atk 10 / defInf 80 / defCav 80 / speed 5 / carry 3000 / upkeep 1', () => {
    pin(find(teutons.units, 'settler'), {
      attack: 10, defInfantry: 80, defCavalry: 80, speed: 5, carry: 3000, upkeep: 1,
      cost: [5800, 4400, 4600, 5200], trainTime: 31000,
    });
  });
});

// ---------------------------------------------------------------------------
// Gauls
// ---------------------------------------------------------------------------

describe('Gauls unit stats', () => {
  it('Phalanx: atk 15 / defInf 40 / defCav 50 / speed 7 / carry 35 / upkeep 1', () => {
    pin(find(gauls.units, 'phalanx'), {
      attack: 15, defInfantry: 40, defCavalry: 50, speed: 7, carry: 35, upkeep: 1,
      cost: [100, 130, 55, 30], trainTime: 1300,
    });
  });

  it('Swordsman: atk 65 / defInf 35 / defCav 20 / speed 6 / carry 45 / upkeep 1', () => {
    pin(find(gauls.units, 'swordsman'), {
      attack: 65, defInfantry: 35, defCavalry: 20, speed: 6, carry: 45, upkeep: 1,
      cost: [140, 150, 185, 60], trainTime: 1800,
    });
  });

  it('Pathfinder: atk 0 / defInf 20 / defCav 10 / speed 17 / carry 0 / upkeep 2', () => {
    pin(find(gauls.units, 'pathfinder'), {
      attack: 0, defInfantry: 20, defCavalry: 10, speed: 17, carry: 0, upkeep: 2,
      cost: [170, 150, 20, 40], trainTime: 1700,
    });
  });

  it('Theutates Thunder: atk 100 / defInf 25 / defCav 40 / speed 19 / carry 75 / upkeep 2', () => {
    pin(find(gauls.units, 'theutatesThunder'), {
      attack: 100, defInfantry: 25, defCavalry: 40, speed: 19, carry: 75, upkeep: 2,
      cost: [350, 450, 230, 60], trainTime: 3100,
    });
  });

  it('Druidrider: atk 45 / defInf 115 / defCav 55 / speed 16 / carry 35 / upkeep 2', () => {
    pin(find(gauls.units, 'druidrider'), {
      attack: 45, defInfantry: 115, defCavalry: 55, speed: 16, carry: 35, upkeep: 2,
      cost: [360, 330, 280, 120], trainTime: 3200,
    });
  });

  it('Haeduan: atk 140 / defInf 60 / defCav 165 / speed 13 / carry 65 / upkeep 3', () => {
    pin(find(gauls.units, 'haeduan'), {
      attack: 140, defInfantry: 60, defCavalry: 165, speed: 13, carry: 65, upkeep: 3,
      cost: [500, 620, 675, 170], trainTime: 3900,
    });
  });

  it('Ram: atk 50 / defInf 30 / defCav 105 / speed 4 / carry 0 / upkeep 3', () => {
    pin(find(gauls.units, 'ram'), {
      attack: 50, defInfantry: 30, defCavalry: 105, speed: 4, carry: 0, upkeep: 3,
      cost: [950, 555, 330, 75], trainTime: 5000,
    });
  });

  it('Trebuchet: atk 70 / defInf 45 / defCav 10 / speed 3 / carry 0 / upkeep 6', () => {
    pin(find(gauls.units, 'trebuchet'), {
      attack: 70, defInfantry: 45, defCavalry: 10, speed: 3, carry: 0, upkeep: 6,
      cost: [960, 1450, 630, 90], trainTime: 9000,
    });
  });

  it('Chieftain: atk 40 / defInf 50 / defCav 50 / speed 5 / carry 0 / upkeep 4', () => {
    pin(find(gauls.units, 'chieftain'), {
      attack: 40, defInfantry: 50, defCavalry: 50, speed: 5, carry: 0, upkeep: 4,
      cost: [30750, 45400, 31000, 37500], trainTime: 90700,
    });
  });

  it('Settler: atk 0 / defInf 80 / defCav 80 / speed 5 / carry 3000 / upkeep 1', () => {
    pin(find(gauls.units, 'settler'), {
      attack: 0, defInfantry: 80, defCavalry: 80, speed: 5, carry: 3000, upkeep: 1,
      cost: [4400, 5600, 4200, 3900], trainTime: 22700,
    });
  });
});

// ---------------------------------------------------------------------------
// Egyptians
// ---------------------------------------------------------------------------

describe('Egyptians unit stats', () => {
  it('Slave Militia: atk 10 / defInf 30 / defCav 20 / speed 7 / carry 15 / upkeep 1', () => {
    pin(find(egyptians.units, 'slaveMilitia'), {
      attack: 10, defInfantry: 30, defCavalry: 20, speed: 7, carry: 15, upkeep: 1,
      cost: [45, 60, 30, 15], trainTime: 530,
    });
  });

  it('Ash Warden: atk 30 / defInf 55 / defCav 40 / speed 6 / carry 50 / upkeep 1', () => {
    pin(find(egyptians.units, 'ashWarden'), {
      attack: 30, defInfantry: 55, defCavalry: 40, speed: 6, carry: 50, upkeep: 1,
      cost: [115, 100, 145, 60], trainTime: 1320,
    });
  });

  it('Khopesh Warrior: atk 65 / defInf 50 / defCav 20 / speed 7 / carry 45 / upkeep 1', () => {
    pin(find(egyptians.units, 'khopesh'), {
      attack: 65, defInfantry: 50, defCavalry: 20, speed: 7, carry: 45, upkeep: 1,
      cost: [170, 180, 220, 80], trainTime: 1440,
    });
  });

  it('Sopdu Explorer: atk 0 / defInf 20 / defCav 10 / speed 16 / carry 0 / upkeep 2', () => {
    pin(find(egyptians.units, 'sopdu'), {
      attack: 0, defInfantry: 20, defCavalry: 10, speed: 16, carry: 0, upkeep: 2,
      cost: [170, 150, 20, 40], trainTime: 1360,
    });
  });

  it('Anhur Guard: atk 50 / defInf 110 / defCav 50 / speed 15 / carry 50 / upkeep 2', () => {
    pin(find(egyptians.units, 'anhur'), {
      attack: 50, defInfantry: 110, defCavalry: 50, speed: 15, carry: 50, upkeep: 2,
      cost: [360, 330, 280, 120], trainTime: 2560,
    });
  });

  it('Resheph Chariot: atk 110 / defInf 120 / defCav 150 / speed 10 / carry 70 / upkeep 3', () => {
    pin(find(egyptians.units, 'resheph'), {
      attack: 110, defInfantry: 120, defCavalry: 150, speed: 10, carry: 70, upkeep: 3,
      cost: [450, 560, 610, 180], trainTime: 3240,
    });
  });

  it('Ram: atk 55 / defInf 30 / defCav 95 / speed 4 / carry 0 / upkeep 3', () => {
    pin(find(egyptians.units, 'ram'), {
      attack: 55, defInfantry: 30, defCavalry: 95, speed: 4, carry: 0, upkeep: 3,
      cost: [995, 575, 340, 80], trainTime: 4800,
    });
  });

  it('Stone Catapult: atk 65 / defInf 55 / defCav 10 / speed 3 / carry 0 / upkeep 6', () => {
    pin(find(egyptians.units, 'catapult'), {
      attack: 65, defInfantry: 55, defCavalry: 10, speed: 3, carry: 0, upkeep: 6,
      cost: [980, 1510, 660, 100], trainTime: 9000,
    });
  });

  it('Nomarch: atk 40 / defInf 50 / defCav 50 / speed 4 / carry 0 / upkeep 4', () => {
    pin(find(egyptians.units, 'nomarch'), {
      attack: 40, defInfantry: 50, defCavalry: 50, speed: 4, carry: 0, upkeep: 4,
      cost: [34000, 50000, 34000, 42000], trainTime: 90700,
    });
  });

  it('Settler: atk 0 / defInf 80 / defCav 80 / speed 5 / carry 3000 / upkeep 1', () => {
    pin(find(egyptians.units, 'settler'), {
      attack: 0, defInfantry: 80, defCavalry: 80, speed: 5, carry: 3000, upkeep: 1,
      cost: [5040, 6510, 4830, 4620], trainTime: 24800,
    });
  });
});

// ---------------------------------------------------------------------------
// Huns
// ---------------------------------------------------------------------------

describe('Huns unit stats', () => {
  it('Mercenary: atk 35 / defInf 40 / defCav 30 / speed 6 / carry 50 / upkeep 1', () => {
    pin(find(huns.units, 'mercenary'), {
      attack: 35, defInfantry: 40, defCavalry: 30, speed: 6, carry: 50, upkeep: 1,
      cost: [130, 80, 40, 40], trainTime: 810,
    });
  });

  it('Bowman: atk 50 / defInf 30 / defCav 10 / speed 6 / carry 30 / upkeep 1', () => {
    pin(find(huns.units, 'bowman'), {
      attack: 50, defInfantry: 30, defCavalry: 10, speed: 6, carry: 30, upkeep: 1,
      cost: [140, 110, 60, 60], trainTime: 1120,
    });
  });

  it('Spotter: atk 0 / defInf 20 / defCav 10 / speed 19 / carry 0 / upkeep 2', () => {
    pin(find(huns.units, 'spotter'), {
      attack: 0, defInfantry: 20, defCavalry: 10, speed: 19, carry: 0, upkeep: 2,
      cost: [170, 150, 20, 40], trainTime: 1360,
    });
  });

  it('Steppe Rider: atk 120 / defInf 30 / defCav 15 / speed 16 / carry 75 / upkeep 2', () => {
    pin(find(huns.units, 'steppeRider'), {
      attack: 120, defInfantry: 30, defCavalry: 15, speed: 16, carry: 75, upkeep: 2,
      cost: [290, 370, 190, 45], trainTime: 2400,
    });
  });

  it('Marksman: atk 110 / defInf 80 / defCav 70 / speed 15 / carry 105 / upkeep 2', () => {
    pin(find(huns.units, 'marksman'), {
      attack: 110, defInfantry: 80, defCavalry: 70, speed: 15, carry: 105, upkeep: 2,
      cost: [320, 350, 330, 50], trainTime: 2480,
    });
  });

  it('Marauder: atk 180 / defInf 60 / defCav 40 / speed 14 / carry 80 / upkeep 3', () => {
    pin(find(huns.units, 'marauder'), {
      attack: 180, defInfantry: 60, defCavalry: 40, speed: 14, carry: 80, upkeep: 3,
      cost: [450, 560, 610, 140], trainTime: 2990,
    });
  });

  it('Ram: atk 65 / defInf 30 / defCav 90 / speed 4 / carry 0 / upkeep 3', () => {
    pin(find(huns.units, 'ram'), {
      attack: 65, defInfantry: 30, defCavalry: 90, speed: 4, carry: 0, upkeep: 3,
      cost: [1060, 330, 360, 70], trainTime: 4400,
    });
  });

  it('Catapult: atk 45 / defInf 55 / defCav 10 / speed 3 / carry 0 / upkeep 6', () => {
    pin(find(huns.units, 'catapult'), {
      attack: 45, defInfantry: 55, defCavalry: 10, speed: 3, carry: 0, upkeep: 6,
      cost: [950, 1280, 620, 60], trainTime: 9000,
    });
  });

  it('Logades: atk 50 / defInf 40 / defCav 30 / speed 5 / carry 0 / upkeep 4', () => {
    pin(find(huns.units, 'logades'), {
      attack: 50, defInfantry: 40, defCavalry: 30, speed: 5, carry: 0, upkeep: 4,
      cost: [37200, 27600, 25200, 27600], trainTime: 90700,
    });
  });

  it('Settler: atk 0 / defInf 80 / defCav 80 / speed 5 / carry 3000 / upkeep 1', () => {
    pin(find(huns.units, 'settler'), {
      attack: 10, defInfantry: 80, defCavalry: 80, speed: 5, carry: 3000, upkeep: 1,
      cost: [6100, 4600, 4800, 5400], trainTime: 28950,
    });
  });
});

// ---------------------------------------------------------------------------
// Spartans
// ---------------------------------------------------------------------------

describe('Spartans unit stats', () => {
  it('Hoplite: atk 50 / defInf 35 / defCav 30 / speed 6 / carry 60 / upkeep 1', () => {
    pin(find(spartans.units, 'hoplite'), {
      attack: 50, defInfantry: 35, defCavalry: 30, speed: 6, carry: 60, upkeep: 1,
      cost: [110, 185, 110, 35], trainTime: 1700,
    });
  });

  it('Sentinel: atk 0 / defInf 40 / defCav 22 / speed 9 / carry 0 / upkeep 1', () => {
    pin(find(spartans.units, 'sentinel'), {
      attack: 0, defInfantry: 40, defCavalry: 22, speed: 9, carry: 0, upkeep: 1,
      cost: [185, 150, 35, 75], trainTime: 1232,
    });
  });

  it('Shieldsman: atk 40 / defInf 85 / defCav 45 / speed 8 / carry 40 / upkeep 1', () => {
    pin(find(spartans.units, 'shieldsman'), {
      attack: 40, defInfantry: 85, defCavalry: 45, speed: 8, carry: 40, upkeep: 1,
      cost: [145, 95, 245, 45], trainTime: 1936,
    });
  });

  it('Twinsteel Therion: atk 90 / defInf 55 / defCav 40 / speed 6 / carry 50 / upkeep 1', () => {
    pin(find(spartans.units, 'twinsteel'), {
      attack: 90, defInfantry: 55, defCavalry: 40, speed: 6, carry: 50, upkeep: 1,
      cost: [130, 200, 400, 65], trainTime: 2112,
    });
  });

  it('Elpida Rider: atk 55 / defInf 120 / defCav 90 / speed 16 / carry 110 / upkeep 2', () => {
    pin(find(spartans.units, 'elpida'), {
      attack: 55, defInfantry: 120, defCavalry: 90, speed: 16, carry: 110, upkeep: 2,
      cost: [555, 445, 330, 110], trainTime: 2816,
    });
  });

  it('Corinthian Crusher: atk 195 / defInf 80 / defCav 75 / speed 9 / carry 80 / upkeep 3', () => {
    pin(find(spartans.units, 'corinthian'), {
      attack: 195, defInfantry: 80, defCavalry: 75, speed: 9, carry: 80, upkeep: 3,
      cost: [660, 495, 995, 165], trainTime: 3432,
    });
  });

  it('Ram: atk 65 / defInf 30 / defCav 80 / speed 4 / carry 0 / upkeep 3', () => {
    pin(find(spartans.units, 'ram'), {
      attack: 65, defInfantry: 30, defCavalry: 80, speed: 4, carry: 0, upkeep: 3,
      cost: [525, 260, 790, 130], trainTime: 4620,
    });
  });

  it('Ballista: atk 50 / defInf 60 / defCav 10 / speed 3 / carry 0 / upkeep 6', () => {
    pin(find(spartans.units, 'ballista'), {
      attack: 50, defInfantry: 60, defCavalry: 10, speed: 3, carry: 0, upkeep: 6,
      cost: [550, 1240, 825, 135], trainTime: 9900,
    });
  });

  it('Ephor: atk 40 / defInf 60 / defCav 40 / speed 4 / carry 0 / upkeep 4', () => {
    pin(find(spartans.units, 'ephor'), {
      attack: 40, defInfantry: 60, defCavalry: 40, speed: 4, carry: 0, upkeep: 4,
      cost: [33450, 30665, 36240, 13935], trainTime: 77550,
    });
  });

  it('Settler: atk 10 / defInf 80 / defCav 80 / speed 5 / carry 3000 / upkeep 1', () => {
    pin(find(spartans.units, 'settler'), {
      attack: 10, defInfantry: 80, defCavalry: 80, speed: 5, carry: 3000, upkeep: 1,
      cost: [5115, 5580, 6045, 3255], trainTime: 34100,
    });
  });
});

// ---------------------------------------------------------------------------
// Vikings
// ---------------------------------------------------------------------------

describe('Vikings unit stats', () => {
  it('Thrall: atk 45 / defInf 22 / defCav 5 / speed 7 / carry 50 / upkeep 1', () => {
    pin(find(vikings.units, 'thrall'), {
      attack: 45, defInfantry: 22, defCavalry: 5, speed: 7, carry: 50, upkeep: 1,
      cost: [95, 80, 50, 40], trainTime: 800,
    });
  });

  it('Shield Maiden: atk 20 / defInf 50 / defCav 30 / speed 7 / carry 30 / upkeep 1', () => {
    pin(find(vikings.units, 'shieldMaiden'), {
      attack: 20, defInfantry: 50, defCavalry: 30, speed: 7, carry: 30, upkeep: 1,
      cost: [125, 70, 85, 40], trainTime: 1080,
    });
  });

  it('Berserker: atk 70 / defInf 30 / defCav 25 / speed 5 / carry 60 / upkeep 2', () => {
    pin(find(vikings.units, 'berserker'), {
      attack: 70, defInfantry: 30, defCavalry: 25, speed: 5, carry: 60, upkeep: 2,
      cost: [235, 220, 200, 70], trainTime: 1550,
    });
  });

  it("Heimdall's Eye: atk 0 / defInf 10 / defCav 5 / speed 9 / carry 0 / upkeep 1", () => {
    pin(find(vikings.units, 'heimdallsEye'), {
      attack: 0, defInfantry: 10, defCavalry: 5, speed: 9, carry: 0, upkeep: 1,
      cost: [155, 95, 50, 50], trainTime: 1120,
    });
  });

  it('Huskarl Rider: atk 45 / defInf 95 / defCav 100 / speed 12 / carry 50 / upkeep 2', () => {
    pin(find(vikings.units, 'huskarlRider'), {
      attack: 45, defInfantry: 95, defCavalry: 100, speed: 12, carry: 50, upkeep: 2,
      cost: [385, 295, 290, 85], trainTime: 2650,
    });
  });

  it("Valkyrie's Blessing: atk 160 / defInf 50 / defCav 75 / speed 9 / carry 70 / upkeep 2", () => {
    pin(find(vikings.units, 'valkyrie'), {
      attack: 160, defInfantry: 50, defCavalry: 75, speed: 9, carry: 70, upkeep: 2,
      cost: [475, 535, 515, 100], trainTime: 3060,
    });
  });

  it('Ram: atk 65 / defInf 30 / defCav 80 / speed 4 / carry 0 / upkeep 3', () => {
    pin(find(vikings.units, 'ram'), {
      attack: 65, defInfantry: 30, defCavalry: 80, speed: 4, carry: 0, upkeep: 3,
      cost: [950, 325, 375, 70], trainTime: 4200,
    });
  });

  it('Catapult: atk 50 / defInf 60 / defCav 10 / speed 3 / carry 0 / upkeep 6', () => {
    pin(find(vikings.units, 'catapult'), {
      attack: 50, defInfantry: 60, defCavalry: 10, speed: 3, carry: 0, upkeep: 6,
      cost: [850, 1225, 625, 60], trainTime: 9000,
    });
  });

  it('Jarl: atk 40 / defInf 40 / defCav 60 / speed 5 / carry 0 / upkeep 4', () => {
    pin(find(vikings.units, 'jarl'), {
      attack: 40, defInfantry: 40, defCavalry: 60, speed: 5, carry: 0, upkeep: 4,
      cost: [35500, 26600, 25000, 27200], trainTime: 70500,
    });
  });

  it('Settler: atk 10 / defInf 80 / defCav 80 / speed 5 / carry 3000 / upkeep 1', () => {
    pin(find(vikings.units, 'settler'), {
      attack: 10, defInfantry: 80, defCavalry: 80, speed: 5, carry: 3000, upkeep: 1,
      cost: [5800, 4600, 4800, 4800], trainTime: 31000,
    });
  });
});
