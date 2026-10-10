"""Game worlds whose public map.sql is fetched on a fixed schedule.

Only the worlds listed here are fetched by the scheduled Cloud Run Job
(``python -m app.jobs.fetch_map_sql``). Adding a world here is a deliberate,
reviewed code change: every world means one more public GET every 4 hours and
one more full snapshot in the database whenever its map.sql changes.

Sources for each entry (checked 2026-10-11):

* ``url`` / ``name`` / ``speed``: the official Travian lobby game-world list
  (``https://lobby.legends.travian.com/api/metadata``, the list behind the
  world picker on travian.com).
* ``map_radius``: largest |x| and |y| in that world's own map.sql (both 200,
  i.e. a 401 × 401 map from -200 to 200).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TrackedWorld:
    """A game world whose public map.sql is fetched on schedule."""

    key: str
    name: str
    url: str
    speed: int
    map_radius: int

    @property
    def map_size(self) -> int:
        """Width (= height) of the map in tiles, e.g. 401 for radius 200."""
        return self.map_radius * 2 + 1


TRACKED_WORLDS: dict[str, TrackedWorld] = {
    world.key: world
    for world in (
        # Lobby name 「Asia - x1」 (type RoG, "Rise of Governors"), started 2026-09-08.
        TrackedWorld(
            key="asia-x1",
            name="Asia - x1",
            url="https://rog.x1.asia.travian.com",
            speed=1,
            map_radius=200,
        ),
        # Lobby name 「Europe 12」, started 2026-09-03.
        TrackedWorld(
            key="eu12",
            name="Europe 12",
            url="https://ts12.x1.europe.travian.com",
            speed=1,
            map_radius=200,
        ),
    )
}


class UnknownWorldError(ValueError):
    """Raised for a world key that is not in ``TRACKED_WORLDS``."""


def resolve_worlds(keys: list[str] | None) -> list[TrackedWorld]:
    """Return the tracked worlds for ``keys`` (all of them when empty).

    Duplicates are dropped; order follows ``keys``.

    Raises:
        UnknownWorldError: if a key is not a tracked world.
    """
    if not keys:
        return list(TRACKED_WORLDS.values())
    unknown = [k for k in keys if k not in TRACKED_WORLDS]
    if unknown:
        raise UnknownWorldError(
            f"Unknown world(s) {unknown}; tracked: {sorted(TRACKED_WORLDS)}"
        )
    seen: dict[str, TrackedWorld] = {}
    for k in keys:
        seen.setdefault(k, TRACKED_WORLDS[k])
    return list(seen.values())
