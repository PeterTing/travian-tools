# Wall Durability and Defense Bonus

Source: Travian Support [Walls and Rams](https://support.travian.com/en/support/solutions/articles/7000065986-walls-and-rams); community wiki wall-bonus tables; live verification via Travco village overview on 2026-04-19.

## Two Independent Axes: Bonus vs Durability

Every wall has two properties that behave differently:

- **Defense bonus**: multiplier applied to defending troops' defense values. Higher = each defender counts for more.
- **Durability**: resistance to ram damage. Higher = wall drops fewer levels per incoming ram wave.

A high-bonus wall destroyed early in an op is useless for later waves. A low-bonus wall that survives all 19 waves keeps contributing to every wave.

## Wall Comparison Table

Values for **Lv 20 wall**; lower levels scale proportionally. Bonus percentages are per-tribe wall formulas — specific numbers vary slightly between versions, prefer reading dynamic values from `game_data_service.py` when available.

| Tribe | Wall GID | Wall name | Defense bonus @ Lv 20 | Durability (relative) | Strategic profile |
|-------|----------|-----------|-----------------------|-----------------------|-------------------|
| Romans | 31 | City Wall | ≈ +81% | ★☆☆☆☆ very low | Highest bonus but falls to rams quickly |
| Gauls | 33 | Palisade | ≈ +61% | ★★★☆☆ medium | Balanced; pairs well with Trapper |
| Teutons | 32 | Earth Wall | ≈ +64% | ★★★★★ highest | Near-immune to rams; low bonus always-on |
| Egyptians | 42 | Stone Wall | ≈ +60% | ★★★★☆ high | Best overall balance |
| Huns | 43 | Makeshift Wall | ≈ +44% | ★☆☆☆☆ very low | Essentially useless for serious defense |
| Spartans | 47 | Defensive Wall | ≈ +55% | ★★★☆☆ medium | Comparable to Gaul |
| Vikings | (version-dependent) | Viking Wall | ≈ +50% | ★★★★☆ high | Similar balance to Egyptian |

## Damage from Rams (Rough Formula)

For a wave with `R` rams and smithy level `S`:

```text
damage_points  = R × (1 + S × 0.015) × random(0.85 – 1.15)
levels_dropped ≈ damage_points / wall_durability_per_level
```

where `wall_durability_per_level` is tribe-specific: higher for Teuton / Egyptian / Viking, lower for Roman / Hun.

Exact values live in Travian internal formulas; for battle-simulator output prefer the in-game simulator's result.

## Capital vs Non-Capital

Wall level and GID are the same regardless of village role. Wall GID is chosen by tribe, not village function.

## Implications for Defense Templates

- **Roman defense**: prioritize City Wall for the highest bonus, but invest in anti-ram measures (Fire Catchers, defensive cavalry with hero anti-ram item) so the wall survives.
- **Teuton defense**: accept low bonus, rely on huge Spearman volume. Wall survives → bonus keeps contributing.
- **Gaul defense**: combo Palisade with multiple Trappers. Trapper catches rams before they land; Palisade amplifies defender when attacks land.
- **Egyptian defense**: best default on 5-tribe servers. Balanced bonus + durability fits most playstyles.

## Calculator Impact

Battle simulator (F2.3) must distinguish:

1. Pre-wave wall level → applies bonus to defenders
2. Post-wave wall level → for subsequent waves in multi-wave ops
3. Tribe-specific durability → determines how fast the wall falls to rams
4. Stonemason Lodge multiplier (capital only) → multiplies wall HP as well as all building HP
