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

Each tribe has unique traits that dictate strategy:

1. **Romans**: Expensive but powerful troops. Can build a resource field AND a town building simultaneously. Excellent late-game.
2. **Gauls**: Defensive specialists. Trapper building traps attackers. Fast merchants and cavalry (Theutates Thunders are great raiders).
3. **Teutons**: Aggressive early game. Cheap, fast-to-train Clubswingers. Plunder bonus (Crannies only protect 80% instead of 100%).
4. **Huns** (Special): Fast cavalry, reliant on multi-village mobility.
5. **Egyptians** (Special): Economic powerhouse. Double resource output from Oases, incredibly strong defensive troops.

## Build Queue Rules (Bot Logistics)

- Standard accounts can queue **1** item at a time.
- Travian Plus accounts can queue **2** items (1 active, 1 pending).
- Romans can build **1 field + 1 town building** concurrently.
- If resources are insufficient, the "Upgrade" button is grayed out or replaced with "Construct with Gold" if NPC merchant is available.

---
*This knowledge base serves as a reference for bot strategy development (e.g., Even Resources, Smart Queue, Raiding, CP Management).*

**For a detailed analysis on how we structure our automated build orders, see [Build Templates Strategy](./template-strategies.md).**
