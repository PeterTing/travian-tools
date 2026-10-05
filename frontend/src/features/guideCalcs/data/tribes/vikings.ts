import type { Tribe } from '../tribes-types';

// Vikings: T4.6 "Northern Legends" annual-special tribe (2024).
// Source: support.travian.com/en/support/solutions/articles/7000090975-vikings-in-travian-legends (verified 2026-04-23)
// All combat stats, costs, upkeep, speed, and training times pulled from the
// official Travian support article. Carry capacity values are not published on
// that page; values below follow standard Travian category conventions
// (raiders higher, defensive infantry moderate, cavalry moderate, siege 0).

export const vikings: Tribe = {
  id: 'vikings',
  name: { zh: '維京人', en: 'Vikings' },
  archetype: { zh: '海陸兩棲 · 掠奪強化', en: 'Amphibious raider' },
  difficulty: 4,
  color: 'var(--tribe-vikings)',
  icon: '⚔️',
  tagline: {
    zh: '深水 24 格/小時 · Berserker 死前反擊',
    en: 'Deep water 24 fields/hr · Berserker death-retaliation',
  },
  summary: {
    zh: '兩棲民族：深水移動比其他族快（24 格/小時 vs 18），適合跨水域作戰。Berserker 吃雙倍糧，攻擊 / 被攻擊時陣亡後還會「死前反擊」一次殺一名敵軍（忽略牆與瞭望塔加成）。Jarl 降忠誠 15–30%。',
    en: 'Amphibious tribe. Over-water movement 24 fields/hr (others 18), great for cross-map operations. Berserker costs 2× crop upkeep but each fallen Berserker kills one enemy via a "damage on death" ability that ignores wall/watchtower bonuses. Jarl reduces loyalty 15–30%.',
  },

  heroPassive: {
    zh: '英雄在水域移動速度不減',
    en: 'Hero retains full speed on water tiles',
  },

  specials: [
    { zh: '深水移動速度 24 格/小時（他族 18）', en: 'Deep-water movement 24 fields/hr (others 18)' },
    { zh: '船隻系統：專屬運兵 / 戰船', en: 'Ship system: transports + warships' },
    { zh: 'Barricade：每級 +1.5% 防禦（較弱）', en: 'Barricade: +1.5% defense per level (weak wall)' },
  ],

  strengths: [
    { zh: '跨水域戰場機動性無敵', en: 'Unmatched mobility on water-heavy maps' },
    { zh: 'Berserker 死前反擊讓進攻方吃虧', en: 'Berserker damage-on-death punishes attackers hitting defensive stacks' },
  ],

  weaknesses: [
    { zh: '陸地上優勢較小', en: 'Fewer advantages on purely land maps' },
    { zh: '主力攻擊步兵（Berserker）速度僅 5 格/小時', en: 'Main offensive infantry (Berserker) only 5 fields/hr' },
  ],

  wallType: { name: { zh: '障礙物 (Barricade)', en: 'Barricade' }, bonusPerLevel: 0.015 },
  merchant: { capacity: 750, speed: 18 },
  defenseMix: { zh: 'Shield Maiden + Huskarl Rider 為主', en: 'Shield Maiden + Huskarl Rider focus' },

  units: [
    { id: 'thrall', category: 'infantry',
      name: { zh: '奴隸', en: 'Thrall' },
      attack: 45, defInfantry: 22, defCavalry: 5, speed: 7, carry: 50, upkeep: 1,
      cost: { wood: 95, clay: 80, iron: 50, crop: 40 }, trainTime: 800,
      role: { zh: '基礎快訓練掠奪步兵', en: 'Cheap fast-trained raiding infantry' } },
    { id: 'shieldMaiden', category: 'infantry',
      name: { zh: '鋼盾少女', en: 'Shield Maiden' },
      attack: 20, defInfantry: 50, defCavalry: 30, speed: 7, carry: 30, upkeep: 1,
      cost: { wood: 125, clay: 70, iron: 85, crop: 40 }, trainTime: 1080,
      role: { zh: '防禦步兵', en: 'Defensive infantry' } },
    { id: 'berserker', category: 'infantry',
      name: { zh: '狂戰士', en: 'Berserker' },
      attack: 70, defInfantry: 30, defCavalry: 25, speed: 5, carry: 60, upkeep: 2,
      cost: { wood: 235, clay: 220, iron: 200, crop: 70 }, trainTime: 1550,
      role: { zh: '攻擊步兵，死前反擊（每死 1 隻殺敵 1 隻，忽略牆）', en: 'Attack infantry with damage-on-death (each kills 1 enemy on death, ignoring wall/watchtower)' } },
    { id: 'heimdallsEye', category: 'scout',
      name: { zh: "海姆達爾之眼", en: "Heimdall's Eye" },
      attack: 0, defInfantry: 10, defCavalry: 5, speed: 9, carry: 0, upkeep: 1,
      cost: { wood: 155, clay: 95, iron: 50, crop: 50 }, trainTime: 1120,
      role: { zh: '偵察單位', en: 'Scout unit' } },
    { id: 'huskarlRider', category: 'cavalry',
      name: { zh: '禁衛軍騎士', en: 'Huskarl Rider' },
      attack: 45, defInfantry: 95, defCavalry: 100, speed: 12, carry: 50, upkeep: 2,
      cost: { wood: 385, clay: 295, iron: 290, crop: 85 }, trainTime: 2650,
      role: { zh: '全能防禦騎兵', en: 'All-round defensive cavalry' } },
    { id: 'valkyrie', category: 'cavalry',
      name: { zh: "女武神的祝福", en: "Valkyrie's Blessing" },
      attack: 160, defInfantry: 50, defCavalry: 75, speed: 9, carry: 70, upkeep: 2,
      cost: { wood: 475, clay: 535, iron: 515, crop: 100 }, trainTime: 3060,
      role: { zh: 'OFF 重騎（upkeep 2 比其他重騎便宜）', en: 'Offensive heavy cavalry (upkeep 2 = cheaper than other heavies)' } },
    { id: 'ram', category: 'siege',
      name: { zh: '破城槌', en: 'Ram' },
      attack: 65, defInfantry: 30, defCavalry: 80, speed: 4, carry: 0, upkeep: 3,
      cost: { wood: 950, clay: 325, iron: 375, crop: 70 }, trainTime: 4200,
      role: { zh: '破牆', en: 'Wall breaker' } },
    { id: 'catapult', category: 'siege',
      name: { zh: '弩炮', en: 'Catapult' },
      attack: 50, defInfantry: 60, defCavalry: 10, speed: 3, carry: 0, upkeep: 6,
      cost: { wood: 850, clay: 1225, iron: 625, crop: 60 }, trainTime: 9000,
      role: { zh: '摧毀建築', en: 'Destroys buildings' } },
    { id: 'jarl', category: 'chief',
      name: { zh: '首領', en: 'Jarl' },
      attack: 40, defInfantry: 40, defCavalry: 60, speed: 5, carry: 0, upkeep: 4,
      cost: { wood: 35500, clay: 26600, iron: 25000, crop: 27200 }, trainTime: 70500,
      role: { zh: '降忠誠 15–30% / 征服', en: 'Reduces loyalty 15–30%, conquers' } },
    { id: 'settler', category: 'settler',
      name: { zh: '開拓者', en: 'Settler' },
      attack: 10, defInfantry: 80, defCavalry: 80, speed: 5, carry: 3000, upkeep: 1,
      cost: { wood: 5800, clay: 4600, iron: 4800, crop: 4800 }, trainTime: 31000,
      role: { zh: '建立新村莊', en: 'Establishes new villages' } },
  ],

  offTips: [
    { zh: '錘子主力：Berserker + Valkyrie\'s Blessing，配合 Thrall 當便宜增補', en: "Hammer: Berserker + Valkyrie's Blessing, with Thralls as cheap filler" },
    { zh: '跨海 OP 優勢大（水上 24/小時 vs 他族 18）', en: 'Cross-water ops have a big speed edge (24/hr vs 18)' },
  ],
  defTips: [
    { zh: '鐵砧：Shield Maiden + Huskarl Rider', en: 'Anvil: Shield Maiden + Huskarl Rider' },
    { zh: 'Berserker 也可當 def — 雖然 def 值低，但死前反擊會折損進攻方', en: "Berserkers can also join def — low def values but death-retaliation erodes the attacker" },
  ],
};
