# Travian Build Templates: Complete Research & Strategy Document

> **Sources**: Official [Travian Support KB](https://support.travian.com/en/support/solutions), [kirilloid.ru](https://kirilloid.ru/travian/) building stats, community guides (Reddit, Fandom, BlogSpot).
> **Last Updated**: 2026-02-25

---

## Table of Contents

1. [Complete GID Reference](#1-complete-gid-reference)
2. [Prerequisite Tech Trees](#2-prerequisite-tech-trees)
3. [Tribe Analysis: Strengths, Weaknesses & Unique Buildings](#3-tribe-analysis)
4. [Wall Comparison by Tribe](#4-wall-comparison-by-tribe)
5. [Resource Field Upgrade Strategy](#5-resource-field-upgrade-strategy)
6. [Resource Cost Analysis of Key Buildings](#6-resource-cost-analysis-of-key-buildings)
7. [Template Design Philosophy](#7-template-design-philosophy)
8. [Template Definitions & Build Orders](#8-template-definitions--build-orders)
9. [Synergy with even_resources Algorithm](#9-synergy-with-even_resources-algorithm)
10. [Known Limitations & Future Work](#10-known-limitations--future-work)

---

## 1. Complete GID Reference

### Resource Fields (Slots 1-18)

| GID | Name       | Cost Bias (High→Low) | Notes                    |
|-----|------------|----------------------|--------------------------|
| 1   | Woodcutter | Clay > Crop > Iron > Wood | Main wood producer  |
| 2   | Clay Pit   | Wood = Iron > Crop > Clay | Main clay producer  |
| 3   | Iron Mine  | Wood > Clay > Crop > Iron | Main iron producer  |
| 4   | Cropland   | Clay > Wood = Iron > Crop | Main food producer  |

### Production Boost Buildings

| GID | Name          | Requires                          | Boost   |
|-----|---------------|-----------------------------------|---------|
| 5   | Grain Mill    | Cropland Lv 5                     | +5%/Lv crop |
| 6   | Sawmill       | Woodcutter Lv 10, MB 5            | +5%/Lv wood |
| 7   | Brickyard     | Clay Pit Lv 10, MB 5              | +5%/Lv clay |
| 8   | Iron Foundry  | Iron Mine Lv 10, MB 5             | +5%/Lv iron |
| 9   | Bakery        | Grain Mill Lv 5, Cropland Lv 10, MB 5 | +5%/Lv crop |

### Infrastructure Buildings (Town Slots 19+)

| GID | Name              | Prerequisites                    | Cost Bias     |
|-----|-------------------|----------------------------------|---------------|
| 10  | Warehouse         | MB 1                             | Wood/Iron     |
| 11  | Granary           | MB 1                             | Wood/Clay     |
| 15  | Main Building     | —                                | Balanced      |
| 16  | Rally Point       | —                                | Balanced      |
| 17  | Marketplace       | MB 1, WH 1, Granary 1           | Balanced      |
| 18  | Embassy           | MB 1                             | Clay-heavy    |
| 23  | Cranny            | —                                | Clay/Crop     |
| 24  | Town Hall         | Academy 10, MB 10                | Wood/Clay     |
| 25  | Residence         | MB 5 (conflicts with Palace)     | Wood/Clay     |
| 26  | Palace            | MB 5 (conflicts with Residence)  | Balanced      |
| 27  | Treasury          | MB 10                            | Wood/Clay     |
| 28  | Trade Office      | Marketplace 20, Stable 10        | Clay/Iron     |
| 34  | Stonemason's Lodge| MB 5, Palace 3 — **Capital only**| Balanced      |
| 37  | Hero's Mansion    | MB 3, Rally Point 1              | Wood/Clay/Iron|
| 38  | Great Warehouse   | MB 10 — **non-capital only**     | Wood          |
| 39  | Great Granary     | MB 10 — **non-capital only**     | Wood/Clay     |

### Military Buildings

| GID | Name              | Prerequisites                    | Cost Bias     |
|-----|-------------------|----------------------------------|---------------|
| 13  | Smithy            | Academy 3, MB 3                  | **Iron-heavy**|
| 14  | Tournament Square | Rally Point 15                   | Wood/Clay     |
| 19  | Barracks          | MB 3, Rally Point 1              | Wood/Clay     |
| 20  | Stable            | Barracks 3, Academy 5            | Wood/Clay/Iron|
| 21  | Workshop          | Academy 10, MB 5                 | Wood/Clay     |
| 22  | Academy           | MB 3, Barracks 3                 | **Wood/Clay heavy** |
| 29  | Great Barracks    | Barracks 20 — **non-capital**    | Wood/Clay     |
| 30  | Great Stable      | Stable 20 — **non-capital**      | Wood/Iron     |
| 46  | Hospital          | **MB 10, Academy 15**            | Wood/Iron     |

### Tribe-Specific Buildings

| GID | Name                  | Tribe      | Prerequisites              |
|-----|-----------------------|------------|----------------------------|
| 31  | City Wall             | **Roman**  | —                          |
| 32  | Earth Wall            | **Teuton** | —                          |
| 33  | Palisade              | **Gaul**   | —                          |
| 34  | Stonemason's Lodge    | All (Capital) | MB 5, Palace 3          |
| 35  | Brewery               | **Teuton** | Rally Point 10, Granary 20 — **Capital only** |
| 36  | Trapper               | **Gaul**   | Rally Point 1              |
| 41  | Horse Drinking Trough | **Roman**  | Rally Point 10, Stable 20  |

---

## 2. Prerequisite Tech Trees

### Military Unlock Chain

```
Main Building Lv 3
├── Rally Point Lv 1
│   ├── Barracks (GID 19)
│   │   ├── Barracks Lv 3 + Academy Lv 5
│   │   │   └── Stable (GID 20)          ← Cavalry
│   │   └── Barracks Lv 3
│   │       └── Academy (GID 22)
│   │           ├── Academy Lv 3
│   │           │   └── Smithy (GID 13)   ← Unit upgrades
│   │           ├── Academy Lv 5
│   │           │   └── Stable (GID 20)
│   │           ├── Academy Lv 10 + MB 5
│   │           │   └── Workshop (GID 21) ← Siege
│   │           ├── Academy Lv 10 + MB 10
│   │           │   └── Town Hall (GID 24) ← Celebrations
│   │           └── Academy Lv 15 + MB 10
│   │               └── Hospital (GID 46) ← Troop healing
│   └── Rally Point Lv 15
│       └── Tournament Square (GID 14)    ← Speed boost
└── Hero's Mansion (GID 37)               ← Adventures / Oasis
```

### Expansion & Capital Chain

```
Main Building Lv 5
├── Residence (GID 25) ← 2 expansion slots
│   └── Settlers / Chiefs
├── Palace (GID 26)    ← 3 expansion slots
│   └── Palace Lv 3
│       └── Stonemason's Lodge (GID 34) ← Capital only, +300% durability
└── (Cannot have both Residence and Palace)
```

### Resource Production Chain

```
Resource Field Lv 5
└── Grain Mill (GID 5)        ← +5% crop/level
    └── Grain Mill Lv 5 + Cropland Lv 10 + MB 5
        └── Bakery (GID 9)    ← +5% crop/level (stacks)

Resource Field Lv 10 + MB 5
├── Sawmill (GID 6)           ← +5% wood/level
├── Brickyard (GID 7)         ← +5% clay/level
└── Iron Foundry (GID 8)     ← +5% iron/level
```

---

## 3. Tribe Analysis

### Romans 🏛️

| Aspect     | Detail |
|------------|--------|
| **Strengths** | **Simultaneous construction** (1 resource field + 1 town building), strongest infantry (Imperian: 70 atk), City Wall highest defense bonus, balanced offense/defense |
| **Weaknesses** | Longest training times, most expensive troops, cavalry defense is average |
| **Unique Building** | **Horse Drinking Trough** (GID 41) — reduces cavalry crop consumption, speeds up Stable training. Req: Rally 10, Stable 20 |
| **Wall** | **City Wall** (GID 31) — Highest defense bonus but **very easy to destroy** with rams |
| **Offensive Units** | Legionnaire (balanced), Imperian (heavy infantry), Equites Imperatoris (fast cavalry), Equites Caesaris (heavy cavalry) |
| **Defensive Units** | Praetorian (best anti-infantry defender in game) |
| **Bot Strategy Note** | The simultaneous building bonus means Romans can afford to interleave field upgrades with town building upgrades without losing time. Templates should take advantage by scheduling field upgrades alongside military buildings. |

### Gauls 🛡️

| Aspect     | Detail |
|------------|--------|
| **Strengths** | Best early-game defense, Trapper captures raiders, Cranny hides **50% more** resources, fastest cavalry (Theutates Thunder), cheapest settlers |
| **Weaknesses** | Weaker offensive capabilities, fewer raiding options |
| **Unique Building** | **Trapper** (GID 36) — captures attacking troops in traps (10/level, max 400 at Lv 20). Can build multiple Trappers. Req: Rally Point 1 |
| **Wall** | **Palisade** (GID 33) — Average defense bonus, Average durability |
| **Offensive Units** | Swordsman (infantry), Theutates Thunder (fastest raider, 19 fields/hour), Haeduan (heavy cavalry) |
| **Defensive Units** | Phalanx (cheap, fast, balanced defense), Druidrider (cavalry defense) |
| **Bot Strategy Note** | Gaul defense templates should prioritize **Trapper FIRST** (before even Barracks), since it provides passive defense that costs zero crop upkeep. The Palisade should be pushed early as it provides crucial defense multiplier. Multiple Crannies should be considered for resource protection. |

### Teutons ⚔️

| Aspect     | Detail |
|------------|--------|
| **Strengths** | Cheapest & fastest troops to train, best carrying capacity for raids, **Cranny dip** (hero reduces enemy Cranny protection by 20%), Brewery attack bonus |
| **Weaknesses** | Weakest defense, slower unit speed, struggles in prolonged defensive wars |
| **Unique Building** | **Brewery** (GID 35) — +1% attack bonus per level during celebrations (Capital only). Req: Rally 10, Granary 20. **Drawback**: Chiefs -50% persuasion, catapults random-only |
| **Wall** | **Earth Wall** (GID 32) — Lowest defense bonus but **extremely hard to destroy** |
| **Offensive Units** | Clubswinger (cheapest, fastest to train), Axeman (better attack/crop ratio), Teutonic Knight (heavy cavalry) |
| **Defensive Units** | Spearman (anti-cavalry), Paladin (mixed defense, good speed) |
| **Bot Strategy Note** | Teuton offense templates should focus on getting Barracks + Academy out FAST to enable mass Clubswinger production for early raiding. The Brewery requires Granary 20 and Rally 10 — this should be a late-game priority for the capital village. |

### Egyptians 🏺 (5-tribe servers only)

| Aspect     | Detail |
|------------|--------|
| **Strengths** | Economic powerhouse, **double oasis resource bonus**, **Waterworks** building boosts crop production, cheap troops, excellent defense |
| **Weaknesses** | Available only on 5-tribe servers |
| **Unique Building** | **Waterworks** (GID 45) — boosts resource production from oases |
| **Wall** | **Stone Wall** — defense bonus similar to Gaul Palisade, **much higher durability** (hardest to break after Teutons) |
| **Bot Strategy Note** | Egyptian templates should prioritize claiming oases early (Hero's Mansion) since they get double bonus. Waterworks should be a mid-game priority. |

### Huns 🏇 (5-tribe servers only)

| Aspect     | Detail |
|------------|--------|
| **Strengths** | Fastest cavalry, strong offense, multi-village mobility |
| **Weaknesses** | **Worst wall** (lowest defense bonus + very low durability), weak infantry |
| **Unique Building** | **Command Center** — alternative to Residence/Palace |
| **Wall** | **Makeshift Wall** — Worst defense bonus, worst durability |
| **Bot Strategy Note** | Never build a defensive Hun village. Templates should be purely offensive with maximum cavalry focus. |

---

## 4. Wall Comparison by Tribe

| Tribe    | Wall GID | Defense Bonus | Durability (vs Rams) | Strategic Implication |
|----------|----------|--------------|---------------------|----------------------|
| Roman    | 31       | ★★★★★ Highest| ★☆☆☆☆ Very easy to destroy | Must be defended; great bonus but crumbles to rams |
| Gaul     | 33       | ★★★☆☆ Average| ★★★☆☆ Average       | Balanced; good with Trapper combo |
| Teuton   | 32       | ★★☆☆☆ Low    | ★★★★★ Extremely hard | Survives ram attacks; low bonus compensated by volume of cheap troops |
| Egyptian | 42       | ★★★☆☆ Average| ★★★★☆ High          | Best overall balance of bonus and durability |
| Hun      | 43       | ★☆☆☆☆ Worst  | ★☆☆☆☆ Very low      | Essentially useless for serious defense |
| Spartan  | 47       | ★★☆☆☆ Low    | ★★★☆☆ Average       | Comparable to Teuton defense + Gaul durability |
| Viking   | —        | ★☆☆☆☆ Low    | ★★★★☆ High          | Similar to Hun defense but much harder to destroy |

**Key Takeaway**: Defense templates must use the **correct wall GID per tribe**. A defense template with GID 31 (City Wall) applied to a Teuton account will fail silently.

---

## 5. Resource Field Upgrade Strategy

### The Even Resources Principle
>
> **Travian's geometric cost curve means lower-level upgrades always have better ROI.**
> Therefore: Always upgrade the LOWEST level field first.

### Recommended Upgrade Phases

| Phase | Fields Target | Concurrent Buildings | Resource Balance Note |
|-------|--------------|---------------------|----------------------|
| 1     | All → Lv 2   | MB Lv 3, Rally Lv 1 | Cheapest; all types produce minimal |
| 2     | All → Lv 5   | Cranny Lv 10, WH/Granary Lv 5 | Storage needed for phase 3 costs |
| 3     | All → Lv 8   | Marketplace Lv 5 (enable NPC trade) | "Sweet spot" — costs start to become exponential above Lv 8 |
| 4a    | 1 of each type → Lv 10 | Build Grain Mill, Sawmill, Brickyard, Iron Foundry to Lv 1-2 | Unlock production boosters first |
| 4b    | Remaining → Lv 9, then Lv 10 | Production boosters to Lv 5 | Boosters compound with multiple fields |
| 5     | **Capital only**: push past Lv 10 | 4× WH Lv 20, 4× GR Lv 20 | Requires massive storage |

### 15-Cropper Special Case

- **DO NOT** build Sawmill/Brickyard/Iron Foundry (waste of slot)
- **DO** build Grain Mill + Bakery (stacking crop production)
- Focus on crop output → feed armies in other villages

---

## 6. Resource Cost Analysis of Key Buildings

### Cost at Level 1 (from building-data.json, used for interleaving decisions)

| Building (GID) | Wood | Clay | Iron | Crop | **Dominant Resource** |
|----------------|------|------|------|------|----------------------|
| Warehouse (10) | 130  | 160  | 90   | 40   | Clay                 |
| Granary (11)   | 80   | 100  | 70   | 20   | Clay                 |
| Barracks (19)  | 210  | 140  | 260  | 120  | **Iron**             |
| Academy (22)   | 220  | 160  | 90   | 40   | **Wood**             |
| Smithy (13)    | 180  | 200  | 280  | 60   | **Iron**             |
| Stable (20)    | 260  | 140  | 220  | 100  | **Wood/Iron**        |
| Workshop (21)  | 460  | 510  | 600  | 320  | **Iron**             |
| Rally Point (16)| 110 | 160  | 90   | 70   | Clay                 |
| Main Building (15)| 70| 40   | 60   | 20   | Balanced (cheap)     |

### Why Interleaving Matters

If the queue is: `Academy (Wood-heavy) → Academy again (Wood++) → Barracks (Wood+++)`, wood will be completely drained while iron overflows.

**Correct interleaving**: `Academy (Wood) → Smithy (Iron) → Warehouse (Clay) → Barracks (Wood/Iron)` — each building absorbs the surplus from the previous one.

---

## 7. Template Design Philosophy

### Problem 1: Prerequisite Stalls

A flat list `[{gid:20, targetLevel:20}]` (Stable Lv 20) causes the bot to attempt building a Stable without having:

- Barracks Lv 3 ← requires Rally Point Lv 1 ← requires MB Lv 3
- Academy Lv 5 ← requires MB Lv 3, Barracks Lv 3

**Solution**: Templates are **phased arrays** that duplicate the same GID at increasing levels, naturally ensuring prerequisites are built first.

### Problem 2: Single-Resource Drain

Consecutive buildings with the same cost bias drain one resource while others overflow.

**Solution**: Templates deliberately alternate between:

- **Wood/Clay-heavy** buildings (Academy, Barracks)
- **Iron-heavy** buildings (Smithy, Workshop)
- **Balanced** buildings (Warehouse, Granary)

### Problem 3: Tribe-Agnostic Walls

The current templates cannot dynamically select the correct wall GID per tribe.

**Current Workaround**: Separate templates for tribe-specific defense (e.g., `defense_gaul` uses GID 33 Palisade).
**Future**: Auto-detect tribe from village data and substitute wall GID automatically.

---

## 8. Template Definitions & Build Orders

### 8.1 Resource Village

**Goal**: Pure economic engine. Feed surplus to offense/defense villages.

| Phase | Step | Building | GID | Target Lv | Why Here |
|-------|------|----------|-----|-----------|----------|
| 1 | 1 | Main Building | 15 | 5 | Reduces all build time; unlocks Sawmill prereqs |
| 1 | 2 | Warehouse | 10 | 5 | Prevents overflow before field pushing |
| 1 | 3 | Granary | 11 | 5 | Same as above for crop |
| 2 | 4 | Main Building | 15 | 10 | Faster builds for mid-game |
| 2 | 5 | Marketplace | 17 | 5 | Enable NPC trading (3 Gold) or resource sending |
| 2 | 6 | Warehouse | 10 | 10 | Support Lv 8-10 fields |
| 2 | 7 | Granary | 11 | 10 | Support Lv 8-10 fields |
| 3 | 8 | Main Building | 15 | 20 | Max build speed for endgame |
| 3 | 9 | Warehouse | 10 | 20 | Endgame storage |
| 3 | 10 | Granary | 11 | 20 | Endgame storage |
| 3 | 11 | Marketplace | 17 | 20 | Unlock Trade Office prereq |

### 8.2 Offensive Village (Hammer) — Tribe-Generic

**Goal**: Maximum troop production with prerequisite-safe ordering.

| Phase | Step | Building | GID | Target Lv | Resource Bias | Why Here |
|-------|------|----------|-----|-----------|--------------|----------|
| 1 (Foundation) | 1 | Main Building | 15 | 3 | Balanced | Unlock Barracks/Academy |
| 1 | 2 | Rally Point | 16 | 1 | Balanced | Unlock Barracks |
| 1 | 3 | Barracks | 19 | 3 | Wood/Iron | Unlock Academy prereq |
| 2 (Buffer) | 4 | Warehouse | 10 | 5 | Clay | Absorb raid income |
| 2 | 5 | Granary | 11 | 5 | Clay | Prevent crop cap |
| 3 (Tech - Interleaved) | 6 | Academy | 22 | 5 | **Wood/Clay** | Unlock Stable |
| 3 | 7 | Smithy | 13 | 3 | **Iron** | ← Offsets Academy's wood drain |
| 3 | 8 | Stable | 20 | 3 | Wood/Iron | Cavalry unlocked |
| 4 (Scale) | 9 | Main Building | 15 | 10 | Balanced | Faster builds + Workshop prereq |
| 4 | 10 | Academy | 22 | 10 | Wood/Clay | Workshop prereq |
| 4 | 11 | Workshop | 21 | 10 | **Iron** | ← Offsets Academy's wood drain; siege unlocked |
| 4 | 12 | Warehouse | 10 | 10 | Clay | Support higher costs |
| 4 | 13 | Granary | 11 | 10 | Clay | Support higher costs |
| 5 (Endgame) | 14 | Rally Point | 16 | 15 | Balanced | Tournament Square prereq |
| 5 | 15 | Tournament Square | 14 | 10 | Wood/Clay | Troop speed for 30+ squares |
| 5 | 16 | Barracks | 19 | 20 | Wood/Iron | Max infantry training speed |
| 5 | 17 | Stable | 20 | 20 | Wood/Iron | Max cavalry training speed |
| 5 | 18 | Workshop | 21 | 20 | Iron | Max siege training speed |

### 8.3 Defensive Village — Roman (City Wall)

**Key Insight**: Roman City Wall gives the **highest defense bonus** of any wall type, making it the single best upgrade for defenders. But it's fragile — coordinate with allies to prevent ram attacks.

| Phase | Step | Building | GID | Target Lv | Why Here |
|-------|------|----------|-----|-----------|----------|
| 1 | 1 | Main Building | 15 | 3 | Unlock Barracks |
| 1 | 2 | Rally Point | 16 | 1 | Unlock Barracks |
| 1 | 3 | Barracks | 19 | 5 | Praetorian production |
| 1 | 4 | **City Wall** | **31** | 5 | **Highest defense bonus; rush it** |
| 2 | 5 | Warehouse | 10 | 5 | Support upgrades |
| 2 | 6 | Granary | 11 | 5 | Support upgrades |
| 2 | 7 | Academy | 22 | 5 | Stable prereq |
| 2 | 8 | Smithy | 13 | 5 | **Praetorian defense upgrades** (Iron offset) |
| 3 | 9 | Barracks | 19 | 10 | Faster Praetorian production |
| 3 | 10 | City Wall | 31 | 10 | Push defense bonus higher |
| 3 | 11 | Main Building | 15 | 10 | Hospital + Town Hall prereq |
| 4 | 12 | Academy | 22 | 15 | Hospital prereq |
| 4 | 13 | Hospital | 46 | 10 | **40% casualties returned as wounded; heals at 2× speed** |
| 5 | 14 | Barracks | 19 | 20 | Max Praetorian throughput |
| 5 | 15 | City Wall | 31 | 20 | Max defense bonus |

### 8.4 Defensive Village — Gaul (Trapper + Palisade)

**Key Insight**: A single Lv 20 Trapper (400 traps) completely shuts down early Teuton raids. Gauls can build **multiple Trappers**. Combined with Palisade and Phalanx, this creates an impenetrable early-mid game defense.

| Phase | Step | Building | GID | Target Lv | Why Here |
|-------|------|----------|-----|-----------|----------|
| 1 | 1 | Main Building | 15 | 3 | Foundation |
| 1 | 2 | Rally Point | 16 | 1 | Unlock Trapper + Barracks |
| 1 | 3 | **Trapper** | **36** | 5 | **Immediate passive defense** |
| 1 | 4 | **Palisade** | **33** | 5 | Defense multiplier |
| 2 | 5 | Warehouse | 10 | 5 | Storage |
| 2 | 6 | Granary | 11 | 5 | Storage |
| 2 | 7 | Trapper | 36 | 20 | **400 traps; shuts down all early raids** |
| 2 | 8 | Barracks | 19 | 5 | Phalanx production |
| 3 | 9 | Palisade | 33 | 10 | Boost Phalanx effectiveness |
| 3 | 10 | Main Building | 15 | 10 | Hospital prereq |
| 3 | 11 | Academy | 22 | 5 | Smithy/Stable prereq |
| 3 | 12 | Smithy | 13 | 5 | Phalanx defense upgrades |
| 4 | 13 | Barracks | 19 | 20 | Max Phalanx throughput |
| 4 | 14 | Trapper | 36 | 20 | 2nd Trapper (800 total traps) |
| 4 | 15 | Palisade | 33 | 20 | Max defense bonus |

### 8.5 Defensive Village — Teuton (Earth Wall + Spearman)

**Key Insight**: Earth Wall has **lowest defense bonus** but is **nearly indestructible** by rams. Teuton defense relies on mass-producing cheap Spearmen (excellent anti-cavalry). The Brewery is capital-only and adds +1% attack per level.

| Phase | Step | Building | GID | Target Lv | Why Here |
|-------|------|----------|-----|-----------|----------|
| 1 | 1 | Main Building | 15 | 3 | Foundation |
| 1 | 2 | Rally Point | 16 | 1 | Unlock Barracks |
| 1 | 3 | Barracks | 19 | 5 | Spearman production |
| 1 | 4 | **Earth Wall** | **32** | 5 | Nearly indestructible foundation |
| 2 | 5 | Warehouse | 10 | 5 | Storage |
| 2 | 6 | Granary | 11 | 5 | Storage |
| 2 | 7 | Academy | 22 | 5 | Stable prereq for Paladin |
| 2 | 8 | Smithy | 13 | 5 | Spearman defense upgrades |
| 3 | 9 | Barracks | 19 | 10 | Faster Spearman production |
| 3 | 10 | Earth Wall | 32 | 10 | Extended durability |
| 3 | 11 | Main Building | 15 | 10 | Hospital prereq |
| 4 | 12 | Academy | 22 | 15 | Hospital prereq |
| 4 | 13 | Hospital | 46 | 10 | 40% casualty recovery |
| 5 | 14 | Barracks | 19 | 20 | Max Spearman throughput |
| 5 | 15 | Earth Wall | 32 | 20 | Virtually immune to rams |

### 8.6 Capital Village

**Key Insight**: Only village where fields go past Lv 10. Stonemason (+300% building durability) is capital-exclusive. Palace provides expansion slots at Lv 10/15/20.

| Phase | Step | Building | GID | Target Lv | Why Here |
|-------|------|----------|-----|-----------|----------|
| 1 | 1 | Main Building | 15 | 5 | Palace prereq |
| 1 | 2 | Palace | 26 | 5 | Capital designation + Stonemason prereq |
| 2 | 3 | Stonemason's Lodge | 34 | 5 | +75% building durability |
| 2 | 4 | Warehouse | 10 | 10 | Support field pushing |
| 2 | 5 | Granary | 11 | 10 | Support field pushing |
| 3 | 6 | Main Building | 15 | 10 | Town Hall prereq |
| 3 | 7 | Palace | 26 | 15 | 2nd expansion slot |
| 3 | 8 | Stonemason's Lodge | 34 | 20 | **+300% durability** (max protection vs catapults) |
| 4 | 9 | Warehouse | 10 | 20 | Endgame field costs |
| 4 | 10 | Granary | 11 | 20 | Endgame field costs |
| 4 | 11 | Palace | 26 | 20 | 3rd expansion slot |
| 4 | 12 | Warehouse | 10 | 20 | 2nd WH for massive storage (Lv 15+ fields) |
| 4 | 13 | Granary | 11 | 20 | 2nd GR for massive storage |

---

## 9. Synergy with `even_resources` Algorithm

Templates provide the **static blueprint** (what to build & in what order).
The `even_resources` strategy provides **dynamic execution** (which eligible item to build NOW).

### How It Works in Practice

1. User applies "Offensive Village" template → 18 items enter queue
2. Bot wakes up, checks which items have prerequisites met
3. In Phase 3, both Academy (Wood/Clay heavy) and Smithy (Iron heavy) are eligible
4. `CostCalculator` computes the post-build resource state for each option
5. If current resources: Wood=5000, Clay=4000, Iron=8000, Crop=3000
   - Building Academy costs ~2000 Wood → remaining: [3000, 4000, 8000, 3000] → variance HIGH (iron excess)
   - Building Smithy costs ~2800 Iron → remaining: [5000, 4000, 5200, 3000] → variance LOW
   - **Bot picks Smithy** → iron surplus consumed, resources rebalanced
6. Next cycle, bot picks Academy since now wood is the excess resource

This dual-layer system ensures **zero resource waste** regardless of raiding income, trade routes, or random resource fluctuations.

---

## 10. Known Limitations & Future Work

### Current Limitations

1. **Manual tribe selection**: User must select the correct defense template for their tribe. No auto-detection yet.
2. **No production buildings in templates**: Sawmill (GID 6), Brickyard (GID 7), Iron Foundry (GID 8), Grain Mill (GID 5), Bakery (GID 9) are not included. Should be added to Resource Village template when fields hit Lv 8-10.
3. **Great Barracks/Stable**: Not yet templated. These are crucial for late-game offense (non-capital only).
4. **Residence vs Palace**: Templates don't handle the mutual exclusion rule.
5. **Brewery (Teuton Capital)**: Not templated. Requires Granary Lv 20 + Rally Lv 10.
6. **Horse Drinking Trough (Roman)**: Not templated. Requires Rally 10 + Stable 20.

### Future Enhancements

- Auto-detect tribe from village data → substitute wall GID automatically
- Add "Early Game" templates with Cranny rush for new villages
- Add "15-Cropper Capital" template (Grain Mill + Bakery only, no Sawmill/Brickyard/Iron Foundry)
- Add "Raider Village" template for Teuton Clubswinger farms
- Integrate hero item recommendations per template type
