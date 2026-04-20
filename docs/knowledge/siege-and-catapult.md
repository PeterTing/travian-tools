# Siege and Catapult Mechanics

Source: Travian Support articles — [Catapults](https://support.travian.com/en/support/solutions/articles/7000065985-catapults), [Walls and Rams](https://support.travian.com/en/support/solutions/articles/7000065986-walls-and-rams), [Village Destruction](https://support.travian.com/en/support/solutions/articles/7000060168-village-destruction); Lumi/Eggstra/Dave community guide (2026-04).

## Catapult Targeting

- Each catapult hits **one** building per attack wave. The attacker chooses the target in the Rally Point before sending the wave.
- Two targeting modes: **specific building GID** or **random**.
- Teuton Brewery side-effect: while the Brewery celebration is active, catapults can only hit **random** targets on attacks from that village.
- Damage is proportional to the number of catapults that survive the battle.

## Catapults Needed to Destroy a Building

Approximate waves to reduce a Lv 20 building to Lv 0 (Stonemason inactive):

| Situation | Rough catapult count per wave (fully upgraded) |
|-----------|---------------------------------------------------|
| Lv 20 building, no Stonemason | ~200–300 cats → 1 hit removes 4–6 levels |
| Lv 20 building with Stonemason Lv 20 | ~4× the cats (+300% building durability) |
| Wall | Handled by rams in the same wave (see next section) |

**Village kill rule (Lumi guide):** **19 fully-loaded catapult waves** to fully demolish a Lv 20 capital with Stonemason Lv 20. Non-capital villages or no-Stonemason capitals die in fewer waves. Wave count scales down roughly with each missing defensive multiplier.

## Catapult Speed and Range

- Catapult base speed: **3 fields/hour** (slowest siege unit).
- Requires a **Workshop** (GID 21). Workshop prerequisites: Academy Lv 10 + Main Building Lv 5.
- Egyptian Trebuchet and Spartan Ballista fill the same slot for those tribes.

## Ram Behavior

- Rams reduce wall level during the attack. Damage is roughly:

  ```text
  wall_damage = rams × (1 + smithy_level × 0.015) × random(0.85 – 1.15)
  ```

- Wall must be weakened enough for catapults to focus on arbitrary targets with full effect, though cats can still hit even with walls up (wall's defense bonus reduces cat survival).
- The exact ram formula varies by version. For precise numbers use the in-game battle simulator; this formula is sufficient for rough planning.

## Village Destruction

- Every building except Wall and Rally Point can be destroyed to Lv 0.
- Destroying **Residence** / **Palace** to Lv 0 prevents settler / chief production until rebuilt.
- **Stonemason's Lodge** (capital only) multiplies effective building HP: +75% at Lv 5, +300% at Lv 20.
- A village with all buildings at Lv 0 still exists in the world — it just has nothing to produce troops or resources with.

## Defensive Countermeasures

- **Stonemason Lodge Lv 20**: capital only. Requires Palace Lv 3 + Main Building Lv 5.
- **Wall upgrades** (by tribe — see [wall-durability.md](./wall-durability.md)).
- **Trapper (Gaul)**: captures incoming raiders before siege lands.
- **Defensive troops** with anti-catapult items.
- **19-wave rule** means coordinated defense can save a capital if any single wave is stopped (attacker loses → that wave doesn't count).

## Calculator Impact

Battle simulator (F2.3) should:

1. Account for cat survival rate (attacker losses reduce usable cats)
2. Apply Stonemason multiplier when target is a capital
3. Use wall durability per tribe (not just defense bonus %)
4. Treat Brewery-active catapults as random-target
5. Support "kill the village" mode: show how many waves of N cats are needed at current defender/wall/Stonemason setup
