
import { describe, expect, it } from 'vitest'
import {
  formatCaptureShort,
  formatVillageLabel,
  pageNeedsVillageSelector,
  parseCaptureShort,
  pickDefaultVillageId,
} from '../pasteFormat'

describe('pageNeedsVillageSelector', () => {
  it('shows for rally and village center only', () => {
    expect(pageNeedsVillageSelector('rally_point')).toBe(true)
    expect(pageNeedsVillageSelector('village_center')).toBe(true)
    expect(pageNeedsVillageSelector('village_overview')).toBe(false)
    expect(pageNeedsVillageSelector('reports')).toBe(false)
  })
})

describe('pickDefaultVillageId', () => {
  const villages = [
    {
      village_id: 'v2',
      name: '二村',
      coordinate_x: 12,
      coordinate_y: -1,
      is_capital: false,
    },
    {
      village_id: 'v1',
      name: '主村',
      coordinate_x: 10,
      coordinate_y: -3,
      is_capital: true,
    },
  ]

  it('prefers capital when nothing else matches', () => {
    expect(pickDefaultVillageId(villages, {})).toBe('v1')
  })

  it('uses village_id from parse data', () => {
    expect(pickDefaultVillageId(villages, { village_id: 'v2' })).toBe('v2')
  })

  it('matches by name then coords', () => {
    expect(pickDefaultVillageId(villages, { village_name: '二村' })).toBe('v2')
    expect(
      pickDefaultVillageId(villages, { coordinate_x: 10, coordinate_y: -3 }),
    ).toBe('v1')
  })
})

describe('capture short format', () => {
  it('formats 24h MM/DD HH:MM', () => {
    const d = new Date(2026, 9, 5, 21, 52, 0)
    expect(formatCaptureShort(d)).toBe('10/05 21:52')
  })

  it('parses back keeping year', () => {
    const base = new Date(2026, 0, 1, 0, 0, 0)
    const parsed = parseCaptureShort('10/04 21:52', base)
    expect(parsed).not.toBeNull()
    expect(formatCaptureShort(parsed!)).toBe('10/04 21:52')
    expect(parsed!.getFullYear()).toBe(2026)
  })

  it('rejects invalid', () => {
    expect(parseCaptureShort('99/99 99:99', new Date())).toBeNull()
  })
})

describe('formatVillageLabel', () => {
  it('uses minus sign for negative y', () => {
    expect(
      formatVillageLabel({ name: '主村', coordinate_x: 10, coordinate_y: -3 }),
    ).toBe('主村 (10|−3)')
  })
})
