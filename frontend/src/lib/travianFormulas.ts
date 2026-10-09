/**
 * Travian: Legends formulas shared with the frontend.
 * Must stay in sync with backend/app/utils/travian_formulas.py (S71).
 * 行軍時間一律用 travelHours／calculateTravelSeconds（P0-21）；一致性案例 docs/knowledge/travel-speed-cases.json。
 */

/** Tournament Square applies only beyond this distance (fields). Source: S71. */
export const TS_THRESHOLD_FIELDS = 20

/** Per-level speed bonus beyond the threshold. Source: S71. */
export const TS_BONUS_PER_LEVEL = 0.2

/** Speed multiplier for the portion of a trip beyond 20 fields. */
export function tournamentSquareBonusFactor(level: number): number {
  return 1 + Math.max(0, level) * TS_BONUS_PER_LEVEL
}

/** Speed multiplier beyond 20 fields: 1 + 0.20 × TS_level + boots% (S71, added — not multiplied). */
export function farSpeedFactor(tournamentSquareLevel = 0, heroBonusPercent = 0): number {
  return tournamentSquareBonusFactor(tournamentSquareLevel) + Math.max(0, heroBonusPercent) / 100
}

export interface TravelOpts {
  distance: number
  unitSpeed: number
  serverSpeed?: number
  tournamentSquareLevel?: number
  /** hero boots bonus (%) */
  heroBonusPercent?: number
  artifactMultiplier?: number
}

function effectiveSpeed(unitSpeed: number, serverSpeed = 1, artifactMultiplier = 1): number {
  return unitSpeed * (serverSpeed > 0 ? serverSpeed : 1) * (artifactMultiplier > 0 ? artifactMultiplier : 1)
}

/**
 * 行軍時間（小時，不四捨五入）——全站唯一的行軍速度公式（P0-21）。
 * Official help page S71: the first 20 fields at normal speed; beyond that
 * speed × (1 + 0.20 × TS_level + boots%). Tournament Square and hero boots are
 * ADDED together (not multiplied) and only apply beyond 20 fields (P0-20).
 * Mirror: backend/app/utils/travian_formulas.py `travel_hours`.
 */
export function travelHours(opts: TravelOpts): number {
  const { distance, unitSpeed, serverSpeed = 1, tournamentSquareLevel = 0, heroBonusPercent = 0, artifactMultiplier = 1 } = opts
  if (distance <= 0 || unitSpeed <= 0) return 0
  const speed = effectiveSpeed(unitSpeed, serverSpeed, artifactMultiplier)
  const factor = farSpeedFactor(tournamentSquareLevel, heroBonusPercent)
  if (factor > 1 && distance > TS_THRESHOLD_FIELDS) {
    // 競技場和靴子相加，只算超過 20 格的路段
    return TS_THRESHOLD_FIELDS / speed + (distance - TS_THRESHOLD_FIELDS) / (speed * factor)
  }
  return distance / speed
}

/** Travel time in seconds, rounded to nearest second (game behaviour). Uses `travelHours`. */
export function calculateTravelSeconds(opts: TravelOpts): number {
  if (opts.distance <= 0 || opts.unitSpeed <= 0) return 0
  return Math.max(1, Math.round(travelHours(opts) * 3600))
}

/** `travelHours` 的反函數：走 hours 小時能走多遠（躲兵用，P0-21）。 */
export function distanceForTravelHours(opts: {
  hours: number
  unitSpeed: number
  serverSpeed?: number
  tournamentSquareLevel?: number
  heroBonusPercent?: number
}): number {
  const { hours, unitSpeed, serverSpeed = 1, tournamentSquareLevel = 0, heroBonusPercent = 0 } = opts
  if (hours <= 0 || unitSpeed <= 0) return 0
  const speed = effectiveSpeed(unitSpeed, serverSpeed)
  const factor = farSpeedFactor(tournamentSquareLevel, heroBonusPercent)
  const toThreshold = TS_THRESHOLD_FIELDS / speed
  if (factor > 1 && hours > toThreshold) return TS_THRESHOLD_FIELDS + (hours - toThreshold) * speed * factor
  return hours * speed
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
