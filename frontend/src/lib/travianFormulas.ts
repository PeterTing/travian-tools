/**
 * Travian: Legends formulas shared with the frontend.
 * Must stay in sync with backend/app/utils/travian_formulas.py (S71).
 */

/** Tournament Square applies only beyond this distance (fields). Source: S71. */
export const TS_THRESHOLD_FIELDS = 20

/** Per-level speed bonus beyond the threshold. Source: S71. */
export const TS_BONUS_PER_LEVEL = 0.2

/** Speed multiplier for the portion of a trip beyond 20 fields. */
export function tournamentSquareBonusFactor(level: number): number {
  return 1 + Math.max(0, level) * TS_BONUS_PER_LEVEL
}

/**
 * Travel time in seconds, rounded to nearest second (game behaviour).
 * Official help page S71: the first 20 fields at normal speed; beyond that
 * speed × (1 + 0.20 × TS_level + boots%). Tournament Square and hero boots are
 * ADDED together (not multiplied) and only apply beyond 20 fields (P0-20).
 * heroBonusPercent = hero boots bonus (%).
 */
export function calculateTravelSeconds(opts: {
  distance: number
  unitSpeed: number
  serverSpeed?: number
  tournamentSquareLevel?: number
  heroBonusPercent?: number
  artifactMultiplier?: number
}): number {
  const {
    distance,
    unitSpeed,
    serverSpeed = 1,
    tournamentSquareLevel = 0,
    heroBonusPercent = 0,
    artifactMultiplier = 1,
  } = opts

  if (distance <= 0 || unitSpeed <= 0) return 0

  let speed = unitSpeed * (serverSpeed > 0 ? serverSpeed : 1)
  speed *= artifactMultiplier > 0 ? artifactMultiplier : 1

  const tsLevel = Math.max(0, tournamentSquareLevel)
  const boots = Math.max(0, heroBonusPercent) / 100
  let hours: number
  if ((tsLevel > 0 || boots > 0) && distance > TS_THRESHOLD_FIELDS) {
    const near = TS_THRESHOLD_FIELDS / speed
    // 競技場和靴子相加，只算超過 20 格的路段
    const bonus = tournamentSquareBonusFactor(tsLevel) + boots
    const far = (distance - TS_THRESHOLD_FIELDS) / (speed * bonus)
    hours = near + far
  } else {
    hours = distance / speed
  }

  return Math.max(1, Math.round(hours * 3600))
}

/** Euclidean distance with wrap-around on a square torus map (default 401). */
export function distanceOnMap(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  mapSize = 401,
): number {
  let dx = Math.abs(x2 - x1)
  let dy = Math.abs(y2 - y1)
  const half = mapSize / 2
  if (dx > half) dx = mapSize - dx
  if (dy > half) dy = mapSize - dy
  return Math.sqrt(dx * dx + dy * dy)
}

/** Format seconds as `Xh Ym Zs` matching backend `_format_travel_time`. */
export function formatTravelTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  return `${hours}h ${minutes}m ${seconds}s`
}
