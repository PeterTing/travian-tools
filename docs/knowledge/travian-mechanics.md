# Travian Game Mechanics Knowledge Base

*Sourced from official [Travian Support Solutions](https://support.travian.com/en/support/solutions) and game data.*

## Core Mechanics

### 1. Resource Production (dorf1)

- Villages generate **Wood**, **Clay**, **Iron**, and **Crop**.
- Base production comes from resource fields (Slots 1-18).
- Production can be boosted by:
  - Oasis bonuses (annexed via Hero's Mansion)
  - Plus Account (+25% bonus)
  - Town buildings: Sawmill (Wood), Brickyard (Clay), Iron Foundry (Iron), Grain Mill & Bakery (Crop).

### 2. Building Costs & Cost Factors

Travian uses a geometric progression to calculate the cost of a building at a given level.

- **Formula**: `Cost(Level L) = ROUND(CostBase * (CostFactor ^ (L - 1)), to nearest 5)`
- *Example*: Woodcutter (GID 1)
  - Cost Base: Wood 40, Clay 100, Iron 50, Crop 60
  - Cost Factor: 1.67
  - Level 2 Wood cost = `40 * (1.67 ^ 1) = 66.8` -> Rounded to 65 or handled via exact Travian rounding tables.

### 3. Culture Points (CP) & Expansion

- Settling new villages requires **Culture Points**.
- CP is generated daily by buildings (higher level = more CP).
- A **Residence** or **Palace** is required to build Settlers (3 needed per village). Town Hall can host celebrations to instantly generate CP.

### 4. Hero Mechanics

- The Hero is essential for early game.
- They can explore Adventures (yielding items, silver, resources, or troops).
- They provide passive resource bonuses or combat strength.

### 5. Troop Types & Roles

- **Infantry**: Basic foot soldiers (e.g., Legionnaires, Clubswingers, Phalanx).
- **Cavalry**: Fast units, great for raiding and high attack/defense (e.g., Equites Imperatoris).
- **Scouts**: Used for spying on enemy villages to see resources or troops.
- **Siege**: Rams (destroy walls) and Catapults (destroy buildings).

## Tribes Overview

Seven tribes are supported. Each has unique traits that dictate strategy.

1. **Romans**: Expensive but powerful troops. Can build one resource field AND one town building simultaneously. Excellent late-game infantry (Imperian) and cavalry (Equites Imperatoris/Caesaris). Praetorian is the best anti-infantry defender in the game. Tribe-specific: City Wall (GID 31 — highest bonus, low durability), Horse Drinking Trough (GID 41 — cuts cavalry crop consumption).
2. **Gauls**: Defensive specialists. Trapper (GID 36) captures attackers (10/level, up to 400 at Lv 20). Cranny hides 2× the resources (Gaul bonus). Fastest cavalry in the game (Theutates Thunder). Tribe-specific: Palisade (GID 33 — balanced bonus/durability).
3. **Teutons**: Aggressive early game. Cheapest and fastest troops to train (Clubswinger). Hero Cranny Dip item reduces enemy Cranny protection by 20% (NOT a passive tribe bonus — specific hero consumable). Tribe-specific: Earth Wall (GID 32 — lowest bonus, highest durability), Brewery (GID 35 — capital only, +1% attack per level).
4. **Egyptians** (special-server tribe, now on 5-tribe worlds): Economic powerhouse. Double resource output from oases. Tribe-specific: Waterworks (GID 45 — oasis bonus multiplier), Stone Wall (bonus ~Gaul Palisade, higher durability).
5. **Huns** (special-server tribe): Fast cavalry focus. Multi-village mobility. Tribe-specific: Command Center (alternative to Residence/Palace), Makeshift Wall (worst wall in game).
6. **Spartans** (special-server tribe, now on 5-tribe worlds): Strong single-unit durability. Asclepeion (hospital equivalent) recovers 60% of wounded (vs Hospital 40%).
7. **Vikings** (special-server tribe): Strong infantry plus fast boats on harbor/deep-water servers. Wall is low bonus, high durability (similar to Hun in bonus, much better in durability).

> **Server version caveat:** Classic 3-tribe and 5-tribe servers don't expose every tribe. Special scenarios (Reign of Fire, Ancient Powers, Harbor/Deep Water) add or remove tribes. Account type should always be read from sync data, not assumed.

## Game Phases (standardized)

Adopted from the Lumi/Eggstra/Dave community guide. All other docs (PRD, RAG prompts, strategy service) use these ranges.

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

## Build Queue Rules (Bot Logistics)

- Standard accounts can queue **1** item at a time.
- Travian Plus accounts can queue **2** items (1 active, 1 pending).
- Romans can build **1 field + 1 town building** concurrently.
- If resources are insufficient, the "Upgrade" button is grayed out or replaced with "Construct with Gold" if NPC merchant is available.

---
*This knowledge base serves as a reference for bot strategy development (e.g., Even Resources, Smart Queue, Raiding, CP Management).*

**For a detailed analysis on how we structure our automated build orders, see [Build Templates Strategy](./template-strategies.md).**
