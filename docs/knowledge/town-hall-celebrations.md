# Town Hall and Celebrations

Source: Travian Support — [Culture Points (CP)](https://support.travian.com/en/support/solutions/articles/7000065115-culture-points-cp-), [Master Builder](https://support.travian.com/en/support/solutions/articles/7000062813-master-builder); Lumi/Eggstra/Dave guide (CP optimization chapter).

## Town Hall Basics

- Building: **Town Hall** (GID 24).
- Prerequisites: Main Building Lv 10 + Academy Lv 10.
- Max level: 20.
- Unlocks two celebration types.

## Celebration Types

Official rule (Help Center, [Celebrations and Town Hall](https://support.travian.com/en/articles/82-celebrations-and-town-hall)):
a celebration gives CP **equal to daily CP production**, up to a limit that depends on world speed
([Game Versions and Speed](https://support.travian.com/en/articles/20-game-versions-and-speed)).

| Type | CP gained | x1 / x2 limit | x3 / x5 limit | x10 limit | Cost (x1) | Min. Town Hall |
|------|-----------|---------------|---------------|-----------|-----------|----------------|
| Small Celebration | daily CP of **that village** | 500 | 250 | 125 | 6,400 / 6,650 / 5,940 / 1,340 (crop 待 ts11 驗證) | Lv 1 |
| Great Celebration | daily CP of **all your villages** | 2,000 | 1,000 | 500 | 29,700 / 33,250 / 32,000 / 6,700 (待 ts11 驗證) | **Lv 10** |

Duration at Town Hall Lv 1: 24 h on x1–x2, 12 h on x3–x5, 6 h on x10; higher Town Hall levels shorten it.

## CP Math: celebrations scale with what you already produce

- Early game a village makes ~10–20 CP/day (ts11 day 4: 12 CP/day), so a small celebration
  gives ~12 CP, **not** 500. Parties only pay off once a village makes a few hundred CP/day
  (small guide §4.1: hold parties from ~350 CP/day per village).
- A village at the 529 CP/day passive baseline (Main Building 20 + Market 20 + Embassy 20 +
  Academy 20 + Town Hall 10) hits the 500 small-celebration cap, so a back-to-back small chain
  roughly doubles its CP.
- A Great Celebration pays the whole account's daily CP (cap 2,000 on x1), so it only reaches
  the cap once the account makes 2,000+ CP/day.

The passive CP calculator (`/calculator/passive-cp`) uses exactly this rule.

## Passive CP Building Efficiency (Lumi "CP goats")

Buildings with the best CP/resource cost ratio across all levels:

- Main Building (GID 15)
- Marketplace (GID 17)
- Academy (GID 22)
- Embassy (GID 18)
- Town Hall (GID 24) — costly; celebrations only pay once daily CP is high
- Hospital (GID 46) — secondary pick; useful in defense villages

Feeder passive CP build: all four goats to Lv 20, then Town Hall to Lv 10.

## Loyalty Interaction

Great Celebration is the **only** way to push loyalty past 100% toward the 125% cap. Without a celebration, loyalty cannot exceed 100% regardless of Tablet of Law stacking.

## Brewery Side-Effect (Teuton Only)

- Brewery (GID 35, capital only): +1% attack per level **during celebrations**.
- Drawback during Brewery buff:
  - Chief persuasion halved (−50%)
  - Catapults can only target randomly
- Teuton attackers time Brewery to OPS but **not** to chief waves.

## Strategy Implications

- Every serious village (cap, hammer, anvil, feeder) should have Town Hall Lv 10+.
- Capital Town Hall Lv 10 should run Great Celebrations 24/7 starting Day 30–45.
- NPC villages can skip Town Hall if slots are tight.
- Tablet of Law hero consumable stacks with celebration-driven loyalty gain.

## Small vs Great Celebration Decision

- **Small** — CP = this village's daily CP (cap 500 on x1); worth it when the village makes a few hundred CP/day
- **Great** — CP = whole account's daily CP (cap 2,000 on x1); worth it once the account makes ~2,000 CP/day
- Compare the CP gained with the cost before every party; early on the cost per CP is enormous

## Calculator Impact

Culture Points calculator (F2.x in PRD) should:

1. Distinguish passive CP from celebration CP
2. Show "with" vs "without" Town Hall Lv 10 CP/day in output
3. Recommend Small vs Great based on user's resource surplus
4. Flag Teuton users: Brewery vs chief-wave timing conflict
