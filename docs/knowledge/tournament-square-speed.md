# Tournament Square — Long-range Troop Speed

Source: Travian Support [Troops Speed Increase & Tournament Square](https://support.travian.com/en/support/solutions/articles/7000068300-troops-speed-increase-tournament-square).

## What Tournament Square Does

- Building: **Tournament Square** (GID 14).
- Prerequisites: **Rally Point Lv 15**.
- Max level: 20.
- Speeds up troops traveling **beyond a fixed distance threshold**. Does not affect short-range travel.

## Speed Formula

```text
threshold          = 20 fields   (S71; Legends — NOT the old 30)

if distance <= threshold:
    travel_time = distance / unit_speed
else:
    threshold_time = threshold / unit_speed
    beyond         = distance - threshold
    bonus_factor   = 1 + TS_level × 0.20
    beyond_time    = beyond / (unit_speed × bonus_factor)
    travel_time    = threshold_time + beyond_time
```

Where:

- `unit_speed` is the tribe/unit base speed in fields/hour (e.g. Theutates Thunder = 19 fields/h, Catapult = 3 fields/h).
- `TS_level` is 0 to 20.
- `bonus_factor` at Lv 20 = 1 + 20×0.20 = **5.0×**.

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

## Common Use Cases

1. **Ops attacks > 20 fields**: TS is mandatory for cross-quadrant hammers.
2. **Defense dodging** (hero follow-home prevention): change TS level between send and return so enemy can't precisely time a ghost wave back on your hammer.
3. **Fake waves**: TS accelerates fakes too, reducing the defender's window to identify real vs fake.

## Calculator Impact

- **Path Calculator** (existing `advanced_calculator.calculate_path`) already supports TS level — verify formula matches the above.
- **Attack TS Optimizer** (new Task D in the Phase 1 plan) solves the inverse problem: given all attackers' coordinates + TS levels + a target arrival time, compute each attacker's send time so all waves land within a 1–2 second window.
- **Interception Calculator** and **Path-Speed-TS Reverse Calculator** need the same formula for consistency.
