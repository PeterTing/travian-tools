# Tournament Square — Long-range Troop Speed

Source: Travian Support [Troops Speed Increase & Tournament Square](https://support.travian.com/en/support/solutions/articles/7000068300-troops-speed-increase-tournament-square).

## What Tournament Square Does

- Building: **Tournament Square** (GID 14).
- Prerequisites: **Rally Point Lv 15**.
- Max level: 20.
- Speeds up troops traveling **beyond a fixed distance threshold**. Does not affect short-range travel.
- **Hero boots** (speed bonus %) work the same way: only the stretch beyond 20 fields, and the boots % is **added** to the Tournament Square bonus (not multiplied). Source: same official help page (S71).

## Speed Formula

```text
threshold          = 20 fields   (S71; Legends — NOT the old 30)

bonus_factor       = 1 + TS_level × 0.20 + boots% / 100     (added, not multiplied)

if distance <= threshold or bonus_factor == 1:
    travel_time = distance / unit_speed
else:
    threshold_time = threshold / unit_speed
    beyond         = distance - threshold
    beyond_time    = beyond / (unit_speed × bonus_factor)
    travel_time    = threshold_time + beyond_time
```

`unit_speed` here already includes server speed (and artifacts on the march time page).
Travel time is rounded to the nearest second.

Where:

- `unit_speed` is the tribe/unit base speed in fields/hour (e.g. Theutates Thunder = 19 fields/h, Catapult = 3 fields/h).
- `TS_level` is 0 to 20.
- `boots%` is the hero boots speed bonus (0 if no boots).
- `bonus_factor` at Lv 20 = 1 + 20×0.20 = **5.0×**; with +25% boots = **5.25×** (not 5 × 1.25 = 6.25×).

## Speed Boost by Level

| TS Level | Beyond-20 speed multiplier |
|----------|----------------------------|
| 0 | 1.0× (no TS) |
| 5 | 2.0× |
| 10 | 3.0× |
| 15 | 4.0× |
| 20 | 5.0× |

## Worked Example

A Theutates Thunder (19 fields/h base) traveling **100 fields**:

- No TS: 100 / 19 ≈ 5.26 h
- TS Lv 20: threshold = 20/19 ≈ 1.05 h; beyond = 80 / (19 × 5) ≈ 0.84 h; total ≈ **1.89 h**

Same trip with TS Lv 10 + boots 25%: bonus_factor = 1 + 2 + 0.25 = 3.25; beyond = 80 / (19 × 3.25) ≈ 1.30 h; total ≈ **2.35 h**.

## Common Use Cases

1. **Ops attacks > 20 fields**: TS is mandatory for cross-quadrant hammers.
2. **Defense dodging** (hero follow-home prevention): change TS level between send and return so enemy can't precisely time a ghost wave back on your hammer.
3. **Fake waves**: TS accelerates fakes too, reducing the defender's window to identify real vs fake.

## Calculator Impact（P0-21：一份公式）

Every calculator uses the same function — backend `app/utils/travian_formulas.py`
(`travel_hours`, `calculate_travel_seconds`, inverse `distance_for_travel_hours`) and its
frontend mirror `frontend/src/lib/travianFormulas.ts` (`travelHours`, `calculateTravelSeconds`,
`distanceForTravelHours`):

- **March time** (行軍時間, computed in the browser): arena + boots.
- **Interception** (攔截): the interceptor (arena + boots) **and** the attacker's return trip (attacker arena + boots).
- **Attack TS Optimizer** (OP 規劃): arena + boots per attacker.
- **Reverse TS** (反推 TS): tries TS 0–20 with the boots % you enter.
- **Save troops** (躲兵): inverse — how far you can go in half the offline time.

Consistency cases shared by the frontend and backend tests: `docs/knowledge/travel-speed-cases.json`
(same distance / speed / arena / boots → every tool returns the same seconds).

Not yet modelled: pennants/standards (官方說明頁: multiply the whole trip) — TICKETS P1-24.

Every result that uses arena or boots shows the 「待驗證」 chip (`arenaSpeed` / `heroBootsSpeed` / `arenaBootsSpeed`):
not yet checked in-game on ts11.
