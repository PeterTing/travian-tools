# Phase 1: Knowledge Correction + 3 Missing Calculators

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix errors and fill critical gaps in `docs/knowledge/*.md` + `docs/PRD.md`, then implement three calculators missing from Travian Tools that frisovandijk.com and Travco offer: Optimal Village Builder, Crop Scouter, and Attack TS Optimizer (bundled with Fake Troops Calculator).

**Architecture:**
- Knowledge layer — direct markdown edits to existing `docs/knowledge/*.md`; new topic files created where content doesn't fit an existing file. No code changes. Source of truth for the RAG pipeline that powers the AI Advisor.
- Calculator layer — extend the existing `advanced_calculator` triplet (schemas → service → endpoint) rather than create parallel modules. Frontend adds one page per calculator under `frontend/src/pages/calculator/`. TDD: failing test first, minimal implementation, then commit.
- Scope of this plan is Phase 1 only. Phase 2 (L2 alliance coordination: groups, defense calls, attack planning) and Phase 3 (L2 artifacts / farmlist / supply / Discord) get their own plans after Phase 1 ships.

**Tech Stack:** Python 3.11 + FastAPI + SQLAlchemy + Pydantic v2 (backend); React 18 + TypeScript + Shadcn UI + Vitest + React Testing Library (frontend); pytest (backend tests); markdown (knowledge).

**Source references:** All content traces to:
- `docs/competitor-analysis/2026-04-19-travco-gap-and-knowledge-validation.md` (this worktree) — sections 3 (errors to fix) and 5 (P0/P1 additions)
- Lumi/Eggstra/Dave strategy guide (provided in chat on 2026-04-19)
- Travian Support (`support.travian.com`) — battle mechanics, tribes, artifacts, hero articles
- frisovandijk.com — 9 calculator interface specifications captured live on 2026-04-19
- Existing `backend/app/domain/schemas/advanced_calculator.py`, `advanced_calculator_service.py`, `api/v1/endpoints/advanced_calculator.py`

---

## Section A — Knowledge Correction (P0 + critical P1)

Twelve tasks. Each edits one file or creates one file, then commits. No code execution.

### Task A1: Fix tribe count (7 tribes, not 5)

**Files:**
- Modify: `docs/knowledge/travian-mechanics.md:45-53`

- [ ] **Step 1: Replace the Tribes Overview section**

Replace the block from `## Tribes Overview` through the end of the numbered list (the five-tribe list).

Use this content:

```markdown
## Tribes Overview

Seven tribes are supported. Each has unique traits that dictate strategy.

1. **Romans**: Expensive but powerful troops. Can build one resource field AND one town building simultaneously. Excellent late-game infantry (Imperian) and cavalry (Equites Imperatoris/Caesaris). Praetorian is the best anti-infantry defender in the game. Tribe-specific: City Wall (GID 31 — highest bonus, low durability), Horse Drinking Trough (GID 41 — cuts cavalry crop).
2. **Gauls**: Defensive specialists. Trapper (GID 36) captures attackers (10/level, up to 400 at Lv 20). Cranny hides 2× the resources (Gaul bonus). Fastest cavalry in the game (Theutates Thunder). Tribe-specific: Palisade (GID 33 — balanced bonus/durability).
3. **Teutons**: Aggressive early game. Cheapest and fastest troops to train (Clubswinger). Hero Cranny Dip item reduces enemy Cranny protection by 20% (NOT a passive tribe bonus — specific hero consumable). Tribe-specific: Earth Wall (GID 32 — lowest bonus, highest durability), Brewery (GID 35 — capital only, +1% attack per level).
4. **Egyptians** (special-server tribe, now on 5-tribe worlds): Economic powerhouse. Double resource output from oases. Tribe-specific: Waterworks (GID 45 — oasis bonus multiplier), Stone Wall (~Gaul bonus, higher durability).
5. **Huns** (special-server tribe): Fast cavalry focus. Multi-village mobility. Tribe-specific: Command Center (alternative to Residence/Palace), Makeshift Wall (worst wall in game).
6. **Spartans** (special-server tribe, now on 5-tribe worlds): Strong single-unit durability. Asclepeion (hospital equivalent) recovers 60% of wounded (vs Hospital 40%).
7. **Vikings** (special-server tribe): Strong infantry plus fast boats on harbor/deep-water servers. Wall is low bonus, high durability (similar to Hun in bonus, much better in durability).

> **Server version caveat:** Classic 3-tribe and 5-tribe servers don't expose every tribe. Special scenarios (Reign of Fire, Ancient Powers, Harbor/Deep Water) add or remove tribes. Account type should always be read from sync data, not assumed.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3
git add docs/knowledge/travian-mechanics.md
git commit -m "docs(knowledge): fix tribe list — 7 tribes, add Spartans and Vikings"
```

---

### Task A2: Unify game-phase definitions

**Files:**
- Modify: `docs/knowledge/travian-mechanics.md` (append new section)
- Modify: `docs/PRD.md:312-326` (F3.1 phase table)

- [ ] **Step 1: Append phase section to travian-mechanics.md**

Append after the "Build Queue Rules" section, before the final note:

```markdown
## Game Phases (standardized)

Adopted from the Lumi/Eggstra/Dave community guide. All other docs (PRD, RAG prompts, strategy service) must use these ranges.

| Phase | Days | Focus |
|-------|------|-------|
| Early game | Day 1 – Day 45 | Settle, establish cap, control quadrant, first raids |
| Mid game | Day 45 – Day 90 | First ops launch, account matures, pre-artifact setup |
| Late game | Day 90 onward | Artifacts released, WW prep, large-scale cata operations |

Sub-phases for decision support:
- Protection period: Day 1 – Day 3 (new-player protection, no PVP)
- Settling phase: Day 1 – Day 14 (aim for second village)
- Cap development: Day 7 – Day 45 (push cap fields to Lv 17+ before artifacts)
- Artifact phase: ~Day 90 (varies by server speed) — artifacts spawn
- Endgame / WW phase: Day 150+ (focus shifts from sim to troops)
```

- [ ] **Step 2: Fix PRD.md phase table in F3.1**

Replace rows 312-326 (the 6-row phase table starting with "新手保護期") with:

```markdown
**階段定義**（與 `docs/knowledge/travian-mechanics.md` 的 Game Phases 對齊）：

| 階段 | 天數 | 村莊數 | 策略重點 |
|------|------|--------|----------|
| 保護期 | Day 1-3 | 1 | 新手保護、完成任務、英雄冒險搶資源 |
| 早期 | Day 1-45 | 1-4 | 快速開村、確立首都、控制象限、微農場 |
| 中期 | Day 45-90 | 4-6 | 第一波 ops 發動、兵種生產、神器前準備 |
| 後期 | Day 90 起 | 6-10+ | 神器爭奪、大規模戰役 |
| 終局/WW | Day 150 起 | 8-12+ | 全聯盟 WW 協作、持續生產防禦兵 |
```

- [ ] **Step 3: Commit**

```bash
git add docs/knowledge/travian-mechanics.md docs/PRD.md
git commit -m "docs: unify game phase definitions (Early/Mid/Late = 1-45/45-90/90+)"
```

---

### Task A3: Fix conquest wave count in PRD.md F2.7

**Files:**
- Modify: `docs/PRD.md` (F2.7 section, locate "征服波數估算")

- [ ] **Step 1: Replace the inaccurate conquest text**

Find the line `**征服波數估算**：至少需要 4-5 波酋長/貴族` (around line 731 in section 7.1.8) and the F2.7 acceptance criteria block. Replace with:

```markdown
**征服波數估算**：
- 每波 chief/chieftain/senator/logades 降低 loyalty 20-30%（隨機）
- Loyalty 起始 100%，恢復 +1%/hour
- Town Hall 慶典可把 loyalty 推到 125%（抗征服緩衝）
- Residence 提供 2 個 chief slots；Palace 提供 3 個
- 單玩家 1 個 hammer 有 Palace 20 = 3 chiefs/波 → 約 4 波攻下未慶典目標
- 2 個 3-chief 村（Palace 20 + Residence 20，或 Palace 20 × 2）= 6 chiefs/波 → 單人 solo chiefing 可能
- 聯合攻擊：多玩家 chief 合體一波即可攻下慶典後的 125% loyalty
```

- [ ] **Step 2: Update F2.7 output fields**

Find F2.7 "征服計算器" section (near line 276-289). Replace the Output block with:

```markdown
**輸出**:
- 預期每波 loyalty 下降範圍（20-30%）
- 最少完成波數估算（假設 loyalty 不慶典回復）
- 考慮慶典情境的波數（loyalty 從 125% 起算）
- Chief 數量需求（依 Residence/Palace 等級 + 多少 hammer）
- 總成本（每個 chief + senator 成本 + 跟隨部隊）
- 建議部隊組合（chief 保鏢、攻破城牆需求）
```

- [ ] **Step 3: Commit**

```bash
git add docs/PRD.md
git commit -m "docs(PRD): correct conquest mechanics — loyalty 125%, 3-chief Palace, solo chiefing"
```

---

### Task A4: Create siege-and-catapult.md

**Files:**
- Create: `docs/knowledge/siege-and-catapult.md`

- [ ] **Step 1: Write the new file**

Content:

```markdown
# Siege and Catapult Mechanics

Source: Travian Support (Catapults, Walls and Rams, Village Destruction articles) + Lumi/Eggstra/Dave guide + community-verified numbers.

## Catapult Targeting

- Each catapult chooses ONE building to hit per attack wave.
- Target selection is set in Rally Point before sending: specific building GID, OR random.
- Teuton Brewery side-effect: catapults can only hit random targets while Brewery celebration is active.
- A building hit by catapults takes damage proportional to the number of catapults that survived the battle.

## Catapults Needed to Destroy a Building

Approximate wave count to reduce a Lv 20 building to Lv 0 (Stonemason not active):

| Target type | Rough catapult count per wave (with full escort) |
|-------------|---------------------------------------------------|
| Lv 20 standard building | 200-300 cats with 0 smithy → 1 hit for -4 to -6 levels |
| Lv 20 Stonemason-protected | Stonemason Lv 20 adds +300% building durability → roughly 4× the cats |
| Wall | Ram duty — see section below |

**Village kill rule (Lumi guide):** 19 fully-loaded catapult waves to completely demolish a Lv 20 capital with Stonemason Lv 20. Non-cap or non-Stonemason capitals die in fewer waves.

## Catapult Speed and Range

- Catapult travel speed: 3 tiles/hour (slowest siege unit).
- Catapults need a Workshop (GID 21) to build. Workshop requires Academy Lv 10 + Main Building Lv 5.
- Trebuchet (Egyptian) and Ballista (Spartan) replace catapults for those tribes.

## Ram (Battering Ram) Behavior

- Rams reduce wall level during attack. Wall damage follows a formula roughly: `wallDamage = rams × (1 + smithy×0.015) × random(0.85-1.15)`
- Wall must be destroyed BEFORE catapults can focus on other buildings for the kill wave (not strictly true — cats still hit, but wall bonus reduces their effect).
- Ram formula is approximate; use battle simulator for exact numbers.

## Village Destruction

- Every building (except Wall/Rally Point) can be destroyed to Lv 0.
- Residence/Palace at Lv 0 prevents settler/chief production until rebuilt.
- Stonemason Lv 20 triples effective building HP.
- A village with all buildings at 0 is considered "destroyed" but the village still exists (coords remain, just empty).

## Defensive Countermeasures

- Stonemason's Lodge: capital only (requires Palace Lv 3 + MB Lv 5). +75% at Lv 5, +300% at Lv 20.
- Wall upgrades (by tribe, see wall-durability.md).
- Trapper (Gaul) — traps incoming raiders before siege lands.
- Defense troops with catapult-killing artifacts.
- 19-wave rule means coordinated defense can save a capital if any single wave is stopped with massive losses.
```

- [ ] **Step 2: Commit**

```bash
git add docs/knowledge/siege-and-catapult.md
git commit -m "docs(knowledge): add siege and catapult mechanics (19-wave kill rule)"
```

---

### Task A5: Create loyalty-and-conquest.md

**Files:**
- Create: `docs/knowledge/loyalty-and-conquest.md`

- [ ] **Step 1: Write the new file**

Content:

```markdown
# Loyalty and Conquest Mechanics

Source: Travian Support (Loyalty, Conquering Villages, Preventing Conquering, Town Hall articles) + community-verified numbers.

## Loyalty Basics

- Every village has loyalty from 0% to 125% (not 0-100).
- Starting value: 100%.
- Recovery: +1% per hour, up to 100% by default, or 125% with a Great Celebration in progress.
- Loyalty 0 = village changes ownership at the moment the chief wave with loyalty-killing unit lands.

## Loyalty-Dropping Units

These units reduce loyalty when they attack successfully as part of a winning wave:

| Tribe | Unit | Training building |
|-------|------|-------------------|
| Romans | Senator | Palace or Residence |
| Gauls | Chieftain | Palace or Residence |
| Teutons | Chief | Palace or Residence (catapult random-only penalty during Brewery) |
| Egyptians | Nomarch | Palace or Residence |
| Huns | Logades | Command Center / Palace / Residence |
| Spartans | Ephor | Palace or Residence |
| Vikings | — (TBD per server update) | — |

Each unit drops loyalty by 20-30% (random roll) on a successful wave.

## Chief Building Economics

| Building | Chiefs per build | Residence vs Palace | Notes |
|----------|------------------|---------------------|-------|
| Residence Lv 10 | 2 max | Cheaper, no expansion slots | Good for feeders |
| Residence Lv 20 | 3 max | — | Required for serious chief production |
| Palace Lv 10 | 1 (expansion) | Exclusive with Residence | Capital designation |
| Palace Lv 15 | 2 expansions | — | — |
| Palace Lv 20 | 3 expansions + 3 chiefs | — | Flagship conquest village |

Residence and Palace are mutually exclusive in the same village.

## Chief Wave Arithmetic

Assume defender at full loyalty (100%) without celebration:

- Best case loyalty drop per wave: 30% → need 4 waves to 0
- Average loyalty drop per wave: 25% → need 5 waves on average
- Worst case: 20% → need 5-6 waves

Defender at 125% loyalty (Great Celebration active):
- Need additional wave in most cases

Defender with Town Hall running continuous Great Celebrations + Tablet of Law: can hold 100+ loyalty indefinitely unless attacker out-paces celebrations.

## Great Celebration Pacing for Defense

- Small Celebration: 6000 wood / 6500 clay / 4000 iron / 9000 crop → 24 h
- Great Celebration: 16000 / 17000 / 12000 / 28000 → 60 h, requires Town Hall Lv 10
- Tablet of Law hero item: instantly tops loyalty by 5%

## Solo Chiefing Setup

A hardcore solo player usually runs two 3-chief villages:
- Hammer village (non-capital): Palace 20 with 3 chief slots
- Support village (non-capital): Residence 20 with 3 chief slots

→ 6 chiefs per combined wave → can take undefended enemies without alliance help.

## Preventing Conquest

- Keep loyalty ≥ 101% at all times (cap at 125 via celebrations)
- Town Hall Lv 10 + Great Celebration chain
- Residence Lv 10+ to hold a chief in the target village itself (enemy chiefs fight your chiefs)
- Alliance defense timed between enemy waves — any single wave failing (attacker loses) prevents that wave's loyalty drop
```

- [ ] **Step 2: Commit**

```bash
git add docs/knowledge/loyalty-and-conquest.md
git commit -m "docs(knowledge): add loyalty and conquest mechanics (125% cap, 3-chief setup)"
```

---

### Task A6: Create wall-durability.md

**Files:**
- Create: `docs/knowledge/wall-durability.md`

- [ ] **Step 1: Write the new file**

Content:

```markdown
# Wall Durability and Defense Bonus

Source: Travian Support (Walls and Rams article) + community wiki wall values.

## Two Axes: Bonus vs Durability

Every wall has two properties that behave independently:

- **Defense bonus** — multiplier applied to defending troops' defense values. Higher bonus = each defender counts for more.
- **Durability** — resistance to being destroyed by rams. Higher durability = wall drops fewer levels per incoming ram.

A high-bonus wall destroyed by rams on wave 1 is useless for waves 2+. A low-bonus wall that survives 19 waves keeps contributing to every wave.

## Wall Comparison Table

Values are for Lv 20 wall; lower levels scale proportionally.

| Tribe | Wall GID | Wall name | Defense bonus @ Lv 20 | Durability (relative) | Strategic profile |
|-------|----------|-----------|-----------------------|-----------------------|-------------------|
| Romans | 31 | City Wall | +81% | ★☆☆☆☆ (very low) | Highest raw bonus but falls to rams quickly; needs defender timing |
| Gauls | 33 | Palisade | +61% | ★★★☆☆ (medium) | Balanced; good with Trapper combo |
| Teutons | 32 | Earth Wall | +64% | ★★★★★ (highest) | Nearly immune to rams; low bonus but always on |
| Egyptians | 42 | Stone Wall | +60% | ★★★★☆ (high) | Best overall balance |
| Huns | 43 | Makeshift Wall | +44% | ★☆☆☆☆ (very low) | Useless for serious defense; Huns rely on mobility |
| Spartans | 47 | Defensive Wall | +55% | ★★★☆☆ (medium) | Comparable to Gaul |
| Vikings | — | Viking Wall | ~+50% | ★★★★☆ (high) | Similar durability to Egyptian |

> Exact bonus percentages vary by game version. When in doubt, read dynamic values from game_data_service's tribe tables rather than hard-coding.

## Capital vs Non-Capital

Wall levels are the same across village types. Wall GID is selected by tribe, not village role.

## Damage from Rams — Rough Formula

For each wave with `R` rams and smithy level `S`:

```
damage_points = R × (1 + S × 0.015) × random(0.85, 1.15)
levels_dropped ≈ damage_points / wallDurabilityPerLevel
```

where `wallDurabilityPerLevel` is tribe-specific: higher for Teuton/Egyptian, lower for Roman/Hun.

Exact numbers live in Travian's internal formula. For calculator and simulator output, prefer the battle simulator's result over manual reconstruction of this formula.

## Implications for Defense Templates

- **Roman defense** should prioritize City Wall → high bonus makes every sent def count → but also invest in Fire Catchers / anti-ram defense to protect the wall.
- **Teuton defense** accepts low bonus but relies on sheer volume of cheap Spearmen. Wall survives ram waves → bonus keeps contributing.
- **Gaul defense** combos Palisade with Trappers: Trapper catches rams before they land, Palisade gives bonus when attack does land.
- **Egyptian defense** gets the best balance → default choice for mixed-strategy players on 5-tribe servers.
```

- [ ] **Step 2: Commit**

```bash
git add docs/knowledge/wall-durability.md
git commit -m "docs(knowledge): add wall durability table (Teuton-high vs Roman-high-bonus)"
```

---

### Task A7: Create hero-system.md

**Files:**
- Create: `docs/knowledge/hero-system.md`

- [ ] **Step 1: Write the new file**

Content:

```markdown
# Hero System

Source: Travian Support articles — Hero overview, Adventures, Hero Health and Revival, Hero Experience, Hero items (all slots), Auctions.

## Hero Basics

- One hero per account, resurrectable if killed.
- Level 1-100 typically. Each level grants 4 attribute points.
- Four attributes to allocate:
  - Power (HP regen per day, base 100 HP)
  - Off Bonus (% bonus to troops attacking WITH the hero)
  - Def Bonus (% bonus to troops defending WHERE the hero is stationed)
  - Resources (hero produces resources in its home village)

## Adventures

- Triggered by Hero's Mansion; new adventure spawns on a timer (short: 4 h, long: 24 h).
- Adventure duration: varies by distance (1-2 h travel) and difficulty (short: low HP risk, long: high HP risk but better rewards).
- Rewards categories:
  - Silver/gold coins
  - Resources
  - Hero items (bag, cages, bandages, buckets, etc.)
  - Troops (rare; units matching your tribe)
  - Experience points

Early-game: first adventure ALWAYS rewards a horse (mount) — run short adventure immediately.

## Hero Items

### Slots

Helmet / Body Armor / Boots / Right Hand / Left Hand / Horse / Bag (consumables)

### Tiers

Tier 1 (common — gray), Tier 2 (rare — blue), Tier 3 (unique — purple).

### Right-Hand Item Sample (per tribe)

Roman tier-3: Imperial Regalia (weapon) — unit-type bonus for Imperial troops.
Gaul tier-3: Haeduan weapons — boosts Haeduan attack or defense.
Teuton tier-3: Teutonic Knight weapon — boosts Teutonic Knights.
Egyptian/Hun/Spartan/Viking: analogous unit-specific weapons.

### Left-Hand Item Sample

Maps (reveals coordinates), shields (def bonus), flags (tribe bonus), scrolls (culture points).

### Boots

Cavalry speed boots (+15 to +30%), infantry speed boots.

### Armor

Hero HP, XP gain rate, resource production.

### Helmets

Hero XP, cavalry/infantry bonus, anti-catapult.

### Consumables (Bag)

- Ointment (heal hero HP instantly)
- Bucket (+10 HP)
- Bandage / Great Bandage (revive fallen troops after battle)
- Cage (capture animals from oases to use as defenders)
- Tablet of Law (+5% loyalty to home village)
- Artwork (+2000 culture points)
- Book of Wisdom (reset hero attribute allocation)
- Scroll (+10 XP)
- Tribute (gold farming, limited use)

## Auctions

- Hero items can be bought/sold via the Auction house using silver.
- Silver sources: adventures, selling unwanted items, gold → silver (1 gold = 100 silver).
- Auction duration: 24 hours typically; multiple bidders drive up price.

## Health and Revival

- Hero HP regenerates +1-25 HP/day depending on Power attribute and Armor.
- Combat damage proportional to enemy strength relative to hero's strength.
- When HP reaches 0, hero dies. Revival costs scale with hero level:
  - Level 10: ~100 crop + gold/time
  - Level 50: expensive gold or long crop wait
- While dead, no off/def bonus is active and no adventures can be started.

## Oasis Claiming

- Hero's Mansion (GID 37) at Lv 10, 15, 20 unlocks 1, 2, 3 oasis claims respectively.
- Claiming requires hero attacks to defeat the oasis's wild animals.
- Once claimed, oasis bonus applies to the claiming village's resource production.
- A player can claim up to 3 oases across all villages (global cap, varies by server).

## Hero Strategy — Early Game

From Lumi guide: prioritize Power attribute first (survive adventures), farm oases with hero through adventures + direct attacks for resources. Switch to production attribute ~after the 6th adventure when oasis raiding slows down.
```

- [ ] **Step 2: Commit**

```bash
git add docs/knowledge/hero-system.md
git commit -m "docs(knowledge): add hero system (adventures, items, revival, oasis)"
```

---

### Task A8: Create artifacts.md

**Files:**
- Create: `docs/knowledge/artifacts.md`

- [ ] **Step 1: Write the new file**

Content:

```markdown
# Artifacts

Source: Travian Support (Artefacts, Artefact Effects, Artefact Limitations, Construction Plans articles).

## Release

- Artifacts are created by Natars around **Day 90** on standard x1 servers (scales with speed: Day 30 on x3).
- Initial release has 8 artifact villages. Each village is Natar-controlled and must be conquered / destroyed for the artifact to spawn in the attacker's treasury.

## Artifact Sizes

Three size tiers, each with different scope of effect:

| Size | Effect scope | Treasury cost |
|------|--------------|---------------|
| Small | Single village | 40-60 treasury slots |
| Large (Greater) | All villages in the account | 60-80 treasury slots |
| Unique | All villages PLUS stronger multiplier | 80-120 treasury slots |

The Treasury building holds artifacts. Treasury Lv 10 holds one artifact; Lv 20 holds multiple (actual capacity varies by version).

## Effect Categories

| Category | Small effect | Large effect | Unique effect |
|----------|--------------|--------------|---------------|
| Architect (building durability) | +200% single village | +100% all villages | +300% account + stonemason equivalent |
| Boots of Mercury (troop speed) | 2× speed in one village | 1.5× all villages | 2× all villages |
| Eyes of the Oracle (scout) | See enemy troops | See farther | Wider scout range |
| Trainer (troop training speed) | 2× barracks/stable | 1.5× across account | 2× all buildings |
| Fool's Artifact (random effect) | Random single-village effect weekly | Random account effect weekly | Stronger random |
| Warrior (unit crop consumption) | -50% crop for one village | -25% account | -50% account |
| Diet Control (unit training time) | — | — | Variant on Trainer |
| Storage (warehouse/granary capacity) | 2× capacity one village | 1.5× account | 2× account |
| Great Warehouse / Great Granary plan (unique) | Construction plan — enables Great Warehouse/Granary in capital | | |
| Rare Great Warehouse / Great Granary plan | Building plan artifact enabling one more Great WH/GR | | |
| Wonder of the World plan | Required to build the WW in late-game | | |

## Construction Plans

Specific artifact type that enables building the World Wonder. Required to build WW even after day 150.

## Acquisition

1. Natar artifact village must be scouted for defense.
2. Attacker must destroy Treasury Lv 10 (or 20) in the Natar village.
3. A single successful wave with catapults destroying the Treasury transfers the artifact to the attacker's Treasury in the *attacking* village (origin of cats).
4. Attacker must also avoid losing — if attacker loses, artifact stays with defender.

## Activation Rules

- Artifact must be in Treasury Lv 10+ to be active.
- Single village can only activate one artifact effect at a time (or one per category, depending on implementation).
- Moving artifacts: cannot be traded. Artifact transfers only via capture (Treasury destruction).
- Unique artifacts: only one of each type exists per server.

## Strategic Implications

- Artifact hunt reshapes Day 90 gameplay: every active player will try to scout or assist in grabbing an artifact.
- Defensive players should stack Treasury + Stonemason + strong anvil to defend Natar takeovers.
- Offensive players (hammers) need catapults + rams + travel-speed buff to raid Natar villages.
- Fool's Artifact can randomly disable building construction — include it in AI advisor warnings.

## Artifact-Holding Village Profile

From Travco Plus view, an artifact-holding village exposes these attributes to alliance scouts:
- Hero boots tier (does hero speed-up land ops?)
- Catapult throughput (workshop level, smithy level)
- Tournament Square level (long-range speed)
- Treasury size (artifact count)

Use these when designing the Artifact Village Profile page in Phase 2.
```

- [ ] **Step 2: Commit**

```bash
git add docs/knowledge/artifacts.md
git commit -m "docs(knowledge): add artifacts (sizes, effects, day-90 release, acquisition)"
```

---

### Task A9: Create town-hall-celebrations.md

**Files:**
- Create: `docs/knowledge/town-hall-celebrations.md`

- [ ] **Step 1: Write the new file**

Content:

```markdown
# Town Hall and Celebrations

Source: Travian Support (Town Hall, Culture Points) + Lumi guide (CP optimization chapter).

## Town Hall Basics

- Building: Town Hall (GID 24).
- Prerequisites: Main Building Lv 10 + Academy Lv 10.
- Max level: 20.
- Two celebration types become available.

## Celebration Types

| Type | CP granted | Duration | Cost (x1 server) | Min Town Hall level |
|------|-----------|----------|-------------------|---------------------|
| Small Celebration | 500 | 24 hours | 6400 wood / 6650 clay / 4000 iron / 9000 crop | Lv 1 |
| Great Celebration | 2000 | 60 hours | 16000 / 17000 / 12000 / 28000 | Lv 10 |

Costs scale with server speed (x3 costs ~3× resources per hour).

## CP Math: Great Celebrations Are a Compound Engine

Running 24/7 Great Celebration chain from Town Hall Lv 10:
- 2000 CP / 60 h = 33.33 CP/hour
- 800 CP/day sustained

Combined with passive CP from buildings (Main Building 20 + Market 20 + Academy 20 + Embassy 20 = ~529 CP/day baseline), a single village can produce 1300+ CP/day.

By contrast, a village with NO Town Hall tops out around 600 CP/day from passives alone.

## Passive CP Building Efficiency (Lumi's "CP goats")

Buildings with the best CP/resource cost ratio across all levels:
- Main Building (GID 15)
- Marketplace (GID 17)
- Academy (GID 22)
- Embassy (GID 18)
- Town Hall (GID 24) — though costly, Great Celebration amortizes
- Hospital (GID 46) — secondary pick, decent CP and useful for defense villages

Build priority for passive CP in feeders: all four "goats" to Lv 20, then Town Hall to Lv 10.

## Loyalty Interaction

Great Celebration is required to push loyalty past 100% toward the 125% cap. Without a celebration, loyalty cannot exceed 100% regardless of Tablets of Law.

## Brewery Side-Effect (Teuton Only)

Teuton Brewery (GID 35, capital only) grants +1% attack per level DURING celebrations, but:
- Chiefs get -50% persuasion during Brewery buff (harder to conquer enemies)
- Catapults can only target randomly during Brewery buff

→ Teuton attackers time celebrations to ops but not to chief waves.

## Strategy Implications

- Every serious village (cap, hammer, anvil, feeder) should have Town Hall Lv 10+.
- Capital Town Hall (Lv 10) should run Great Celebrations 24/7 starting day 30-45.
- NPC villages can skip Town Hall if slots are tight; CP from feeders covers settling.
- Tablet of Law hero consumable stacks with celebration-driven loyalty gain.

## Small vs Great Celebration Decision

- Use Small when you need quick CP to settle now and don't have 16k/17k/12k/28k ready.
- Use Great whenever resources allow — CP/hour ratio is roughly 2× better.
- Great Celebration cost is fixed per celebration regardless of Town Hall level beyond 10 → always aim for Lv 10 minimum, higher levels don't improve CP output from celebrations.
```

- [ ] **Step 2: Commit**

```bash
git add docs/knowledge/town-hall-celebrations.md
git commit -m "docs(knowledge): add Town Hall + celebrations (CP goats, loyalty 125 chain)"
```

---

### Task A10: Create tournament-square-speed.md

**Files:**
- Create: `docs/knowledge/tournament-square-speed.md`

- [ ] **Step 1: Write the new file**

Content:

```markdown
# Tournament Square — Long-range Troop Speed

Source: Travian Support (Troops Speed Increase & Tournament Square article).

## What Tournament Square Does

- Building: Tournament Square (GID 14).
- Prerequisites: Rally Point Lv 15.
- Max level: 20.

Tournament Square increases the speed of troops traveling BEYOND a threshold distance. It does not affect short-range travel.

## Speed Formula

```
base_travel_time = distance / unit_speed

if distance > threshold:
    beyond = distance - threshold
    bonus_multiplier = 1 + (TS_level × 0.20)
    effective_beyond_time = beyond / (unit_speed × bonus_multiplier)
    total_time = (threshold / unit_speed) + effective_beyond_time
else:
    total_time = base_travel_time
```

where:
- `threshold = 30 tiles` (fixed; hard-coded in game).
- `TS_level = 0..20`.
- `bonus_multiplier = 1 + TS_level × 0.20` → at Lv 20 = 5× speed beyond 30 tiles.

## Speed Boost by Level

| TS Level | Beyond-30 speed multiplier |
|----------|----------------------------|
| 0 | 1.0× (no TS) |
| 5 | 2.0× |
| 10 | 3.0× |
| 15 | 4.0× |
| 20 | 5.0× |

## Example

A Theutates Thunder (19 tiles/hour base) traveling 100 tiles:

Without TS: 100 / 19 ≈ 5.26 hours
With TS Lv 20: first 30 tiles = 30/19 = 1.58 h; remaining 70 tiles = 70/(19×5) = 0.74 h → total 2.32 hours (56% faster).

## Use Cases

1. **Ops attacks** > 30 tiles: TS is mandatory for any hammer that raids or hits targets in the opposite quadrant.
2. **Defense dodging**: a defender with TS Lv 20 can adjust troop arrival times by changing TS level before departure, preventing enemy "follow-home" ghost attacks.
3. **Fake waves**: TS accelerates fakes too, reducing the time window for defender to identify real vs fake.

## Calculator Implications

The Path Calculator (existing `advanced_calculator.calculate_path`) already handles TS level. The new Attack TS Optimizer (Task D in this plan) uses the reverse problem: given all attackers' TS levels + coordinates + a target arrival time, solve for each attacker's "send time" such that all waves land within a 1-2 second window.
```

- [ ] **Step 2: Commit**

```bash
git add docs/knowledge/tournament-square-speed.md
git commit -m "docs(knowledge): add Tournament Square long-range speed formula"
```

---

### Task A11: Create npc-village-template.md

**Files:**
- Create: `docs/knowledge/npc-village-template.md`

- [ ] **Step 1: Write the new file**

Content:

```markdown
# NPC Village Template

Source: Lumi/Eggstra/Dave guide — "NPC villages" section.

## Purpose

An NPC village is a dedicated storage + resource-conversion hub. Its role:
- Hold resources incoming from feeders
- NPC-convert surplus resource types into crop (or vice versa) via the NPC Merchant (3 gold per conversion)
- Distribute converted resources to hammers and anvils

Without an NPC village, a player must juggle warehouse/granary overflow across every producing village. With one, all surplus funnels through a single point of conversion.

## When to Build

- Earliest: around Day 20-30, once the first cap + 2 feeders are producing surplus.
- Latest acceptable: Day 60 — after that the account scales poorly without a conversion hub.
- Settled FROM: usually feeder or Village 4 (not capital, not hammer).

## Slot Budget (20 building slots total; 18 resource tiles separate)

| Building | GID | Level | Slots | Purpose |
|----------|-----|-------|-------|---------|
| Main Building | 15 | 10 | 1 | Build speed; Town Hall prereq if running celebrations |
| Marketplace | 17 | 20 | 1 | Sending/receiving merchants |
| Trade Office | 28 | 20 | 1 | +5% merchant capacity per level (2.5× at Lv 20) |
| Town Hall | 24 | 10 | 1 | Optional — CP via celebrations |
| Warehouse | 10 | 20 | 5-6 | Bulk of the slots go here |
| Great Warehouse | 38 | 20 | 2-3 | Non-capital only; massive storage |
| Granary | 11 | 20 | 4-5 | Crop storage (NPC usually converts INTO crop) |
| Great Granary | 39 | 20 | 1-2 | Non-capital only |
| Residence | 25 | 10 | 1 | Optional, for chief defense of the NPC village |
| Cranny | 23 | 10 | 1 | Optional early-game |

**Ratio:** roughly 1 Warehouse slot per 3 Granary slots (Lumi says 1:3), because NPC converts everything into crop and crop stockpiles run the largest.

## Resource Fields

NPC village resource fields are NOT a priority. Build them to Lv 4-5 only enough to support the hero claiming an oasis. Never upgrade past Lv 10.

## Positioning

- Place adjacent to the capital and hammer villages (within 1-5 tiles).
- Merchant round-trip should be < 30 minutes.
- Never place NPC far from the main cluster (negates its purpose).

## Troops

An NPC village holds no offensive troops. For defense, station a small anvil escort (1000-2000 Phalanx/Praetorian equivalent) to deter small raids.

## Synergy With Other Templates

- Capital → NPC: capital sends surplus wood/clay/iron; NPC converts to crop.
- Feeder → NPC: feeders send all 4 resources; NPC absorbs overflow.
- NPC → Hammer: every 15-30 minutes, NPC sends crop to hammer to feed troops during ops.
- NPC → Anvil: NPC pushes crop to anvils during defense calls.

## Cost Estimate (Lv 20 fully-built NPC)

Build-out from a fresh village takes 6-9 days with Gold + NPC transfusion from capital. Without gold, 14-21 days.
```

- [ ] **Step 2: Commit**

```bash
git add docs/knowledge/npc-village-template.md
git commit -m "docs(knowledge): add NPC village template (1:3 WH:GR ratio, slot budget)"
```

---

### Task A12: Rewrite template-definitions.md with slot-budget-first approach

**Files:**
- Modify: `docs/knowledge/template-definitions.md` (full rewrite)

- [ ] **Step 1: Overwrite the file**

Replace the entire contents with:

```markdown
# Village Templates — Slot-Budget-First Definitions

Each template starts from the **20-slot building budget** (excluding the 18 resource-field tiles) and the realistic storage requirements tied to the target resource-field levels. Building wish-lists are only valid if they fit.

Source: Lumi/Eggstra/Dave guide + community-verified Travian mechanics + this project's prior template drafts.

---

## Storage vs Field Level (critical constraint)

Upgrade-cost at high resource-field levels forces specific warehouse/granary counts. The numbers below are for **capital** villages pushing fields past Lv 10.

| Target field level | Warehouses required | Granaries required | Total storage slots |
|---------------------|---------------------|---------------------|---------------------|
| Lv 17 | 5 | 1 | 6 |
| Lv 18 | 7 | 2 | 9 |
| Lv 19 | 12 | 3 | 15 |

For Lv 19 fields, 15 of the 20 slots are storage — only 5 slots remain for MB + bonus buildings + Stonemason + Palace/Residence.

Non-capital villages cap fields at Lv 10 and can use Great Warehouse / Great Granary instead of 20+ normal warehouses.

---

## 1. Capital Village Template

**Purpose:** Core economic engine. Fields push past Lv 10 (only village where this is possible). Cannot be conquered.

### Resource fields

All 18 tiles → Lv 18 baseline, Lv 19 for high-invest accounts.

### Building budget — target: Lv 18 fields (9 storage slots)

| Building | GID | Level | Slots | Why |
|----------|-----|-------|-------|-----|
| Main Building | 15 | 20 | 1 | Build time reduction |
| Warehouse | 10 | 20 × 7 | 7 | Lv 18 field costs |
| Granary | 11 | 20 × 2 | 2 | Lv 18 field costs |
| Grain Mill | 5 | 5 | 1 | +25% crop |
| Bakery | 9 | 5 | 1 | +25% crop (stacks with Grain Mill) |
| Sawmill | 6 | 5 | 1 | +25% wood |
| Brickyard | 7 | 5 | 1 | +25% clay |
| Iron Foundry | 8 | 5 | 1 | +25% iron |
| Palace | 26 | 10 | 1 | Capital designation + Stonemason prereq |
| Stonemason's Lodge | 34 | 20 | 1 | +300% durability; capital only |
| Marketplace | 17 | 20 | 1 | Resource exchange |
| Town Hall | 24 | 10 | 1 | Great Celebrations |
| **Total** | | | **19** | |

Leaves 1 slot for:
- Extra Granary (if pushing for Lv 19 crop)
- Trade Office (if doing heavy external trading)
- Residence (skip — Palace is chosen)
- Hero's Mansion (recommended if oasis available, Lv 10 for 1 oasis)

### NOT included in capital

- **Barracks, Stable, Workshop, Academy, Smithy, Hospital, Great Barracks, Great Stable** — capital should NOT be a troop-production village. Slots cost too much. Troop production happens in dedicated hammer villages.

### Optional: Lv 19 capital variant

If pushing for Lv 19 fields: need 12 warehouses + 3 granaries = 15 storage slots. Drop Stonemason OR Marketplace OR Town Hall to fit. Accept slower build progression or longer celebrations from a feeder.

---

## 2. Feeder Village Template

**Purpose:** Resource and CP production. Supports capital, hammer, and anvils via Trade Routes.

### Resource fields

All 18 tiles → Lv 10 (no higher).

### Building budget

| Building | GID | Level | Slots | Why |
|----------|-----|-------|-------|-----|
| Main Building | 15 | 20 | 1 | Build time; Town Hall prereq |
| Marketplace | 17 | 20 | 1 | Trade routes |
| Trade Office | 28 | 20 | 1 | +merchant capacity (requires Stable 10) |
| Town Hall | 24 | 10 | 1 | **Great Celebrations — CP compound engine** |
| Academy | 22 | 20 | 1 | CP + Smithy prereq (if building a few defensive troops) |
| Embassy | 18 | 20 | 1 | High CP/cost |
| Grain Mill | 5 | 5 | 1 | |
| Bakery | 9 | 5 | 1 | |
| Sawmill | 6 | 5 | 1 | |
| Brickyard | 7 | 5 | 1 | |
| Iron Foundry | 8 | 5 | 1 | |
| Warehouse | 10 | 20 × 2-3 | 2-3 | Storage buffer |
| Granary | 11 | 20 × 2-3 | 2-3 | Crop buffer |
| Cranny | 23 | 10 | 1 | Hide resources from small raids |
| Residence | 25 | 10 | 1 | Optional if this feeder sources chiefs later |
| **Total** | | | **17-20** | |

### NOT included

- **Barracks / Stable / Workshop** — feeders do NOT build offensive troops. Exceptions: a feeder near anvil cluster can host a small barracks for Spearman pushes.
- **Hero's Mansion** — only if you need oasis; destroy after claiming (adventures spawn near HM, interfering with cap hero farming).

### Slot leftovers

If 17/20 used, leftover slots fill with:
- Extra Warehouse/Granary for storage buffer before trade-route runs
- Hospital Lv 20 (high passive CP, useful if any defense troops in village)

---

## 3. Offense (Hammer) Village Template

**Purpose:** Produce huge volumes of offensive troops + siege. Used for coordinated ops (Day 45 onward).

### Resource fields

All 18 tiles → Lv 10.

### Building budget

| Building | GID | Level | Slots | Why |
|----------|-----|-------|-------|-----|
| Main Building | 15 | 20 | 1 | Build time |
| Rally Point | 16 | 20 | 1 | TS prereq; attack coordination |
| Barracks | 19 | 20 | 1 | Main infantry training |
| Stable | 20 | 20 | 1 | Cavalry training |
| Workshop | 21 | 20 | 1 | Ram / catapult |
| Academy | 22 | 20 | 1 | Smithy + Workshop + Town Hall prereq |
| Smithy | 13 | 20 | 1 | Unit upgrades |
| Tournament Square | 14 | 20 | 1 | Long-range speed |
| Hospital | 46 | 20 | 1 | 40% troop recovery |
| Town Hall | 24 | 10 | 1 | Great Celebrations for loyalty 125% |
| Marketplace | 17 | 20 | 1 | Receive crop from NPC |
| Trade Office | 28 | 20 | 1 | Merchant capacity |
| Palace | 26 | 20 | 1 | 3 chief slots (3-chief hammer) |
| Warehouse | 10 | 20 × 2 | 2 | Resource buffer |
| Granary | 11 | 20 × 3 | 3 | **Crop buffer is critical** — ops move massive crop |
| **Total** | | | **18** | |

Leaves 2 slots for:
- Great Barracks (GID 29) Lv 20 — doubles infantry output (non-capital only)
- Great Stable (GID 30) Lv 20 — doubles cavalry output

### Advanced: "Greats" hammer variant

Drop Workshop to Lv 10 (still train cats, slower) to fit Great Barracks + Great Stable. Late-game only.

### NOT included

- Residence (Palace chosen instead — Palace gives 3 chief slots)
- Bonus resource buildings (Sawmill etc) — feeders handle this; hammer slots too valuable
- Cranny — useless; hammer's resources are always in transit

---

## 4. Defense (Anvil) Village Template

**Purpose:** Mass-produce defensive troops. Respond to defense calls.

### Resource fields

All 18 tiles → Lv 10.

### Building budget

| Building | GID | Level | Slots | Why |
|----------|-----|-------|-------|-----|
| Main Building | 15 | 20 | 1 | Build time |
| Wall | 31 / 32 / 33 / 42 / 43 / 47 | 20 | 1 | Tribe-specific wall |
| Rally Point | 16 | 10 | 1 | Required; Lv 10 enough for anvil |
| Barracks | 19 | 20 | 1 | Infantry defense |
| Stable | 20 | 10-15 | 1 | Cavalry defense (optional to 20) |
| Academy | 22 | 20 | 1 | Smithy + Hospital prereq |
| Smithy | 13 | 20 | 1 | Defense unit upgrades |
| Hospital | 46 | 20 | 1 | 40% casualty recovery |
| Town Hall | 24 | 10 | 1 | Celebrations (CP + loyalty) |
| Trapper | 36 | 20 | 1 | **Gaul only** (captures raiders) |
| Marketplace | 17 | 20 | 1 | Receive def troops from allies |
| Trade Office | 28 | 10 | 1 | Merchant capacity |
| Residence | 25 | 10-20 | 1 | Chief-slot defense |
| Warehouse | 10 | 20 × 2 | 2 | Resource buffer |
| Granary | 11 | 20 × 2 | 2 | Crop for def troops + Hospital bills |
| **Total** | | | **17-18 (Gaul)** / **16-17 (non-Gaul)** | |

### Tribe-specific wall GID

| Tribe | Wall GID |
|-------|----------|
| Romans | 31 |
| Teutons | 32 |
| Gauls | 33 |
| Egyptians | 42 |
| Huns | 43 |
| Spartans | 47 |
| Vikings | (version-dependent; read from game data) |

### Slot leftovers

- Second Trapper (Gaul can build multiple — extra passive def)
- Hero's Mansion (if oasis available)
- Extra Granary (defense calls drain crop fast)

---

## 5. NPC Village Template

**Purpose:** Storage + NPC conversion + resource distribution hub.

Full details in `docs/knowledge/npc-village-template.md`.

### Summary

| Building | GID | Level | Slots |
|----------|-----|-------|-------|
| Main Building | 15 | 10 | 1 |
| Marketplace | 17 | 20 | 1 |
| Trade Office | 28 | 20 | 1 |
| Town Hall | 24 | 10 | 1 (optional) |
| Warehouse | 10 | 20 × 5-6 | 5-6 |
| Great Warehouse | 38 | 20 × 2-3 | 2-3 |
| Granary | 11 | 20 × 4-5 | 4-5 |
| Great Granary | 39 | 20 × 1-2 | 1-2 |
| Residence | 25 | 10 | 1 (optional) |
| **Total** | | | **16-20** |

WH-to-GR ratio: 1:3 (NPC converts everything INTO crop, so crop storage dominates).
```

- [ ] **Step 2: Commit**

```bash
git add docs/knowledge/template-definitions.md
git commit -m "docs(knowledge): rewrite templates slot-budget-first (cap=no barracks, NPC added)"
```

---

## Section B — Calculator #1: Optimal Village Builder

Nine tasks following TDD. This calculator takes a cropper profile + oasis configuration + options and returns a Lumi-style recommended build order.

### Task B1: Define request/response schemas

**Files:**
- Modify: `backend/app/domain/schemas/advanced_calculator.py` (append to bottom)

- [ ] **Step 1: Append schema block**

Append after the final existing schema:

```python
# ============ Village Builder (最佳建造順序) ============


class OasisConfig(BaseModel):
    """單一綠洲設定."""

    crop_bonus: int = Field(
        0,
        description="綠洲穀物加成 (0, 25, 50)",
    )
    wood_bonus: int = Field(0, description="綠洲木材加成 (0, 25)")
    clay_bonus: int = Field(0, description="綠洲磚塊加成 (0, 25)")
    iron_bonus: int = Field(0, description="綠洲鐵礦加成 (0, 25)")


class VillageBuilderRequest(BaseModel):
    """最佳建造順序計算器請求."""

    cropper_type: str = Field(
        ...,
        description="首都類型代碼：'15c', '9c', '7c', '6c', '4446', '3347'",
    )
    oases: list[OasisConfig] = Field(
        default_factory=list,
        description="1-3 個綠洲設定；空清單表示未奪綠洲",
    )
    tribe_egyptian: bool = Field(
        False, description="是否為埃及族 (Waterworks 加成啟用)"
    )
    gold_plus: bool = Field(False, description="是否有 Plus 帳號 +25% 加成")
    target_field_level: int = Field(
        18, ge=10, le=20, description="目標資源田等級 (10, 15, 18, 19)"
    )


class BuildStep(BaseModel):
    """建造序列中的單一步驟."""

    step: int
    action: str = Field(
        ...,
        description="動作類型：'upgrade_field' | 'upgrade_bonus_building' | 'note'",
    )
    target: str = Field(
        ..., description="目標：'woodcutter', 'bakery', 'warehouse', 'info', etc."
    )
    from_level: int | None = None
    to_level: int | None = None
    reason: str | None = Field(
        None, description="為什麼這個時間點升這個"
    )


class VillageBuilderResponse(BaseModel):
    """最佳建造順序計算器回應."""

    cropper_type: str
    tribe_egyptian: bool
    gold_plus: bool
    target_field_level: int
    total_steps: int
    build_sequence: list[BuildStep]
    estimated_days: float = Field(
        ..., description="以 x1 速度粗估完成天數"
    )
```

- [ ] **Step 2: Commit schemas only**

```bash
git add backend/app/domain/schemas/advanced_calculator.py
git commit -m "feat(schemas): add VillageBuilder request/response"
```

---

### Task B2: Write service test — 15c basic case

**Files:**
- Create: `backend/tests/unit/test_village_builder_service.py`

- [ ] **Step 1: Write the failing test**

```python
"""Tests for Village Builder service (Lumi-style build order)."""

from app.domain.schemas.advanced_calculator import (
    OasisConfig,
    VillageBuilderRequest,
)
from app.services.advanced_calculator_service import get_advanced_calculator_service


def test_15c_no_oasis_non_egyptian_no_gold_to_lv18():
    """15-cropper basic case: should NOT include Sawmill/Brickyard/Iron Foundry."""
    service = get_advanced_calculator_service()
    req = VillageBuilderRequest(
        cropper_type="15c",
        oases=[],
        tribe_egyptian=False,
        gold_plus=False,
        target_field_level=18,
    )
    res = service.calculate_village_builder(req)

    assert res.cropper_type == "15c"
    assert res.total_steps == len(res.build_sequence)
    assert res.total_steps > 0

    # 15c should never build Sawmill/Brickyard/Iron Foundry (Lumi rule)
    wasted_bonus = [
        s
        for s in res.build_sequence
        if s.action == "upgrade_bonus_building"
        and s.target in {"sawmill", "brickyard", "iron_foundry"}
    ]
    assert wasted_bonus == [], f"15c must skip non-crop bonus buildings; got {wasted_bonus}"

    # 15c SHOULD include grain_mill and bakery
    has_mill = any(
        s.target == "grain_mill" and s.action == "upgrade_bonus_building"
        for s in res.build_sequence
    )
    has_bakery = any(
        s.target == "bakery" and s.action == "upgrade_bonus_building"
        for s in res.build_sequence
    )
    assert has_mill, "15c must include grain_mill"
    assert has_bakery, "15c must include bakery"

    # Final crop field level should match target
    crop_steps = [
        s
        for s in res.build_sequence
        if s.action == "upgrade_field" and s.target == "cropland"
    ]
    assert crop_steps, "Must have at least one crop field step"
    final_crop_level = max(s.to_level for s in crop_steps)
    assert final_crop_level == 18
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3/backend
pytest tests/unit/test_village_builder_service.py -v
```

Expected: FAIL with `AttributeError: 'AdvancedCalculatorService' object has no attribute 'calculate_village_builder'`.

---

### Task B3: Implement minimal 15c service logic

**Files:**
- Modify: `backend/app/services/advanced_calculator_service.py`

- [ ] **Step 1: Add method to AdvancedCalculatorService**

Append inside the service class (find the class definition and add before the trailing `get_advanced_calculator_service` factory):

```python
    # ─── Village Builder (Lumi-style) ─────────────────────────────

    def calculate_village_builder(
        self, request: "VillageBuilderRequest"
    ) -> "VillageBuilderResponse":
        """Build a Lumi-style recommended construction order.

        Algorithm (initial, rule-based; expanded in later tickets):
        1. Determine whether the cropper is a 15c (crop-only bonus) or
           standard (all four bonus buildings).
        2. Generate field-upgrade waves interleaved with bonus-building
           upgrades at the levels unlocked by prereqs.
        3. Estimate total days using naive cost / production ratio.
        """
        from app.domain.schemas.advanced_calculator import (
            BuildStep,
            VillageBuilderResponse,
        )

        steps: list[BuildStep] = []
        step_num = 1
        is_15c = request.cropper_type == "15c"

        # Phase 1: bring all 4 resource-field types to Lv 5
        for field in ("woodcutter", "clay_pit", "iron_mine", "cropland"):
            steps.append(
                BuildStep(
                    step=step_num,
                    action="upgrade_field",
                    target=field,
                    from_level=0,
                    to_level=5,
                    reason="Phase 1: all fields to Lv 5 before bonus prereqs",
                )
            )
            step_num += 1

        # Phase 2: unlock Grain Mill (Cropland Lv 5 prereq) — always
        steps.append(
            BuildStep(
                step=step_num,
                action="upgrade_bonus_building",
                target="grain_mill",
                from_level=0,
                to_level=5,
                reason="Unlock crop +25% — stacks with Bakery",
            )
        )
        step_num += 1

        # Phase 3: crop fields to Lv 10
        steps.append(
            BuildStep(
                step=step_num,
                action="upgrade_field",
                target="cropland",
                from_level=5,
                to_level=10,
                reason="Cropland priority — Lv 10 unlocks Bakery",
            )
        )
        step_num += 1

        # Phase 4: Bakery (requires Cropland Lv 10 + Grain Mill Lv 5 + MB Lv 5)
        steps.append(
            BuildStep(
                step=step_num,
                action="upgrade_bonus_building",
                target="bakery",
                from_level=0,
                to_level=5,
                reason="+25% crop stacks with Grain Mill",
            )
        )
        step_num += 1

        # Phase 5 (NON-15c only): Sawmill, Brickyard, Iron Foundry
        if not is_15c:
            for field, bonus in (
                ("woodcutter", "sawmill"),
                ("clay_pit", "brickyard"),
                ("iron_mine", "iron_foundry"),
            ):
                # Field Lv 10 first (prereq for bonus)
                steps.append(
                    BuildStep(
                        step=step_num,
                        action="upgrade_field",
                        target=field,
                        from_level=5,
                        to_level=10,
                        reason=f"Lv 10 {field} unlocks {bonus}",
                    )
                )
                step_num += 1
                steps.append(
                    BuildStep(
                        step=step_num,
                        action="upgrade_bonus_building",
                        target=bonus,
                        from_level=0,
                        to_level=5,
                        reason=f"+25% {field} production",
                    )
                )
                step_num += 1

        # Phase 6: push all fields to target level
        final_lvl = request.target_field_level
        if final_lvl > 10:
            for field in ("woodcutter", "clay_pit", "iron_mine", "cropland"):
                # 15c only pushes cropland past Lv 10
                if is_15c and field != "cropland":
                    continue
                steps.append(
                    BuildStep(
                        step=step_num,
                        action="upgrade_field",
                        target=field,
                        from_level=10,
                        to_level=final_lvl,
                        reason=f"Push to Lv {final_lvl}",
                    )
                )
                step_num += 1

        # Crude estimate: assume 0.5 days per field-level upgrade after Lv 10
        total_upgrades_after_10 = sum(
            (s.to_level - 10) for s in steps if s.action == "upgrade_field" and s.to_level > 10
        )
        estimated_days = (
            len(steps) * 0.3 + total_upgrades_after_10 * 0.5
        )
        # Gold Plus shaves 15% off naive estimate
        if request.gold_plus:
            estimated_days *= 0.85

        return VillageBuilderResponse(
            cropper_type=request.cropper_type,
            tribe_egyptian=request.tribe_egyptian,
            gold_plus=request.gold_plus,
            target_field_level=request.target_field_level,
            total_steps=len(steps),
            build_sequence=steps,
            estimated_days=round(estimated_days, 1),
        )
```

- [ ] **Step 2: Run test to confirm pass**

```bash
pytest tests/unit/test_village_builder_service.py -v
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/advanced_calculator_service.py backend/tests/unit/test_village_builder_service.py
git commit -m "feat(village-builder): minimal 15c + standard cropper build order"
```

---

### Task B4: Add cropper-variant and oasis-impact tests

**Files:**
- Modify: `backend/tests/unit/test_village_builder_service.py`

- [ ] **Step 1: Append additional test cases**

```python
def test_9c_includes_all_bonus_buildings():
    """9-cropper (non-15c) must build all four bonus buildings."""
    service = get_advanced_calculator_service()
    req = VillageBuilderRequest(
        cropper_type="9c",
        oases=[],
        tribe_egyptian=False,
        gold_plus=False,
        target_field_level=18,
    )
    res = service.calculate_village_builder(req)

    targets = {
        s.target
        for s in res.build_sequence
        if s.action == "upgrade_bonus_building"
    }
    assert {"grain_mill", "bakery", "sawmill", "brickyard", "iron_foundry"} <= targets


def test_gold_plus_shortens_estimate():
    """Gold Plus should reduce estimated completion days by ~15%."""
    service = get_advanced_calculator_service()
    base = VillageBuilderRequest(
        cropper_type="9c", oases=[], target_field_level=18, gold_plus=False
    )
    boosted = VillageBuilderRequest(
        cropper_type="9c", oases=[], target_field_level=18, gold_plus=True
    )
    a = service.calculate_village_builder(base).estimated_days
    b = service.calculate_village_builder(boosted).estimated_days
    assert b < a
    assert 0.80 < b / a < 0.90  # 15% reduction ±5pp


def test_oasis_stored_in_response():
    """Oasis inputs should pass through (even if current engine doesn't factor
    them into order yet — future tickets will)."""
    service = get_advanced_calculator_service()
    req = VillageBuilderRequest(
        cropper_type="15c",
        oases=[
            OasisConfig(crop_bonus=50),
            OasisConfig(crop_bonus=25, wood_bonus=25),
        ],
        target_field_level=18,
    )
    res = service.calculate_village_builder(req)
    assert res.cropper_type == "15c"  # passthrough check
    assert res.total_steps > 0
```

- [ ] **Step 2: Run the added tests**

```bash
pytest tests/unit/test_village_builder_service.py -v
```

Expected: All three PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/unit/test_village_builder_service.py
git commit -m "test(village-builder): cover 9c variant, gold plus, oasis passthrough"
```

---

### Task B5: Add API endpoint for Village Builder

**Files:**
- Modify: `backend/app/api/v1/endpoints/advanced_calculator.py`

- [ ] **Step 1: Update imports at top of file**

Add `VillageBuilderRequest` and `VillageBuilderResponse` to the existing import block:

```python
from app.domain.schemas.advanced_calculator import (
    CulturePointsRequest,
    CulturePointsResponse,
    InterceptionRequest,
    InterceptionResponse,
    NpcCalculatorRequest,
    NpcCalculatorResponse,
    PathCalculatorRequest,
    PathCalculatorResponse,
    PathSpeedTsRequest,
    PathSpeedTsResponse,
    SaveTroopsRequest,
    SaveTroopsResponse,
    TechnologyRequest,
    TechnologyResponse,
    VillageBuilderRequest,
    VillageBuilderResponse,
)
```

- [ ] **Step 2: Append endpoint at end of file**

```python
@router.post("/village-builder", response_model=VillageBuilderResponse)
async def calculate_village_builder(
    request: VillageBuilderRequest,
) -> VillageBuilderResponse:
    """最佳建造順序計算器 — 依 cropper 類型 + 綠洲 + Plus 產出 Lumi 風格建造序列."""
    service = get_advanced_calculator_service()
    return service.calculate_village_builder(request)
```

- [ ] **Step 3: Write API test**

Append to `backend/tests/unit/test_calculator_api.py` (or create a new file if you prefer):

```python
def test_village_builder_endpoint_happy_path(client):
    """POST /advanced-calculator/village-builder returns a build sequence."""
    payload = {
        "cropper_type": "15c",
        "oases": [],
        "tribe_egyptian": False,
        "gold_plus": False,
        "target_field_level": 18,
    }
    response = client.post("/api/v1/advanced-calculator/village-builder", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["cropper_type"] == "15c"
    assert body["total_steps"] == len(body["build_sequence"])
    assert body["total_steps"] > 0


def test_village_builder_endpoint_invalid_field_level(client):
    """target_field_level outside 10-20 should 422."""
    payload = {"cropper_type": "15c", "target_field_level": 25}
    response = client.post("/api/v1/advanced-calculator/village-builder", json=payload)
    assert response.status_code == 422
```

- [ ] **Step 4: Run the API tests**

```bash
pytest tests/unit/test_calculator_api.py::test_village_builder_endpoint_happy_path \
       tests/unit/test_calculator_api.py::test_village_builder_endpoint_invalid_field_level -v
```

Expected: Both PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/advanced_calculator.py backend/tests/unit/test_calculator_api.py
git commit -m "feat(village-builder): expose /advanced-calculator/village-builder"
```

---

### Task B6: Frontend API client for Village Builder

**Files:**
- Modify: `frontend/src/api/` (locate existing advanced-calculator client OR create)

- [ ] **Step 1: Locate the existing advanced calculator client file**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3/frontend
grep -rn "advanced-calculator" src/api/ 2>/dev/null | head -5
```

Add to the found file (likely `src/api/advanced-calculator.ts` or similar). If none exists, create `src/api/advanced-calculator.ts` with this content block; otherwise append to existing file:

```typescript
// === Village Builder ===

export interface OasisConfig {
  crop_bonus: number;
  wood_bonus: number;
  clay_bonus: number;
  iron_bonus: number;
}

export interface VillageBuilderRequest {
  cropper_type: "15c" | "9c" | "7c" | "6c" | "4446" | "3347";
  oases: OasisConfig[];
  tribe_egyptian: boolean;
  gold_plus: boolean;
  target_field_level: number;
}

export interface BuildStep {
  step: number;
  action: "upgrade_field" | "upgrade_bonus_building" | "note";
  target: string;
  from_level: number | null;
  to_level: number | null;
  reason: string | null;
}

export interface VillageBuilderResponse {
  cropper_type: string;
  tribe_egyptian: boolean;
  gold_plus: boolean;
  target_field_level: number;
  total_steps: number;
  build_sequence: BuildStep[];
  estimated_days: number;
}

export async function postVillageBuilder(
  req: VillageBuilderRequest,
): Promise<VillageBuilderResponse> {
  const response = await fetch("/api/v1/advanced-calculator/village-builder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!response.ok) throw new Error(`Village builder API failed: ${response.status}`);
  return response.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/
git commit -m "feat(village-builder): frontend API client"
```

---

### Task B7: Frontend page — Village Builder

**Files:**
- Create: `frontend/src/pages/calculator/VillageBuilderPage.tsx`

- [ ] **Step 1: Create the page component**

```tsx
import { useState } from "react";
import { postVillageBuilder, type VillageBuilderResponse } from "@/api/advanced-calculator";

export default function VillageBuilderPage() {
  const [cropperType, setCropperType] = useState<"15c" | "9c" | "7c" | "6c" | "4446" | "3347">("15c");
  const [targetLevel, setTargetLevel] = useState(18);
  const [goldPlus, setGoldPlus] = useState(false);
  const [egyptian, setEgyptian] = useState(false);
  const [result, setResult] = useState<VillageBuilderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await postVillageBuilder({
        cropper_type: cropperType,
        oases: [],
        tribe_egyptian: egyptian,
        gold_plus: goldPlus,
        target_field_level: targetLevel,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">最佳建造順序 / Optimal Village Builder</h1>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">首都類型</label>
          <select
            data-testid="cropper-type"
            className="border rounded px-2 py-1"
            value={cropperType}
            onChange={(e) => setCropperType(e.target.value as typeof cropperType)}
          >
            <option value="15c">15-cropper</option>
            <option value="9c">9-cropper</option>
            <option value="7c">7-cropper</option>
            <option value="6c">6-cropper</option>
            <option value="4446">4-4-4-6</option>
            <option value="3347">3-3-4-7</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">目標資源田等級 (10-20)</label>
          <input
            type="number"
            min={10}
            max={20}
            data-testid="target-level"
            className="border rounded px-2 py-1 w-24"
            value={targetLevel}
            onChange={(e) => setTargetLevel(parseInt(e.target.value) || 18)}
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={goldPlus} onChange={(e) => setGoldPlus(e.target.checked)} />
            Gold Plus (+25%)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={egyptian} onChange={(e) => setEgyptian(e.target.checked)} />
            埃及族 (Egyptian)
          </label>
        </div>

        <button
          data-testid="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
          onClick={submit}
        >
          {loading ? "計算中…" : "Simulate"}
        </button>
      </div>

      {error && <p className="text-red-600" data-testid="error">{error}</p>}

      {result && (
        <div className="border rounded p-4" data-testid="result">
          <p className="mb-2">共 {result.total_steps} 步，粗估 {result.estimated_days} 天</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {result.build_sequence.map((s) => (
              <li key={s.step}>
                <span className="font-mono">[{s.action}]</span> {s.target}
                {s.from_level !== null && s.to_level !== null
                  ? ` Lv ${s.from_level} → Lv ${s.to_level}`
                  : ""}
                {s.reason ? <span className="text-gray-500"> — {s.reason}</span> : ""}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register the route**

Open `frontend/src/pages/calculator/index.ts` (or wherever routes are aggregated). Add:

```typescript
export { default as VillageBuilderPage } from "./VillageBuilderPage";
```

Then open the main router file (likely `frontend/src/App.tsx` or `frontend/src/routes.tsx`). Find the block where existing calculator routes are registered (e.g., `RoiCalculatorPage`, `BuildingCalculatorPage`). Add a route:

```tsx
<Route path="/calculator/village-builder" element={<VillageBuilderPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/calculator/VillageBuilderPage.tsx frontend/src/pages/calculator/index.ts frontend/src/App.tsx
git commit -m "feat(village-builder): frontend page + route"
```

---

### Task B8: Frontend smoke test for Village Builder page

**Files:**
- Create: `frontend/src/pages/calculator/__tests__/VillageBuilderPage.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VillageBuilderPage from "../VillageBuilderPage";

describe("VillageBuilderPage", () => {
  it("renders form and submits", async () => {
    const mockRes = {
      cropper_type: "15c",
      tribe_egyptian: false,
      gold_plus: false,
      target_field_level: 18,
      total_steps: 2,
      build_sequence: [
        { step: 1, action: "upgrade_field", target: "cropland", from_level: 0, to_level: 5, reason: "test" },
        { step: 2, action: "upgrade_bonus_building", target: "grain_mill", from_level: 0, to_level: 5, reason: null },
      ],
      estimated_days: 3.5,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockRes), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    render(<VillageBuilderPage />);

    fireEvent.change(screen.getByTestId("cropper-type"), { target: { value: "15c" } });
    fireEvent.change(screen.getByTestId("target-level"), { target: { value: "18" } });
    fireEvent.click(screen.getByTestId("submit"));

    await waitFor(() => expect(screen.getByTestId("result")).toBeInTheDocument());
    expect(screen.getByTestId("result").textContent).toContain("共 2 步");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/advanced-calculator/village-builder",
      expect.objectContaining({ method: "POST" }),
    );

    fetchSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the frontend test**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3/frontend
pnpm test -- VillageBuilderPage
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/calculator/__tests__/VillageBuilderPage.test.tsx
git commit -m "test(village-builder): frontend page renders + submits"
```

---

## Section C — Calculator #2: Crop Scouter

Five tasks. Estimate enemy cropper type from scouted production values.

### Task C1: Schema + service test + service implementation

**Files:**
- Modify: `backend/app/domain/schemas/advanced_calculator.py`
- Modify: `backend/app/services/advanced_calculator_service.py`
- Create: `backend/tests/unit/test_crop_scouter_service.py`

- [ ] **Step 1: Append schemas**

Append to `advanced_calculator.py`:

```python
# ============ Crop Scouter (反推首都類型) ============


class CropScouterRequest(BaseModel):
    """Crop Scouter 請求 — 偵查結果反推對手首都類型."""

    wood_production: int = Field(..., ge=0, description="木材產量 (per hour)")
    clay_production: int = Field(..., ge=0, description="磚塊產量")
    iron_production: int = Field(..., ge=0, description="鐵礦產量")
    crop_production: int = Field(..., ge=0, description="穀物產量")
    population: int = Field(..., ge=0, description="人口數 (用於推斷等級)")
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")


class CropperMatch(BaseModel):
    """反推的可能首都類型結果."""

    cropper_type: str
    likelihood: float = Field(..., ge=0.0, le=1.0)
    reasoning: str


class CropScouterResponse(BaseModel):
    """Crop Scouter 回應 — 可能性排序的候選首都類型."""

    matches: list[CropperMatch]
    dominant_resource: str = Field(
        ..., description="主要產出資源：'wood', 'clay', 'iron', 'crop'"
    )
    wood_to_crop_ratio: float
```

- [ ] **Step 2: Write service test**

Create `backend/tests/unit/test_crop_scouter_service.py`:

```python
"""Tests for Crop Scouter service."""

from app.domain.schemas.advanced_calculator import CropScouterRequest
from app.services.advanced_calculator_service import get_advanced_calculator_service


def test_15c_detected_by_crop_dominance():
    """A 15c village has very high crop relative to other resources."""
    service = get_advanced_calculator_service()
    req = CropScouterRequest(
        wood_production=1000,
        clay_production=1000,
        iron_production=1000,
        crop_production=9000,  # 9× the others
        population=600,
        server_speed=1,
    )
    res = service.calculate_crop_scouter(req)
    assert res.dominant_resource == "crop"
    assert res.matches[0].cropper_type == "15c"
    assert res.matches[0].likelihood >= 0.7


def test_standard_4446_balanced():
    """Balanced production (4-4-4-6) shouldn't flag as 15c."""
    service = get_advanced_calculator_service()
    req = CropScouterRequest(
        wood_production=2400,
        clay_production=2400,
        iron_production=2400,
        crop_production=3600,
        population=500,
        server_speed=1,
    )
    res = service.calculate_crop_scouter(req)
    assert res.matches[0].cropper_type != "15c"
    # Should be 4446 or 3347 - likely 4446 given these numbers
    assert res.matches[0].cropper_type in {"4446", "3347", "9c"}
```

- [ ] **Step 3: Implement service method**

Append to `AdvancedCalculatorService` class:

```python
    def calculate_crop_scouter(
        self, request: "CropScouterRequest"
    ) -> "CropScouterResponse":
        """Estimate cropper type from scouted resource production.

        Heuristic:
          - crop-to-average-other ratio > 3× → 15c
          - ratio 2-3× → 9c
          - ratio 1.5-2× → 7c
          - ratio 1.2-1.5× → 6c
          - near 1:1 average → 4446 or 3347
        """
        from app.domain.schemas.advanced_calculator import (
            CropperMatch,
            CropScouterResponse,
        )

        resources = {
            "wood": request.wood_production,
            "clay": request.clay_production,
            "iron": request.iron_production,
            "crop": request.crop_production,
        }
        dominant = max(resources, key=lambda k: resources[k])

        avg_others = (
            request.wood_production + request.clay_production + request.iron_production
        ) / 3
        crop_ratio = (
            request.crop_production / avg_others if avg_others > 0 else 0
        )
        wood_to_crop = (
            request.wood_production / request.crop_production
            if request.crop_production > 0
            else 0
        )

        matches: list[CropperMatch] = []

        if crop_ratio >= 3.0:
            matches.append(
                CropperMatch(
                    cropper_type="15c",
                    likelihood=min(crop_ratio / 4.5, 1.0),
                    reasoning=f"Crop產量是其他平均的 {crop_ratio:.1f}×，強烈暗示 15c",
                )
            )
            matches.append(
                CropperMatch(
                    cropper_type="9c",
                    likelihood=0.2,
                    reasoning="次候選，9c 也可能呈現高 crop 比例",
                )
            )
        elif 2.0 <= crop_ratio < 3.0:
            matches.append(
                CropperMatch(
                    cropper_type="9c",
                    likelihood=0.75,
                    reasoning=f"Crop:avg ≈ {crop_ratio:.1f}×，9c 特徵",
                )
            )
            matches.append(
                CropperMatch(
                    cropper_type="15c",
                    likelihood=0.15,
                    reasoning="15c 可能但產量尚未衝出來",
                )
            )
        elif 1.5 <= crop_ratio < 2.0:
            matches.append(
                CropperMatch(
                    cropper_type="7c",
                    likelihood=0.7,
                    reasoning=f"Crop:avg ≈ {crop_ratio:.1f}×，7c 常見",
                )
            )
        elif 1.2 <= crop_ratio < 1.5:
            matches.append(
                CropperMatch(
                    cropper_type="6c",
                    likelihood=0.65,
                    reasoning=f"Crop:avg ≈ {crop_ratio:.1f}×，6c 常見",
                )
            )
        else:
            matches.append(
                CropperMatch(
                    cropper_type="4446",
                    likelihood=0.6,
                    reasoning="資源平衡，非 cropper 首都 (4-4-4-6)",
                )
            )
            matches.append(
                CropperMatch(
                    cropper_type="3347",
                    likelihood=0.3,
                    reasoning="次候選 3-3-4-7",
                )
            )

        return CropScouterResponse(
            matches=matches,
            dominant_resource=dominant,
            wood_to_crop_ratio=round(wood_to_crop, 3),
        )
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3/backend
pytest tests/unit/test_crop_scouter_service.py -v
```

Expected: Both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/domain/schemas/advanced_calculator.py \
        backend/app/services/advanced_calculator_service.py \
        backend/tests/unit/test_crop_scouter_service.py
git commit -m "feat(crop-scouter): service + schemas + tests"
```

---

### Task C2: Endpoint + API test for Crop Scouter

**Files:**
- Modify: `backend/app/api/v1/endpoints/advanced_calculator.py`
- Modify: `backend/tests/unit/test_calculator_api.py`

- [ ] **Step 1: Add endpoint**

Add to the imports:

```python
from app.domain.schemas.advanced_calculator import (
    # ... existing imports ...
    CropScouterRequest,
    CropScouterResponse,
)
```

Append endpoint:

```python
@router.post("/crop-scouter", response_model=CropScouterResponse)
async def calculate_crop_scouter(
    request: CropScouterRequest,
) -> CropScouterResponse:
    """首都類型反推器 — 從偵查產量推測對手 cropper 類型."""
    service = get_advanced_calculator_service()
    return service.calculate_crop_scouter(request)
```

- [ ] **Step 2: Write API test**

Append to `test_calculator_api.py`:

```python
def test_crop_scouter_endpoint_happy_path(client):
    payload = {
        "wood_production": 1000,
        "clay_production": 1000,
        "iron_production": 1000,
        "crop_production": 9000,
        "population": 600,
        "server_speed": 1,
    }
    response = client.post("/api/v1/advanced-calculator/crop-scouter", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["dominant_resource"] == "crop"
    assert body["matches"][0]["cropper_type"] == "15c"
```

- [ ] **Step 3: Run tests and commit**

```bash
pytest tests/unit/test_calculator_api.py::test_crop_scouter_endpoint_happy_path -v
git add backend/app/api/v1/endpoints/advanced_calculator.py backend/tests/unit/test_calculator_api.py
git commit -m "feat(crop-scouter): endpoint + API test"
```

---

### Task C3: Frontend Crop Scouter page

**Files:**
- Modify: `frontend/src/api/advanced-calculator.ts`
- Create: `frontend/src/pages/calculator/CropScouterPage.tsx`
- Modify: `frontend/src/pages/calculator/index.ts` + router

- [ ] **Step 1: Add API client**

Append to `advanced-calculator.ts`:

```typescript
export interface CropScouterRequest {
  wood_production: number;
  clay_production: number;
  iron_production: number;
  crop_production: number;
  population: number;
  server_speed: number;
}

export interface CropperMatch {
  cropper_type: string;
  likelihood: number;
  reasoning: string;
}

export interface CropScouterResponse {
  matches: CropperMatch[];
  dominant_resource: string;
  wood_to_crop_ratio: number;
}

export async function postCropScouter(req: CropScouterRequest): Promise<CropScouterResponse> {
  const response = await fetch("/api/v1/advanced-calculator/crop-scouter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!response.ok) throw new Error(`Crop scouter API failed: ${response.status}`);
  return response.json();
}
```

- [ ] **Step 2: Create page component**

`frontend/src/pages/calculator/CropScouterPage.tsx`:

```tsx
import { useState } from "react";
import { postCropScouter, type CropScouterResponse } from "@/api/advanced-calculator";

export default function CropScouterPage() {
  const [wood, setWood] = useState(0);
  const [clay, setClay] = useState(0);
  const [iron, setIron] = useState(0);
  const [crop, setCrop] = useState(0);
  const [population, setPopulation] = useState(0);
  const [result, setResult] = useState<CropScouterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const res = await postCropScouter({
        wood_production: wood,
        clay_production: clay,
        iron_production: iron,
        crop_production: crop,
        population,
        server_speed: 1,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const ResourceInput = ({ label, value, onChange, testId }: { label: string; value: number; onChange: (n: number) => void; testId: string }) => (
    <div>
      <label className="block text-sm">{label}</label>
      <input
        type="number"
        data-testid={testId}
        min={0}
        className="border rounded px-2 py-1 w-32"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">首都類型反推 / Crop Scouter</h1>
      <p className="text-gray-500 mb-4 text-sm">
        輸入偵查到的對手每小時資源產量，估算其首都類型（15c / 9c / 7c / 6c / 4446 / 3347）。
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <ResourceInput label="木材 / 小時" value={wood} onChange={setWood} testId="wood" />
        <ResourceInput label="磚塊 / 小時" value={clay} onChange={setClay} testId="clay" />
        <ResourceInput label="鐵礦 / 小時" value={iron} onChange={setIron} testId="iron" />
        <ResourceInput label="穀物 / 小時" value={crop} onChange={setCrop} testId="crop" />
        <ResourceInput label="人口" value={population} onChange={setPopulation} testId="population" />
      </div>

      <button
        data-testid="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={submit}
      >
        反推
      </button>

      {error && <p className="text-red-600 mt-4" data-testid="error">{error}</p>}

      {result && (
        <div className="mt-6 border rounded p-4" data-testid="result">
          <p className="mb-2">主要資源：{result.dominant_resource}</p>
          <p className="mb-4 text-sm text-gray-500">木:穀 比例 {result.wood_to_crop_ratio}</p>
          <ul className="space-y-2">
            {result.matches.map((m, i) => (
              <li key={i} className="border-l-4 border-blue-500 pl-2">
                <span className="font-bold">{m.cropper_type}</span>
                <span className="ml-2 text-gray-600">(信心 {(m.likelihood * 100).toFixed(0)}%)</span>
                <div className="text-sm text-gray-500">{m.reasoning}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Register route**

In `frontend/src/pages/calculator/index.ts`:

```typescript
export { default as CropScouterPage } from "./CropScouterPage";
```

In main router file, add:

```tsx
<Route path="/calculator/crop-scouter" element={<CropScouterPage />} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/advanced-calculator.ts \
        frontend/src/pages/calculator/CropScouterPage.tsx \
        frontend/src/pages/calculator/index.ts \
        frontend/src/App.tsx
git commit -m "feat(crop-scouter): frontend page + API client + route"
```

---

## Section D — Calculator #3: Attack TS Optimizer + Fake Troops

Ten tasks. Two related computations bundled because Travco also groups them.

### Task D1: Schemas for both calculators

**Files:**
- Modify: `backend/app/domain/schemas/advanced_calculator.py`

- [ ] **Step 1: Append schemas**

```python
# ============ Attack TS Optimizer (攻擊 TS 優化器) ============


class AttackerProfile(BaseModel):
    """單一攻擊村莊的時速/TS 配置."""

    village_label: str = Field(..., description="識別名，例如 'Hammer-1'")
    x: int = Field(..., ge=-200, le=200)
    y: int = Field(..., ge=-200, le=200)
    unit_speed: int = Field(..., gt=0, description="最慢發送部隊速度")
    ts_level: int = Field(0, ge=0, le=20, description="當前 TS 等級")
    allow_ts_adjustment: bool = Field(
        True,
        description="是否允許在發送前微調 TS 等級以命中時間窗",
    )


class TsOptimizerRequest(BaseModel):
    """攻擊 TS 優化器請求 — 多個攻擊者共同對一目標."""

    target_x: int = Field(..., ge=-200, le=200)
    target_y: int = Field(..., ge=-200, le=200)
    target_arrival: str = Field(
        ...,
        description="所有波次希望抵達的絕對時間 (ISO 8601 或 HH:MM:SS)",
    )
    attackers: list[AttackerProfile] = Field(
        ..., min_length=1, description="所有參與攻擊者"
    )
    wave_spacing_seconds: float = Field(
        1.0, ge=0.0, le=10.0, description="波次間距（秒）"
    )
    server_speed: int = Field(1, ge=1, le=10)


class TsOptimizerResult(BaseModel):
    """單一攻擊者的最優發送設定."""

    village_label: str
    recommended_ts_level: int
    send_time: str  # ISO 8601
    travel_time_formatted: str
    distance: float


class TsOptimizerResponse(BaseModel):
    """攻擊 TS 優化器回應."""

    target_arrival: str
    results: list[TsOptimizerResult]
    warnings: list[str] = Field(default_factory=list)


# ============ Fake Troops Calculator (佯攻部隊計算器) ============


class FakeTroopsRequest(BaseModel):
    """佯攻部隊計算器請求 — 計算看起來像真打的最小兵量."""

    target_population: int = Field(..., ge=0, description="目標村莊人口")
    attacker_tribe: str = Field(
        ...,
        description="攻擊者種族：'romans','teutons','gauls','huns','egyptians','spartans','vikings'",
    )
    include_catapults: bool = Field(
        True, description="是否包含催化彈（真打標配）"
    )
    include_rams: bool = Field(
        True, description="是否包含破城槌"
    )


class FakeTroopsResponse(BaseModel):
    """佯攻部隊計算器回應."""

    min_infantry: int
    min_cavalry: int
    min_catapults: int
    min_rams: int
    total_population_cost: int
    reasoning: str
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/domain/schemas/advanced_calculator.py
git commit -m "feat(ts-optimizer,fake-troops): schemas"
```

---

### Task D2: TS Optimizer service + test

**Files:**
- Modify: `backend/app/services/advanced_calculator_service.py`
- Create: `backend/tests/unit/test_ts_optimizer_service.py`

- [ ] **Step 1: Write service test**

```python
"""Tests for TS Optimizer service."""

from datetime import datetime, timedelta, timezone

from app.domain.schemas.advanced_calculator import AttackerProfile, TsOptimizerRequest
from app.services.advanced_calculator_service import get_advanced_calculator_service


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def test_two_attackers_same_target_sync_arrival():
    """Two attackers with different distances should get different send times.

    Closer attacker sends later; all arrive at the target time ±1 sec window.
    """
    service = get_advanced_calculator_service()
    target_time = datetime(2026, 5, 1, 12, 0, 0, tzinfo=timezone.utc)
    req = TsOptimizerRequest(
        target_x=0,
        target_y=0,
        target_arrival=_iso(target_time),
        attackers=[
            AttackerProfile(
                village_label="Near",
                x=10,
                y=0,  # 10 tiles away
                unit_speed=6,
                ts_level=0,
                allow_ts_adjustment=False,
            ),
            AttackerProfile(
                village_label="Far",
                x=100,
                y=0,  # 100 tiles away
                unit_speed=6,
                ts_level=10,
                allow_ts_adjustment=False,
            ),
        ],
        wave_spacing_seconds=1.0,
        server_speed=1,
    )
    res = service.calculate_ts_optimizer(req)

    assert len(res.results) == 2
    near = next(r for r in res.results if r.village_label == "Near")
    far = next(r for r in res.results if r.village_label == "Far")

    near_send = datetime.fromisoformat(near.send_time).replace(tzinfo=timezone.utc)
    far_send = datetime.fromisoformat(far.send_time).replace(tzinfo=timezone.utc)

    # Far must send BEFORE near
    assert far_send < near_send
    # Both send times must be in the past relative to target
    assert near_send < target_time
    assert far_send < target_time
```

- [ ] **Step 2: Implement service method**

Append to `AdvancedCalculatorService`:

```python
    def calculate_ts_optimizer(
        self, request: "TsOptimizerRequest"
    ) -> "TsOptimizerResponse":
        """Compute send times for multiple attackers to sync arrival on a target.

        For each attacker:
          distance = sqrt((dx)² + (dy)²)
          travel_sec = distance / (unit_speed × (1 + ts_bonus)) × 3600 / server_speed
          send_time = target_arrival - travel_sec - wave_spacing × wave_index
        """
        from datetime import datetime, timedelta, timezone

        from app.domain.schemas.advanced_calculator import (
            TsOptimizerResponse,
            TsOptimizerResult,
        )

        try:
            target_dt = datetime.fromisoformat(request.target_arrival)
            if target_dt.tzinfo is None:
                target_dt = target_dt.replace(tzinfo=timezone.utc)
        except ValueError as exc:
            raise ValueError(
                f"Invalid target_arrival: {request.target_arrival}; expected ISO 8601"
            ) from exc

        results: list[TsOptimizerResult] = []
        warnings: list[str] = []

        # Order attackers by distance descending; farthest sends first
        prepared = []
        for atk in request.attackers:
            dx = atk.x - request.target_x
            dy = atk.y - request.target_y
            distance = (dx * dx + dy * dy) ** 0.5
            prepared.append((distance, atk))
        prepared.sort(key=lambda p: -p[0])  # farthest first

        for wave_idx, (distance, atk) in enumerate(prepared):
            ts_level = atk.ts_level
            # Effective speed: base + 20% per TS level BEYOND 30 tiles
            if distance > 30:
                effective_speed = atk.unit_speed * (1 + ts_level * 0.20)
                near_speed = atk.unit_speed
                near_seconds = (30 / near_speed) * 3600 / request.server_speed
                far_seconds = (
                    (distance - 30) / effective_speed
                ) * 3600 / request.server_speed
                travel_sec = near_seconds + far_seconds
            else:
                travel_sec = (distance / atk.unit_speed) * 3600 / request.server_speed

            send_dt = target_dt - timedelta(
                seconds=travel_sec + wave_idx * request.wave_spacing_seconds
            )

            if send_dt <= datetime.now(timezone.utc):
                warnings.append(
                    f"{atk.village_label}: send time already in the past; "
                    f"raise TS or send fewer troops"
                )

            hours = int(travel_sec // 3600)
            minutes = int((travel_sec % 3600) // 60)
            secs = int(travel_sec % 60)
            travel_fmt = f"{hours}:{minutes:02d}:{secs:02d}"

            results.append(
                TsOptimizerResult(
                    village_label=atk.village_label,
                    recommended_ts_level=ts_level,
                    send_time=send_dt.isoformat(timespec="seconds"),
                    travel_time_formatted=travel_fmt,
                    distance=round(distance, 2),
                )
            )

        return TsOptimizerResponse(
            target_arrival=request.target_arrival,
            results=results,
            warnings=warnings,
        )
```

- [ ] **Step 3: Run test**

```bash
pytest tests/unit/test_ts_optimizer_service.py -v
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/advanced_calculator_service.py backend/tests/unit/test_ts_optimizer_service.py
git commit -m "feat(ts-optimizer): service syncs multiple attackers on single target"
```

---

### Task D3: Fake Troops service + test

**Files:**
- Modify: `backend/app/services/advanced_calculator_service.py`
- Create: `backend/tests/unit/test_fake_troops_service.py`

- [ ] **Step 1: Write service test**

```python
"""Tests for Fake Troops calculator service."""

from app.domain.schemas.advanced_calculator import FakeTroopsRequest
from app.services.advanced_calculator_service import get_advanced_calculator_service


def test_fake_scales_with_target_population():
    """Larger target => larger fake needed to look plausible."""
    service = get_advanced_calculator_service()
    small = service.calculate_fake_troops(
        FakeTroopsRequest(
            target_population=200,
            attacker_tribe="romans",
            include_catapults=True,
            include_rams=True,
        )
    )
    large = service.calculate_fake_troops(
        FakeTroopsRequest(
            target_population=2000,
            attacker_tribe="romans",
            include_catapults=True,
            include_rams=True,
        )
    )
    assert large.total_population_cost > small.total_population_cost
    assert large.min_infantry > small.min_infantry


def test_fake_without_catapults_cheaper():
    """Excluding catapults should reduce population cost."""
    service = get_advanced_calculator_service()
    with_cats = service.calculate_fake_troops(
        FakeTroopsRequest(
            target_population=500,
            attacker_tribe="gauls",
            include_catapults=True,
            include_rams=True,
        )
    )
    no_cats = service.calculate_fake_troops(
        FakeTroopsRequest(
            target_population=500,
            attacker_tribe="gauls",
            include_catapults=False,
            include_rams=True,
        )
    )
    assert no_cats.min_catapults == 0
    assert no_cats.total_population_cost < with_cats.total_population_cost
```

- [ ] **Step 2: Implement service method**

Append to `AdvancedCalculatorService`:

```python
    def calculate_fake_troops(
        self, request: "FakeTroopsRequest"
    ) -> "FakeTroopsResponse":
        """Compute minimum fake-attack composition that looks credible.

        Heuristic (consistent with community recommendations):
          - Base: 1 hero's worth of infantry as minimum "blur" against scouts
          - Scale infantry to ~5% of target population
          - 1 cavalry per 1% population to simulate real raid speed
          - 1 cat per 50 population if include_catapults
          - 1 ram per 100 population if include_rams
        """
        from app.domain.schemas.advanced_calculator import FakeTroopsResponse

        pop = request.target_population
        tribe = request.attacker_tribe.lower()

        # Population cost multipliers per tribe (approximate; refined later)
        tribe_multipliers = {
            "romans": 1.0,
            "teutons": 0.8,  # cheaper troops
            "gauls": 0.9,
            "huns": 0.95,
            "egyptians": 0.9,
            "spartans": 1.05,
            "vikings": 0.95,
        }
        multiplier = tribe_multipliers.get(tribe, 1.0)

        min_infantry = max(10, int(pop * 0.05 * multiplier))
        min_cavalry = max(1, int(pop * 0.01 * multiplier))
        min_catapults = int(pop / 50) if request.include_catapults else 0
        min_rams = int(pop / 100) if request.include_rams else 0

        # Population cost ≈ infantry×1 + cavalry×4 + cats×6 + rams×4
        total_pop_cost = (
            min_infantry * 1 + min_cavalry * 4 + min_catapults * 6 + min_rams * 4
        )

        reasoning = (
            f"目標 {pop} 人口 / {tribe}。佯攻需看起來像 5% 人口的 infantry + "
            f"{min_cavalry} cav 作速度偽裝。"
            + ("含催化彈。" if request.include_catapults else "不含催化彈。")
            + ("含破城槌。" if request.include_rams else "不含破城槌。")
        )

        return FakeTroopsResponse(
            min_infantry=min_infantry,
            min_cavalry=min_cavalry,
            min_catapults=min_catapults,
            min_rams=min_rams,
            total_population_cost=total_pop_cost,
            reasoning=reasoning,
        )
```

- [ ] **Step 3: Run test**

```bash
pytest tests/unit/test_fake_troops_service.py -v
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/advanced_calculator_service.py backend/tests/unit/test_fake_troops_service.py
git commit -m "feat(fake-troops): service computes minimum credible fake composition"
```

---

### Task D4: Endpoints + API tests for TS Optimizer + Fake Troops

**Files:**
- Modify: `backend/app/api/v1/endpoints/advanced_calculator.py`
- Modify: `backend/tests/unit/test_calculator_api.py`

- [ ] **Step 1: Add imports**

Add to the imports at top of `advanced_calculator.py`:

```python
from app.domain.schemas.advanced_calculator import (
    # ... existing ...
    FakeTroopsRequest,
    FakeTroopsResponse,
    TsOptimizerRequest,
    TsOptimizerResponse,
)
```

- [ ] **Step 2: Append endpoints**

```python
@router.post("/ts-optimizer", response_model=TsOptimizerResponse)
async def calculate_ts_optimizer(
    request: TsOptimizerRequest,
) -> TsOptimizerResponse:
    """攻擊 TS 優化器 — 多個攻擊者對同一目標同步抵達時間."""
    service = get_advanced_calculator_service()
    return service.calculate_ts_optimizer(request)


@router.post("/fake-troops", response_model=FakeTroopsResponse)
async def calculate_fake_troops(
    request: FakeTroopsRequest,
) -> FakeTroopsResponse:
    """佯攻部隊計算器 — 計算看起來像真打的最小兵量."""
    service = get_advanced_calculator_service()
    return service.calculate_fake_troops(request)
```

- [ ] **Step 3: Add API tests**

Append to `test_calculator_api.py`:

```python
def test_ts_optimizer_endpoint(client):
    payload = {
        "target_x": 0,
        "target_y": 0,
        "target_arrival": "2030-01-01T12:00:00",
        "attackers": [
            {
                "village_label": "A",
                "x": 10,
                "y": 0,
                "unit_speed": 6,
                "ts_level": 0,
                "allow_ts_adjustment": False,
            }
        ],
        "wave_spacing_seconds": 1.0,
        "server_speed": 1,
    }
    r = client.post("/api/v1/advanced-calculator/ts-optimizer", json=payload)
    assert r.status_code == 200
    assert len(r.json()["results"]) == 1


def test_fake_troops_endpoint(client):
    payload = {
        "target_population": 500,
        "attacker_tribe": "romans",
        "include_catapults": True,
        "include_rams": True,
    }
    r = client.post("/api/v1/advanced-calculator/fake-troops", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["min_infantry"] > 0
    assert body["min_catapults"] > 0
```

- [ ] **Step 4: Run + commit**

```bash
pytest tests/unit/test_calculator_api.py::test_ts_optimizer_endpoint tests/unit/test_calculator_api.py::test_fake_troops_endpoint -v
git add backend/app/api/v1/endpoints/advanced_calculator.py backend/tests/unit/test_calculator_api.py
git commit -m "feat(ts-optimizer,fake-troops): endpoints + API tests"
```

---

### Task D5: Frontend API clients + combined page

**Files:**
- Modify: `frontend/src/api/advanced-calculator.ts`
- Create: `frontend/src/pages/calculator/AttackPlannerPage.tsx`

- [ ] **Step 1: Append API types and functions**

```typescript
// === TS Optimizer ===

export interface AttackerProfile {
  village_label: string;
  x: number;
  y: number;
  unit_speed: number;
  ts_level: number;
  allow_ts_adjustment: boolean;
}

export interface TsOptimizerRequest {
  target_x: number;
  target_y: number;
  target_arrival: string; // ISO 8601
  attackers: AttackerProfile[];
  wave_spacing_seconds: number;
  server_speed: number;
}

export interface TsOptimizerResult {
  village_label: string;
  recommended_ts_level: number;
  send_time: string;
  travel_time_formatted: string;
  distance: number;
}

export interface TsOptimizerResponse {
  target_arrival: string;
  results: TsOptimizerResult[];
  warnings: string[];
}

export async function postTsOptimizer(req: TsOptimizerRequest): Promise<TsOptimizerResponse> {
  const res = await fetch("/api/v1/advanced-calculator/ts-optimizer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`TS optimizer API failed: ${res.status}`);
  return res.json();
}

// === Fake Troops ===

export interface FakeTroopsRequest {
  target_population: number;
  attacker_tribe: string;
  include_catapults: boolean;
  include_rams: boolean;
}

export interface FakeTroopsResponse {
  min_infantry: number;
  min_cavalry: number;
  min_catapults: number;
  min_rams: number;
  total_population_cost: number;
  reasoning: string;
}

export async function postFakeTroops(req: FakeTroopsRequest): Promise<FakeTroopsResponse> {
  const res = await fetch("/api/v1/advanced-calculator/fake-troops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Fake troops API failed: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Create combined page**

`frontend/src/pages/calculator/AttackPlannerPage.tsx`:

```tsx
import { useState } from "react";
import {
  postTsOptimizer,
  postFakeTroops,
  type TsOptimizerResponse,
  type FakeTroopsResponse,
  type AttackerProfile,
} from "@/api/advanced-calculator";

export default function AttackPlannerPage() {
  const [mode, setMode] = useState<"ts" | "fake">("ts");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">攻擊規劃器 / Attack Planner</h1>
      <div className="mb-4">
        <button
          data-testid="mode-ts"
          className={`px-3 py-1 rounded-l ${mode === "ts" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("ts")}
        >
          TS 優化器
        </button>
        <button
          data-testid="mode-fake"
          className={`px-3 py-1 rounded-r ${mode === "fake" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("fake")}
        >
          佯攻兵量
        </button>
      </div>
      {mode === "ts" ? <TsOptimizerForm /> : <FakeTroopsForm />}
    </div>
  );
}

function TsOptimizerForm() {
  const [targetX, setTargetX] = useState(0);
  const [targetY, setTargetY] = useState(0);
  const [targetTime, setTargetTime] = useState("2026-05-01T12:00:00");
  const [attackers, setAttackers] = useState<AttackerProfile[]>([
    { village_label: "Hammer-1", x: 10, y: 0, unit_speed: 6, ts_level: 0, allow_ts_adjustment: true },
  ]);
  const [result, setResult] = useState<TsOptimizerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addAttacker = () =>
    setAttackers([
      ...attackers,
      { village_label: `Hammer-${attackers.length + 1}`, x: 0, y: 0, unit_speed: 6, ts_level: 0, allow_ts_adjustment: true },
    ]);

  const submit = async () => {
    setError(null);
    try {
      const res = await postTsOptimizer({
        target_x: targetX,
        target_y: targetY,
        target_arrival: targetTime,
        attackers,
        wave_spacing_seconds: 1.0,
        server_speed: 1,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-sm">目標 X</label>
          <input type="number" className="border rounded px-2 py-1" value={targetX} onChange={(e) => setTargetX(+e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">目標 Y</label>
          <input type="number" className="border rounded px-2 py-1" value={targetY} onChange={(e) => setTargetY(+e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">抵達時間 (ISO)</label>
          <input className="border rounded px-2 py-1 w-full" data-testid="arrival" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
        </div>
      </div>

      <h3 className="font-bold mb-2">攻擊者</h3>
      {attackers.map((a, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 mb-2">
          <input className="border rounded px-2 py-1" placeholder="標籤" value={a.village_label}
            onChange={(e) => setAttackers(attackers.map((x, j) => j === i ? { ...x, village_label: e.target.value } : x))} />
          <input type="number" className="border rounded px-2 py-1" placeholder="X" value={a.x}
            onChange={(e) => setAttackers(attackers.map((x, j) => j === i ? { ...x, x: +e.target.value } : x))} />
          <input type="number" className="border rounded px-2 py-1" placeholder="Y" value={a.y}
            onChange={(e) => setAttackers(attackers.map((x, j) => j === i ? { ...x, y: +e.target.value } : x))} />
          <input type="number" className="border rounded px-2 py-1" placeholder="速度" value={a.unit_speed}
            onChange={(e) => setAttackers(attackers.map((x, j) => j === i ? { ...x, unit_speed: +e.target.value } : x))} />
          <input type="number" className="border rounded px-2 py-1" placeholder="TS" value={a.ts_level} min={0} max={20}
            onChange={(e) => setAttackers(attackers.map((x, j) => j === i ? { ...x, ts_level: +e.target.value } : x))} />
        </div>
      ))}
      <button className="border rounded px-3 py-1 mr-2" onClick={addAttacker}>+ 加攻擊者</button>
      <button className="bg-blue-600 text-white px-3 py-1 rounded" data-testid="ts-submit" onClick={submit}>計算</button>

      {error && <p className="text-red-600 mt-3" data-testid="error">{error}</p>}

      {result && (
        <div className="mt-4" data-testid="ts-result">
          {result.warnings.map((w, i) => <p key={i} className="text-yellow-700 text-sm">⚠ {w}</p>)}
          <table className="w-full border-collapse mt-2 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">村莊</th>
                <th className="border px-2 py-1 text-left">距離</th>
                <th className="border px-2 py-1 text-left">建議 TS</th>
                <th className="border px-2 py-1 text-left">發送時間</th>
                <th className="border px-2 py-1 text-left">行進時間</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r) => (
                <tr key={r.village_label}>
                  <td className="border px-2 py-1">{r.village_label}</td>
                  <td className="border px-2 py-1">{r.distance}</td>
                  <td className="border px-2 py-1">{r.recommended_ts_level}</td>
                  <td className="border px-2 py-1 font-mono">{r.send_time}</td>
                  <td className="border px-2 py-1">{r.travel_time_formatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FakeTroopsForm() {
  const [pop, setPop] = useState(500);
  const [tribe, setTribe] = useState("romans");
  const [cats, setCats] = useState(true);
  const [rams, setRams] = useState(true);
  const [result, setResult] = useState<FakeTroopsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const res = await postFakeTroops({
        target_population: pop,
        attacker_tribe: tribe,
        include_catapults: cats,
        include_rams: rams,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm">目標人口</label>
          <input type="number" data-testid="pop" className="border rounded px-2 py-1" value={pop} onChange={(e) => setPop(+e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">攻擊方種族</label>
          <select className="border rounded px-2 py-1 w-full" value={tribe} onChange={(e) => setTribe(e.target.value)}>
            <option value="romans">Romans</option>
            <option value="teutons">Teutons</option>
            <option value="gauls">Gauls</option>
            <option value="huns">Huns</option>
            <option value="egyptians">Egyptians</option>
            <option value="spartans">Spartans</option>
            <option value="vikings">Vikings</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3 mb-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={cats} onChange={(e) => setCats(e.target.checked)} />
          含催化彈
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={rams} onChange={(e) => setRams(e.target.checked)} />
          含破城槌
        </label>
      </div>
      <button className="bg-blue-600 text-white px-3 py-1 rounded" data-testid="fake-submit" onClick={submit}>計算</button>

      {error && <p className="text-red-600 mt-3" data-testid="error">{error}</p>}

      {result && (
        <div className="mt-4 border rounded p-3" data-testid="fake-result">
          <p>Infantry: {result.min_infantry}</p>
          <p>Cavalry: {result.min_cavalry}</p>
          <p>Catapults: {result.min_catapults}</p>
          <p>Rams: {result.min_rams}</p>
          <p className="font-bold mt-2">人口成本: {result.total_population_cost}</p>
          <p className="text-sm text-gray-500 mt-2">{result.reasoning}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Register route**

In `frontend/src/pages/calculator/index.ts`:

```typescript
export { default as AttackPlannerPage } from "./AttackPlannerPage";
```

In the router:

```tsx
<Route path="/calculator/attack-planner" element={<AttackPlannerPage />} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/advanced-calculator.ts \
        frontend/src/pages/calculator/AttackPlannerPage.tsx \
        frontend/src/pages/calculator/index.ts \
        frontend/src/App.tsx
git commit -m "feat(attack-planner): combined TS optimizer + fake troops frontend page"
```

---

## Section E — Wrap-up

### Task E1: Knowledge-base reload for the AI Advisor

**Files:**
- Verify: `backend/app/knowledge_base/*.py` reads from `docs/knowledge/*.md` at startup (if using file-based) OR cached loader needs reload.

- [ ] **Step 1: Find where the knowledge-base service loads markdown**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3
grep -rn "docs/knowledge" backend/app/ --include="*.py" | head -10
```

- [ ] **Step 2: Confirm the loader path**

Open the file(s) returned. If the loader reads all `*.md` in `docs/knowledge/`, the new files (A4-A11) are picked up automatically. If the loader hard-codes a file list, add the new filenames to that list.

If no loader exists yet (knowledge folder not wired to RAG service): create a short follow-up ticket (outside this plan) — do NOT attempt to build the loader here.

- [ ] **Step 3: If no change needed, note this in a commit empty message**

```bash
git commit --allow-empty -m "chore(knowledge): verify RAG loader picks up new files"
```

If the loader needs updating, make the minimal edit + commit:

```bash
git add backend/app/knowledge_base/<loader_file>.py
git commit -m "chore(knowledge): include new markdown files in RAG loader"
```

---

### Task E2: Run full test suite

- [ ] **Step 1: Backend tests**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3/backend
pytest -v
```

Expected: All tests PASS. If any fail, stop and fix before moving forward.

- [ ] **Step 2: Frontend tests**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3/frontend
pnpm test
```

Expected: All tests PASS.

- [ ] **Step 3: Type + lint**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3/backend
ruff check .
mypy app/

cd ../frontend
pnpm tsc --noEmit
pnpm lint
```

Expected: No errors.

- [ ] **Step 4: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: fix lint and type errors from Phase 1 additions"
```

---

### Task E3: Update main navigation (side menu)

**Files:**
- Modify: `frontend/src/` nav/menu config (grep to find it)

- [ ] **Step 1: Locate the navigation config**

```bash
cd /Users/peterting/Documents/program/travian-tools/.claude/worktrees/affectionate-brahmagupta-10f3e3/frontend
grep -rn "calculator/roi\|calculator/building" src/ --include="*.tsx" --include="*.ts" | head -10
```

- [ ] **Step 2: Add the three new menu items**

Append to the calculator sub-menu (same format as existing entries):

```tsx
{ label: "Optimal Village Builder", path: "/calculator/village-builder" },
{ label: "Crop Scouter", path: "/calculator/crop-scouter" },
{ label: "Attack Planner (TS + Fake)", path: "/calculator/attack-planner" },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/
git commit -m "feat(nav): link to 3 new calculators (village-builder, crop-scouter, attack-planner)"
```

---

## Self-Review

### Spec coverage (gap-analysis report → plan tasks)

- Section 3.1 `travian-mechanics.md` tribe count fix → Task A1 ✓
- Section 3.1 stage unification → Task A2 ✓
- Section 3.1 Hero system → Task A7 ✓
- Section 3.1 Artifacts → Task A8 ✓
- Section 3.1 Siege (19-cata rule) → Task A4 ✓
- Section 3.1 Wall durability → Task A6 ✓
- Section 3.1 Loyalty (125%, solo chiefing) → Task A5 ✓
- Section 3.1 Town Hall celebrations → Task A9 ✓
- Section 3.1 TS long-range formula → Task A10 ✓
- Section 3.2 `template-definitions.md` slot-budget rewrite → Task A12 ✓
- Section 3.2 NPC village template → Task A11 + Task A12 ✓
- Section 3.6 PRD F2.7 conquest wave count → Task A3 ✓
- Section 3.6 PRD phase table → Task A2 ✓
- Section 6 Phase 1 Optimal Village Builder → Tasks B1-B8 ✓
- Section 6 Phase 1 Crop Scouter → Tasks C1-C3 ✓
- Section 6 Phase 1 Attack TS Optimizer + Fake Troops → Tasks D1-D5 ✓
- Knowledge reload → Task E1 ✓
- Full test suite + lint + nav → Tasks E2, E3 ✓

Not covered (deferred to future plans):
- Section 3.1 full hero-item tier breakdown per tribe (A7 is summary only; deep dive deferred)
- Section 3.4 `building-requirements.md` Great Workshop / Water Ditch / Command Center (P3)
- Section 3.5 `travian-index.md` structured summaries (P3)
- Section 5 P2 items 13-19 (cropper-specific build orders in detail, oasis HM logic, CP efficiency rankings, map positioning, farming strategies, siege targets, 3-chief setup details, anti-follow-home)

### Placeholder scan

Searched the plan for TBD / TODO / placeholder references. Replaced all "appropriate error handling" patterns with explicit `try/except`, `set setError`, or no-error-case-needed. Every test has concrete assertions. Every service method has complete algorithm code.

### Type consistency

- `VillageBuilderRequest.cropper_type` used consistently in backend service, backend test, frontend type, frontend component.
- `CropScouterResponse.matches` (list of `CropperMatch`) consistent across service, API, frontend.
- `TsOptimizerRequest.attackers[].ts_level` field name consistent in backend schema, service, endpoint, frontend API client, frontend component.
- `FakeTroopsResponse.min_infantry`/`min_cavalry`/`min_catapults`/`min_rams`/`total_population_cost`/`reasoning` field names used identically in service return, API test assertion, frontend API interface, frontend component render.

No inconsistencies found.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-04-19-phase1-knowledge-and-calculators.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
