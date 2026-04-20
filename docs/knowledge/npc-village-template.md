# NPC Village Template

Source: Lumi/Eggstra/Dave guide ("NPC villages" section).

## Purpose

An NPC village is a dedicated **storage + resource conversion hub**. Its role:

- Hold resources incoming from feeders
- NPC-convert surplus resource types into crop (or vice versa) via the **NPC Merchant** (3 gold per conversion)
- Distribute converted resources to hammers and anvils

Without an NPC village, a player juggles warehouse / granary overflow across every producing village. With one, all surplus funnels through a single conversion point.

## When to Build

- **Earliest:** Day 20–30, after the first cap + 2 feeders start producing surplus.
- **Latest acceptable:** Day 60. After that, account scaling suffers without a conversion hub.
- **Settled from:** usually a feeder or village 4 — not the capital, not the hammer.

## Slot Budget (20 building slots total; 18 resource tiles separate)

| Building | GID | Level | Slots | Purpose |
|----------|-----|-------|-------|---------|
| Main Building | 15 | 10 | 1 | Build speed + Town Hall prereq if running celebrations |
| Marketplace | 17 | 20 | 1 | Sending / receiving merchants |
| Trade Office | 28 | 20 | 1 | +5% merchant capacity per level (2.5× at Lv 20) |
| Town Hall | 24 | 10 | 1 (optional) | CP via celebrations |
| Warehouse | 10 | 20 | 5–6 | Bulk storage |
| Great Warehouse | 38 | 20 | 2–3 | Non-capital only; massive storage |
| Granary | 11 | 20 | 4–5 | Crop storage (NPC usually converts into crop) |
| Great Granary | 39 | 20 | 1–2 | Non-capital only |
| Residence | 25 | 10 | 1 (optional) | Chief-slot defense for the NPC village |
| Cranny | 23 | 10 | 1 (optional) | Early-game protection |

**Ratio:** roughly 1 Warehouse slot per 3 Granary slots (Lumi 1:3) — because NPC converts everything into crop, so crop storage dominates.

## Resource Fields

NPC village resource fields are **not** a priority. Build them to Lv 4–5 only enough to support the hero claiming an oasis. **Do not** upgrade past Lv 10.

## Positioning

- Adjacent to capital and hammer villages (within 1–5 fields).
- Merchant round-trip should be < 30 minutes.
- Never place NPC far from the main cluster (negates its purpose).

## Troops

NPC village holds no offensive troops. For defense, station a small anvil escort (1,000–2,000 Phalanx / Praetorian equivalent) to deter small raids.

## Synergy With Other Templates

- **Capital → NPC** — capital sends surplus wood / clay / iron; NPC converts to crop.
- **Feeder → NPC** — feeders send all 4 resources; NPC absorbs overflow.
- **NPC → Hammer** — every 15–30 minutes, NPC sends crop to hammer to feed troops during ops.
- **NPC → Anvil** — NPC pushes crop to anvils during defense calls.

## Build-out Cost Estimate

A fully-built Lv 20 NPC village takes 6–9 days with Gold + NPC transfusion from capital. Without gold, 14–21 days.

## Calculator Impact

- **NPC Calculator** (existing `advanced_calculator.calculate_npc`) already handles the resource conversion math.
- Future **Transport Planner** (Phase 2 L2 Supply) should recognize villages configured with `VillageTransportRole.HUB` as NPC villages and prioritize them as conversion targets.
