import { describe, expect, it } from 'vitest'
import { formatCoordinates, formatNumber, formatSignedNumber, pastedAgo, sortVillages } from '../villageDisplay'
import type { Village } from '@/types/game'

const now = new Date('2026-10-05T04:00:00Z')

const v = (name: string, population: number, crop: number | null): Village => ({
  village_id: name,
  account_id: 'acc',
  name,
  coordinate_x: 0,
  coordinate_y: 0,
  population,
  village_type: null,
  is_capital: false,
  role: null,
  crop_net_per_hour: crop,
  last_updated: null,
  created_at: '2026-10-01T00:00:00',
})

describe('villageDisplay', () => {
  it('formats numbers with thousands separators and a real minus sign', () => {
    expect(formatNumber(812)).toBe('812')
    expect(formatNumber(12400)).toBe('12,400')
    expect(formatNumber(-320)).toBe('−320')
    expect(formatNumber(-1240)).toBe('−1,240')
  })

  it('always shows the sign of a per-hour change', () => {
    expect(formatSignedNumber(1240)).toBe('+1,240')
    expect(formatSignedNumber(-320)).toBe('−320')
    expect(formatSignedNumber(0)).toBe('0')
  })

  it('writes coordinates as (x|y), like the game', () => {
    expect(formatCoordinates(10, -3)).toBe('(10|−3)')
    expect(formatCoordinates(-45, 12)).toBe('(−45|12)')
    expect(formatCoordinates(0, 0)).toBe('(0|0)')
    expect(formatCoordinates(null, 3)).toBeNull()
  })

  it('describes the paste time: 剛剛, minutes, hours, yesterday, days, never', () => {
    expect(pastedAgo(null, now)).toEqual({ key: 'neverPasted' })
    expect(pastedAgo(undefined, now)).toEqual({ key: 'neverPasted' })
    expect(pastedAgo('2026-10-05T03:59:30', now)).toEqual({ key: 'pastedJustNow' })
    expect(pastedAgo('2026-10-05T03:15:00', now)).toEqual({ key: 'pastedMinutesAgo', count: 45 })
    expect(pastedAgo('2026-10-05T03:00:00', now)).toEqual({ key: 'pastedHoursAgo', count: 1 })
    expect(pastedAgo('2026-10-05T01:59:00', now)).toEqual({ key: 'pastedHoursAgo', count: 2 })
    expect(pastedAgo('2026-10-04T03:00:00', now)).toEqual({ key: 'pastedYesterday' })
    expect(pastedAgo('2026-10-01T03:00:00', now)).toEqual({ key: 'pastedDaysAgo', count: 4 })
    // 有時區標記的照標記算
    expect(pastedAgo('2026-10-05T11:00:00+08:00', now)).toEqual({ key: 'pastedHoursAgo', count: 1 })
  })

  it('sorts by population, crop (unknown last) or name without touching the input', () => {
    const rows = [v('b', 100, -50), v('a', 300, null), v('c', 200, 900)]
    expect(sortVillages(rows, 'population').map((r) => r.name)).toEqual(['a', 'c', 'b'])
    expect(sortVillages(rows, 'crop').map((r) => r.name)).toEqual(['c', 'b', 'a'])
    expect(sortVillages(rows, 'name').map((r) => r.name)).toEqual(['a', 'b', 'c'])
    expect(rows.map((r) => r.name)).toEqual(['b', 'a', 'c'])
  })
})
