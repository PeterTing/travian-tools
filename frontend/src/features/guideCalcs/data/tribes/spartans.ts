import type { Tribe } from '../tribes-types';

// Spartans: T4.6 "Glory of Sparta" annual-special tribe (NOT in kirilloid repo —
// that source covers Romans/Teutons/Gauls/Egyptians/Huns but not Spartans/Vikings).
//
// Unit stats verified against the community data table posted in
// github.com/adipiciu/Travian-scripts/issues/24 (Spartans data,
// 2022-08-12 by WendelTytan, extracted from an in-game spartans.xlsx).
//
// Verification pass 2026-04-23: confirmed that all 10 units' values match the
// adipiciu table byte-for-byte. Alternative authoritative sources attempted:
//   - https://travian.fandom.com/wiki/Spartans         → 403 Forbidden
//   - https://blog.travian.com/2022/07/spartan-units-* → empty body after redirect
//   - https://support.travian.com/...spartans          → only prose, no stats
//   - kirilloid/travian repo                           → does not cover Spartans
// Therefore the WendelTytan / adipiciu table remains the sole detailed source
// we can cross-check against, and our file is consistent with it.

export const spartans: Tribe = {
  id: 'spartans',
  name: { zh: '斯巴達人', en: 'Spartans' },
  archetype: { zh: '精兵 / 軍事型', en: 'Elite military' },
  difficulty: 5,
  color: 'var(--tribe-spartans)',
  icon: '🛡️',
  tagline: {
    zh: 'Asclepeion 復活 60% 陣亡 · 英雄武器 +50% 同族',
    en: 'Asclepeion revives 60% of fallen · Hero weapons grant +50% to all Spartan units',
  },
  summary: {
    zh: '昂貴但效率極高：Asclepeion 戰後可復活 60% 陣亡單位，Ephor 獨特降忠誠機制，英雄武器對所有斯巴達人兵加成 +50%（其他族只給自己）。需要玩家了解深入機制。',
    en: 'Expensive but extremely efficient. Asclepeion revives 60% of fallen troops post-battle. Ephor has a unique loyalty-reduction mechanic. Hero weapons apply a +50% bonus to ALL Spartan units of the matching category (other tribes benefit only the wearer). Requires a deeper grasp of mechanics.',
  },

  heroPassive: {
    zh: '英雄武器加成適用於所有斯巴達人同類兵種 +50%',
    en: 'Hero weapon bonus applies to all Spartan units of the matching category (+50%)',
  },

  specials: [
    { zh: 'Asclepeion：戰鬥後可復活 60% 陣亡單位', en: 'Asclepeion: revives 60% of fallen troops after battle' },
    { zh: '防禦牆：每級 +2.5% 防禦', en: 'Palisade-style wall: +2.5% per level' },
    { zh: 'Ephor 降忠誠 20–25%', en: 'Ephor: reduces loyalty 20–25%' },
  ],

  strengths: [
    { zh: 'Asclepeion 讓戰損大幅降低（尤其 def）', en: 'Asclepeion drastically reduces losses (especially on def)' },
    { zh: 'Elpida Rider 高機動高防騎兵（120/90、速 16、carry 110）', en: 'Elpida Rider: fast heavy def cavalry (120/90, speed 16, carry 110)' },
    { zh: 'Corinthian Crusher 是全遊戲頂級 OFF 騎兵（攻擊 195）', en: 'Corinthian Crusher: one of the top OFF cavalry in the game (195 attack)' },
  ],

  weaknesses: [
    { zh: '兵種成本極高（440–2,315/單位總資源）', en: 'Very expensive per unit (440–2,315 total resources)' },
    { zh: '前期慢熱，需要穩定經濟支撐', en: 'Slow start, needs stable economy' },
    { zh: '非主流族，資料與範本比較少', en: 'Non-mainstream tribe, less community tooling' },
  ],

  wallType: { name: { zh: '防禦牆 (Defensive Wall)', en: 'Defensive Wall' }, bonusPerLevel: 0.025 },
  merchant: { capacity: 500, speed: 14 },
  defenseMix: { zh: 'Shieldsman + Elpida Rider (60/40)', en: 'Shieldsman + Elpida Rider (60/40)' },

  units: [
    { id: 'hoplite', category: 'infantry',
      name: { zh: '裝甲步兵', en: 'Hoplite' },
      attack: 50, defInfantry: 35, defCavalry: 30, speed: 6, carry: 60, upkeep: 1,
      cost: { wood: 110, clay: 185, iron: 110, crop: 35 }, trainTime: 1700,
      role: { zh: '基礎步兵', en: 'Basic infantry' } },
    { id: 'sentinel', category: 'scout',
      name: { zh: '哨兵', en: 'Sentinel' },
      attack: 0, defInfantry: 40, defCavalry: 22, speed: 9, carry: 0, upkeep: 1,
      cost: { wood: 185, clay: 150, iron: 35, crop: 75 }, trainTime: 1232,
      role: { zh: '步行偵察（高防）', en: 'Foot scout (high def)' } },
    { id: 'shieldsman', category: 'infantry',
      name: { zh: '盾牌手', en: 'Shieldsman' },
      attack: 40, defInfantry: 85, defCavalry: 45, speed: 8, carry: 40, upkeep: 1,
      cost: { wood: 145, clay: 95, iron: 245, crop: 45 }, trainTime: 1936,
      role: { zh: '防禦主力（速度 8 最快防禦步兵）', en: 'Defensive backbone (speed 8 = fastest def infantry)' } },
    { id: 'twinsteel', category: 'infantry',
      name: { zh: '雙鋼泰瑞恩', en: 'Twinsteel Therion' },
      attack: 90, defInfantry: 55, defCavalry: 40, speed: 6, carry: 50, upkeep: 1,
      cost: { wood: 130, clay: 200, iron: 400, crop: 65 }, trainTime: 2112,
      role: { zh: '高攻步兵', en: 'High-attack infantry' } },
    { id: 'elpida', category: 'cavalry',
      name: { zh: '爾必達騎士', en: 'Elpida Rider' },
      attack: 55, defInfantry: 120, defCavalry: 90, speed: 16, carry: 110, upkeep: 2,
      cost: { wood: 555, clay: 445, iron: 330, crop: 110 }, trainTime: 2816,
      role: { zh: '高速重防騎兵（carry 110 還可當 farm）', en: 'Fast heavy def cavalry (carry 110 doubles as farmer)' } },
    { id: 'corinthian', category: 'cavalry',
      name: { zh: '科林斯破壞者', en: 'Corinthian Crusher' },
      attack: 195, defInfantry: 80, defCavalry: 75, speed: 9, carry: 80, upkeep: 3,
      cost: { wood: 660, clay: 495, iron: 995, crop: 165 }, trainTime: 3432,
      role: { zh: 'OFF 主力重騎（攻擊 195 頂級）', en: 'Main OFF heavy cavalry (195 attack, top tier)' } },
    { id: 'ram', category: 'siege',
      name: { zh: '破城槌', en: 'Ram' },
      attack: 65, defInfantry: 30, defCavalry: 80, speed: 4, carry: 0, upkeep: 3,
      cost: { wood: 525, clay: 260, iron: 790, crop: 130 }, trainTime: 4620,
      role: { zh: '破牆', en: 'Wall breaker' } },
    { id: 'ballista', category: 'siege',
      name: { zh: '賴達投石機', en: 'Ballista' },
      attack: 50, defInfantry: 60, defCavalry: 10, speed: 3, carry: 0, upkeep: 6,
      cost: { wood: 550, clay: 1240, iron: 825, crop: 135 }, trainTime: 9900,
      role: { zh: '摧毀建築', en: 'Destroys buildings' } },
    { id: 'ephor', category: 'chief',
      name: { zh: '五長官', en: 'Ephor' },
      attack: 40, defInfantry: 60, defCavalry: 40, speed: 4, carry: 0, upkeep: 4,
      cost: { wood: 33450, clay: 30665, iron: 36240, crop: 13935 }, trainTime: 77550,
      role: { zh: '獨特降忠誠 20–25%', en: 'Unique 20–25% loyalty reduction' } },
    { id: 'settler', category: 'settler',
      name: { zh: '開拓者', en: 'Settler' },
      attack: 10, defInfantry: 80, defCavalry: 80, speed: 5, carry: 3000, upkeep: 1,
      cost: { wood: 5115, clay: 5580, iron: 6045, crop: 3255 }, trainTime: 34100,
      role: { zh: '建立新村莊', en: 'Establishes new villages' } },
  ],

  offTips: [
    { zh: '錘子主力：Twinsteel + Corinthian Crusher + Asclepeion（戰損低 40%）', en: 'Hammer: Twinsteel + Corinthian Crusher + Asclepeion (40% fewer net losses)' },
    { zh: '英雄武器 +50% 族內同類兵加成，投資英雄很划算', en: 'Hero weapon +50% to matching Spartan units — invest heavily in hero gear' },
  ],
  defTips: [
    { zh: '鐵砧：Shieldsman + Elpida Rider（60/40）；Asclepeion 讓 def 長線更划算', en: 'Anvil: 60% Shieldsman + 40% Elpida Rider; Asclepeion makes def a long-term investment' },
  ],
};
