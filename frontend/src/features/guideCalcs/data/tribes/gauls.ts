import { withUnitSpeeds } from '../tribes-types';

// Unit speeds are not in this file: withUnitSpeeds() adds them from
// src/data/unitSpeeds.gen.json (P0-15; ts11 in-game help / support.travian.com).

export const gauls = withUnitSpeeds({
  id: 'gauls',
  name: { zh: '高盧人', en: 'Gauls' },
  archetype: { zh: '速度 / 防禦型', en: 'Speed / Defense' },
  difficulty: 2,
  color: 'var(--tribe-gauls)',
  icon: '🌲',
  tagline: {
    zh: '全遊戲最快騎兵 · 堅固防禦',
    en: 'Fastest cavalry · Rock-solid defense',
  },
  summary: {
    zh: '速度與防禦並重：Theutates Thunder 是全遊戲最快的騎兵（速度 19），山洞容量 ×1.5，陷阱可以抓敵軍。防守首選，同時也能快速支援友軍。',
    en: 'Speed and defense. Theutates Thunder is the fastest cavalry in the game (speed 19). Crannies hold 1.5× more, and traps can catch attackers. Top defensive pick and still able to reinforce allies quickly.',
  },

  heroPassive: {
    zh: '英雄騎馬時速度 +5 格/小時',
    en: 'Hero gains +5 fields/hr when mounted',
  },

  specials: [
    { zh: '獵人陷阱（Trapper）：捕捉來襲部隊', en: 'Trapper building catches incoming raiders' },
    { zh: '山洞容量 ×1.5（其他族 ×1.0）', en: 'Cranny holds 1.5× resources (other tribes 1.0×)' },
    { zh: '木牆（Palisade）每級 +2.5% 防禦', en: 'Palisade: +2.5% defense per level' },
  ],

  strengths: [
    { zh: '最快的騎兵（TT 19、海頓聖騎 13）', en: 'Fastest cavalry (TT 19, 海頓聖騎 13)' },
    { zh: '最便宜的 settler，開村最快', en: 'Cheapest settlers, fastest expansion' },
    { zh: '陷阱 + 1.5× cranny 讓早期極難被掠奪', en: 'Trapper + 1.5× cranny makes early raiding nearly useless against Gauls' },
  ],

  weaknesses: [
    { zh: '方陣兵攻擊值僅 15，是最弱的攻擊步兵', en: 'Phalanx attack = 15, weakest attacking infantry' },
    { zh: '攻城器較貴（Trebuchet）', en: 'Siege weapons are expensive (Trebuchet)' },
  ],

  wallType: { name: { zh: '木牆 (Palisade)', en: 'Palisade' }, bonusPerLevel: 0.025 },
  merchant: { capacity: 750, speed: 24 },
  defenseMix: { zh: '60% 方陣兵 / 40% 德魯伊騎兵', en: '60% Phalanx / 40% Druidrider' },

  units: [
    { id: 'phalanx', category: 'infantry',
      name: { zh: '方陣兵', en: 'Phalanx' },
      attack: 15, defInfantry: 40, defCavalry: 50, upkeep: 1,
      cost: { wood: 100, clay: 130, iron: 55, crop: 30 }, trainTime: 1300,
      role: { zh: '便宜的全能防禦步兵', en: 'Cheap all-round defensive infantry' } },
    { id: 'swordsman', category: 'infantry',
      name: { zh: '劍士', en: 'Swordsman' },
      attack: 65, defInfantry: 35, defCavalry: 20, upkeep: 1,
      cost: { wood: 140, clay: 150, iron: 185, crop: 60 }, trainTime: 1800,
      role: { zh: '主要攻擊步兵', en: 'Main attacking infantry' } },
    { id: 'pathfinder', category: 'scout',
      name: { zh: '探路者', en: 'Pathfinder' },
      attack: 0, defInfantry: 20, defCavalry: 10, upkeep: 2,
      cost: { wood: 170, clay: 150, iron: 20, crop: 40 }, trainTime: 1700,
      role: { zh: '快速偵察', en: 'Fast scout' } },
    { id: 'theutatesThunder', category: 'cavalry',
      name: { zh: '雷法師', en: 'Theutates Thunder' },
      attack: 100, defInfantry: 25, defCavalry: 40, upkeep: 2,
      cost: { wood: 350, clay: 450, iron: 230, crop: 60 }, trainTime: 3100,
      role: { zh: '全遊戲最快騎兵，farm / 突襲利器', en: 'Fastest cavalry in the game; raiding / fast-strike' } },
    { id: 'druidrider', category: 'cavalry',
      name: { zh: '德魯伊騎兵', en: 'Druidrider' },
      attack: 45, defInfantry: 115, defCavalry: 55, upkeep: 2,
      cost: { wood: 360, clay: 330, iron: 280, crop: 120 }, trainTime: 3200,
      role: { zh: '高機動防禦騎兵', en: 'Mobile defensive cavalry' } },
    { id: 'haeduan', category: 'cavalry',
      name: { zh: '海頓聖騎', en: '海頓聖騎' },
      attack: 140, defInfantry: 60, defCavalry: 165, upkeep: 3,
      cost: { wood: 500, clay: 620, iron: 675, crop: 170 }, trainTime: 3900,
      role: { zh: '高盧人主力攻擊騎兵', en: 'Main Gaul offensive cavalry' } },
    { id: 'ram', category: 'siege',
      name: { zh: '破城槌', en: 'Ram' },
      attack: 50, defInfantry: 30, defCavalry: 105, upkeep: 3,
      cost: { wood: 950, clay: 555, iron: 330, crop: 75 }, trainTime: 5000,
      role: { zh: '破牆', en: 'Wall breaker' } },
    { id: 'trebuchet', category: 'siege',
      name: { zh: '投石機', en: 'Trebuchet' },
      attack: 70, defInfantry: 45, defCavalry: 10, upkeep: 6,
      cost: { wood: 960, clay: 1450, iron: 630, crop: 90 }, trainTime: 9000,
      role: { zh: '摧毀建築', en: 'Destroys buildings' } },
    { id: 'chieftain', category: 'chief',
      name: { zh: '族長', en: 'Chieftain' },
      attack: 40, defInfantry: 50, defCavalry: 50, upkeep: 4,
      cost: { wood: 30750, clay: 45400, iron: 31000, crop: 37500 }, trainTime: 90700,
      role: { zh: '降忠誠 / 征服', en: 'Reduces loyalty, conquers' } },
    { id: 'settler', category: 'settler',
      name: { zh: '開拓者', en: 'Settler' },
      attack: 0, defInfantry: 80, defCavalry: 80, upkeep: 1,
      cost: { wood: 4400, clay: 5600, iron: 4200, crop: 3900 }, trainTime: 22700,
      role: { zh: '最便宜開拓者', en: 'Cheapest settler — fastest expansion' } },
  ],

  offTips: [
    { zh: '錘子主力：海頓聖騎 + 劍士', en: 'Hammer core: 海頓聖騎 + Swordsman' },
    { zh: '早期 TT 農場效率超群（速度 19 + 75 搬運）', en: 'Early raiding is incredible with TTs (speed 19, 75 carry)' },
  ],
  defTips: [
    { zh: '鐵砧最常見配置：方陣 + 德魯伊騎兵', en: 'Standard anvil: Phalanx + Druidrider' },
    { zh: '首都早期可靠陷阱 + 1.5× cranny 渡過真空期', en: 'Early cap survives raids with Trappers + 1.5× cranny' },
  ],
});
