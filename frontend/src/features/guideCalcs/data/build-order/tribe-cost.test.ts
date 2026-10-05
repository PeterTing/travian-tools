import { describe, it, expect } from 'vitest';
import { TRIBE_SETTLER_COST } from './tribe-cost';

describe('TRIBE_SETTLER_COST (all 7 tribes verified)', () => {
  it('Roman = 4600/4200/5800/4400 = 19000, training 26900s', () => {
    const c = TRIBE_SETTLER_COST.romans;
    expect([c.wood, c.clay, c.iron, c.crop]).toEqual([4600, 4200, 5800, 4400]);
    expect(c.total).toBe(19000);
    expect(c.trainingSeconds).toBe(26900);
    expect(c.verified).toBe(true);
  });

  it('Teuton = 5800/4400/4600/5200 = 20000, training 31000s', () => {
    const c = TRIBE_SETTLER_COST.teutons;
    expect([c.wood, c.clay, c.iron, c.crop]).toEqual([5800, 4400, 4600, 5200]);
    expect(c.total).toBe(20000);
    expect(c.trainingSeconds).toBe(31000);
  });

  it('Gaul = 4400/5600/4200/3900 = 18100, training 22700s', () => {
    const c = TRIBE_SETTLER_COST.gauls;
    expect([c.wood, c.clay, c.iron, c.crop]).toEqual([4400, 5600, 4200, 3900]);
    expect(c.total).toBe(18100);
    expect(c.trainingSeconds).toBe(22700);
  });

  it('Viking = 5800/4600/4800/4800 = 20000 (fixes website 54000 error)', () => {
    const c = TRIBE_SETTLER_COST.vikings;
    expect([c.wood, c.clay, c.iron, c.crop]).toEqual([5800, 4600, 4800, 4800]);
    expect(c.total).toBe(20000);
  });

  it('Egyptian = 5040/6510/4830/4620 = 21000 (fixes website 19000 error)', () => {
    const c = TRIBE_SETTLER_COST.egyptians;
    expect([c.wood, c.clay, c.iron, c.crop]).toEqual([5040, 6510, 4830, 4620]);
    expect(c.total).toBe(21000);
    expect(c.trainingSeconds).toBe(24800);
  });

  it('Hun = 6100/4600/4800/5400 = 20900', () => {
    const c = TRIBE_SETTLER_COST.huns;
    expect([c.wood, c.clay, c.iron, c.crop]).toEqual([6100, 4600, 4800, 5400]);
    expect(c.total).toBe(20900);
    expect(c.trainingSeconds).toBe(28950);
  });

  it('Spartan = 5115/5580/6045/3255 = 19995', () => {
    const c = TRIBE_SETTLER_COST.spartans;
    expect([c.wood, c.clay, c.iron, c.crop]).toEqual([5115, 5580, 6045, 3255]);
    expect(c.total).toBe(19995);
    expect(c.trainingSeconds).toBe(34100);
  });

  it('every wood/clay/iron/crop sums to total', () => {
    Object.entries(TRIBE_SETTLER_COST).forEach(([tribe, c]) => {
      expect(c.wood + c.clay + c.iron + c.crop, `${tribe} sum`).toBe(c.total);
    });
  });

  it('all 7 tribes have verified = true', () => {
    const tribes = ['romans', 'teutons', 'gauls', 'vikings', 'egyptians', 'huns', 'spartans'] as const;
    tribes.forEach((id) => {
      expect(TRIBE_SETTLER_COST[id].verified, `${id} verified`).toBe(true);
      expect(TRIBE_SETTLER_COST[id].source.length, `${id} source non-empty`).toBeGreaterThan(0);
    });
  });

  it('Egyptian settler has attack 0; all other tribes have attack 10', () => {
    expect(TRIBE_SETTLER_COST.egyptians.combat.attack).toBe(0);
    (['romans', 'teutons', 'gauls', 'vikings', 'huns', 'spartans'] as const).forEach((id) => {
      expect(TRIBE_SETTLER_COST[id].combat.attack, `${id} attack`).toBe(10);
    });
  });

  it('all tribes share defInf=80, defCav=80, speed=5, carry=3000, upkeep=1', () => {
    Object.values(TRIBE_SETTLER_COST).forEach((c) => {
      expect(c.combat.defInf).toBe(80);
      expect(c.combat.defCav).toBe(80);
      expect(c.combat.speed).toBe(5);
      expect(c.combat.carry).toBe(3000);
      expect(c.combat.upkeep).toBe(1);
    });
  });
});
