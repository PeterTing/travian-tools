# Town Hall and Celebrations

Source: Travian Support — [Culture Points (CP)](https://support.travian.com/en/support/solutions/articles/7000065115-culture-points-cp-), [Master Builder](https://support.travian.com/en/support/solutions/articles/7000062813-master-builder); Lumi/Eggstra/Dave guide (CP optimization chapter).

## Town Hall Basics

- Building: **Town Hall** (GID 24).
- Prerequisites: Main Building Lv 10 + Academy Lv 10.
- Max level: 20.
- Unlocks two celebration types.

## Celebration Types

| Type | CP | Duration | Cost (x1 server, Lv 10+ Town Hall) | Minimum Town Hall level |
|------|-----|----------|-------------------------------------|--------------------------|
| Small Celebration | +500 | 24 h | 6,400 wood / 6,650 clay / 4,000 iron / 9,000 crop | Lv 1 |
| Great Celebration | +2,000 | 60 h | 16,000 / 17,000 / 12,000 / 28,000 | **Lv 10** |

Costs scale linearly with server speed (x3 ≈ 3× per-hour cost).

## CP Math: Great Celebrations Are a Compound Engine

Running 24/7 Great Celebration chain from Town Hall Lv 10:

- 2,000 CP / 60 h ≈ **33.3 CP/hour ≈ 800 CP/day** (sustained)

Combined with passive CP from buildings:

- Main Building Lv 20 + Market Lv 20 + Academy Lv 20 + Embassy Lv 20 ≈ **529 CP/day** baseline
- With Great Celebration chain: **1,300+ CP/day** per village

By contrast, a village with NO Town Hall caps around 600 CP/day from passives alone.

## Passive CP Building Efficiency (Lumi "CP goats")

Buildings with the best CP/resource cost ratio across all levels:

- Main Building (GID 15)
- Marketplace (GID 17)
- Academy (GID 22)
- Embassy (GID 18)
- Town Hall (GID 24) — costly but Great Celebration amortizes the investment
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

- **Small** — quick CP when you lack 16k/17k/12k/28k resource pile
- **Great** — CP/hour ratio roughly 2× better; use whenever resources allow
- Great cost is fixed regardless of Town Hall level above 10 → Lv 10 is the sweet spot; higher Town Hall levels do not speed up celebrations

## Calculator Impact

Culture Points calculator (F2.x in PRD) should:

1. Distinguish passive CP from celebration CP
2. Show "with" vs "without" Town Hall Lv 10 CP/day in output
3. Recommend Small vs Great based on user's resource surplus
4. Flag Teuton users: Brewery vs chief-wave timing conflict
