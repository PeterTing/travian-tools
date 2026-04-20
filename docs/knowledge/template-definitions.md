# Village Templates — Slot-Budget-First Definitions

Each template starts from the **20-slot building budget** (excluding the 18 resource-field tiles) and the realistic storage requirements tied to the target resource-field levels. Building wish-lists are only valid if they fit.

Source: Lumi/Eggstra/Dave guide + Travian Support building prerequisite articles + this project's prior template drafts.

---

## Storage vs Field Level (critical constraint)

Upgrade cost at high resource-field levels forces specific warehouse/granary counts. The numbers below are for **capital** villages pushing fields past Lv 10.

| Target field level | Warehouses required | Granaries required | Total storage slots |
|---------------------|---------------------|---------------------|---------------------|
| Lv 17 | 5 | 1 | 6 |
| Lv 18 | 7 | 2 | 9 |
| Lv 19 | 12 | 3 | 15 |

For Lv 19 fields, 15 of the 20 slots are storage. Only 5 slots remain for Main Building + bonus buildings + Stonemason + Palace/Residence.

Non-capital villages cap fields at Lv 10 and can use Great Warehouse / Great Granary instead of 20+ normal warehouses.

---

## 1. Capital Village Template

**Purpose:** Core economic engine. Only village where fields push past Lv 10. Cannot be conquered.

### Resource fields

All 18 tiles → Lv 18 baseline, Lv 19 for high-invest accounts.

### Building budget — target: Lv 18 fields (9 storage slots)

| Building | GID | Level | Slots | Why |
|----------|-----|-------|-------|-----|
| Main Building | 15 | 20 | 1 | Build-time reduction |
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
- Hero's Mansion Lv 10 (if oasis available)

### NOT included in capital

- **Barracks, Stable, Workshop, Academy, Smithy, Hospital, Great Barracks, Great Stable** — capital should NOT be a troop-production village. Slots cost too much. Troop production happens in dedicated hammer villages.

### Optional: Lv 19 capital variant

If pushing for Lv 19 fields: need 12 warehouses + 3 granaries = 15 storage slots. Drop Stonemason OR Marketplace OR Town Hall to fit. Accept slower build progression or rely on a feeder for celebrations.

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
| Trade Office | 28 | 20 | 1 | +merchant capacity (requires Stable Lv 10) |
| Town Hall | 24 | 10 | 1 | **Great Celebrations — CP compound engine** |
| Academy | 22 | 20 | 1 | CP + Smithy prereq (if building a few defensive troops) |
| Embassy | 18 | 20 | 1 | High CP/cost |
| Grain Mill | 5 | 5 | 1 | |
| Bakery | 9 | 5 | 1 | |
| Sawmill | 6 | 5 | 1 | |
| Brickyard | 7 | 5 | 1 | |
| Iron Foundry | 8 | 5 | 1 | |
| Warehouse | 10 | 20 × 2–3 | 2–3 | Storage buffer |
| Granary | 11 | 20 × 2–3 | 2–3 | Crop buffer |
| Cranny | 23 | 10 | 1 | Hide resources from small raids |
| Residence | 25 | 10 | 1 (optional) | Only if this feeder sources chiefs later |
| **Total** | | | **17–20** | |

### NOT included

- **Barracks / Stable / Workshop** — feeders do NOT build offensive troops. Exception: a feeder next to the anvil cluster can host a small Barracks for Spearman support pushes.
- **Hero's Mansion** — only if you need oasis. Demolish after claiming (adventures spawn near HM, interfering with cap hero farming).

### Slot leftovers

- Extra Warehouse / Granary for storage buffer before trade-route runs
- Hospital Lv 20 (high passive CP, useful if village contains small defense troops)

---

## 3. Offense (Hammer) Village Template

**Purpose:** Produce huge volumes of offensive troops + siege. Used for coordinated ops (Day 45 onward).

### Resource fields

All 18 tiles → Lv 10.

### Building budget

| Building | GID | Level | Slots | Why |
|----------|-----|-------|-------|-----|
| Main Building | 15 | 20 | 1 | Build time |
| Rally Point | 16 | 20 | 1 | Tournament Square prereq; attack coordination |
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

Drop Workshop to Lv 10 (still train cats, slower) to fit both Great Barracks + Great Stable. Late-game only.

### NOT included

- Residence (Palace chosen instead — Palace gives 3 chief slots)
- Bonus resource buildings (Sawmill etc.) — feeders handle this; hammer slots too valuable
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
| Stable | 20 | 10–15 | 1 | Cavalry defense (optional to 20) |
| Academy | 22 | 20 | 1 | Smithy + Hospital prereq |
| Smithy | 13 | 20 | 1 | Defense unit upgrades |
| Hospital | 46 | 20 | 1 | 40% casualty recovery |
| Town Hall | 24 | 10 | 1 | Celebrations (CP + loyalty) |
| Trapper | 36 | 20 | 1 | **Gaul only** (captures raiders) |
| Marketplace | 17 | 20 | 1 | Receive def troops from allies |
| Trade Office | 28 | 10 | 1 | Merchant capacity |
| Residence | 25 | 10–20 | 1 | Chief-slot defense |
| Warehouse | 10 | 20 × 2 | 2 | Resource buffer |
| Granary | 11 | 20 × 2 | 2 | Crop for def troops + Hospital bills |
| **Total** | | | **17–18 (Gaul)** / **16–17 (non-Gaul)** | |

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

**Purpose:** Storage + NPC conversion + resource distribution hub. Full details in [`npc-village-template.md`](./npc-village-template.md).

### Summary

| Building | GID | Level | Slots |
|----------|-----|-------|-------|
| Main Building | 15 | 10 | 1 |
| Marketplace | 17 | 20 | 1 |
| Trade Office | 28 | 20 | 1 |
| Town Hall | 24 | 10 | 1 (optional) |
| Warehouse | 10 | 20 × 5–6 | 5–6 |
| Great Warehouse | 38 | 20 × 2–3 | 2–3 |
| Granary | 11 | 20 × 4–5 | 4–5 |
| Great Granary | 39 | 20 × 1–2 | 1–2 |
| Residence | 25 | 10 | 1 (optional) |
| **Total** | | | **16–20** |

**WH-to-GR ratio:** 1:3 (NPC converts everything INTO crop, so crop storage dominates).
