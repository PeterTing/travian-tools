import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAP_RADIUS,
  coordPairValue,
  mapRadiusFromSize,
  parseCoordAxis,
  parseCoordPair,
  sanitizeCoordText,
} from '../coords'
import { parseCoordsInput } from '../ocrFields'

/**
 * ts11 遊戲裡複製下來的座標原文（一字不差，含看不見的方向字元和 U+2212 負號）：
 * /workspace/travian/review/realtest/clip/03-153811.txt 第 44 行（2026-10-10 實測剪貼簿）
 *   '\u202d(\u202d33\u202c|\u202d\u2212\u202d4\u202c\u202c)\u202c'
 */
const TS11_COPIED = '\u202d(\u202d33\u202c|\u202d\u2212\u202d4\u202c\u202c)\u202c'

describe('sanitizeCoordText', () => {
  it('strips bidi / invisible characters and turns U+2212 into "-"', () => {
    expect(sanitizeCoordText(TS11_COPIED)).toBe('(33|-4)')
    expect(sanitizeCoordText('\u2066\u200e\u2212\u200f12\u2069')).toBe('-12')
    for (const ch of ['\u202a', '\u202b', '\u202c', '\u202d', '\u202e', '\u2066', '\u2067', '\u2068', '\u2069', '\u200e', '\u200f']) {
      expect(sanitizeCoordText(`${ch}5`)).toBe('5')
    }
  })
  it('other dash variants become "-"', () => {
    for (const d of ['\u2212', '\u2013', '\u2014', '\u2010', '\ufe63', '\uff0d']) expect(sanitizeCoordText(`${d}4`)).toBe('-4')
  })
  it('full-width digits and bar', () => {
    expect(sanitizeCoordText('３３｜－４')).toBe('33|-4')
  })
})

describe('parseCoordAxis', () => {
  it('accepts "-" (negative numbers)', () => {
    expect(parseCoordAxis('-4')).toBe(-4)
    expect(parseCoordAxis('\u22124')).toBe(-4)
    expect(parseCoordAxis('-0')).toBe(0)
    expect(Object.is(parseCoordAxis('-0'), -0)).toBe(false)
  })
  it('empty is null, never 0', () => {
    expect(parseCoordAxis('')).toBeNull()
    expect(parseCoordAxis('   ')).toBeNull()
    expect(parseCoordAxis('-')).toBeNull()
  })
  it('range bounds ±radius (default 200)', () => {
    expect(DEFAULT_MAP_RADIUS).toBe(200)
    expect(parseCoordAxis('-200')).toBe(-200)
    expect(parseCoordAxis('200')).toBe(200)
    expect(parseCoordAxis('-201')).toBeNull()
    expect(parseCoordAxis('201')).toBeNull()
    expect(parseCoordAxis('100', 50)).toBeNull()
    expect(parseCoordAxis('-50', 50)).toBe(-50)
  })
  it('non-numeric / decimals rejected', () => {
    for (const t of ['abc', '1a', '1.5', '1e2', '--4', '4-']) expect(parseCoordAxis(t), t).toBeNull()
  })
})

describe('parseCoordPair', () => {
  it('real ts11 copied string', () => {
    expect(parseCoordPair(TS11_COPIED)).toEqual({ x: 33, y: -4 })
  })
  it('"(33|-4)", "33|-4", with spaces', () => {
    expect(parseCoordPair('(33|-4)')).toEqual({ x: 33, y: -4 })
    expect(parseCoordPair('33|-4')).toEqual({ x: 33, y: -4 })
    expect(parseCoordPair(' ( 33 | −4 ) ')).toEqual({ x: 33, y: -4 })
    expect(parseCoordPair('-12, 7')).toEqual({ x: -12, y: 7 })
  })
  it('a single number is not a pair', () => {
    expect(parseCoordPair('-4')).toBeNull()
    expect(parseCoordPair('33|')).toBeNull()
  })
})

describe('coordPairValue / mapRadiusFromSize', () => {
  it('both axes must be valid', () => {
    expect(coordPairValue({ x: '33', y: '-4' })).toEqual({ x: 33, y: -4 })
    expect(coordPairValue({ x: '', y: '' })).toBeNull()
    expect(coordPairValue({ x: '33', y: '' })).toBeNull()
    expect(coordPairValue({ x: '33', y: '-201' })).toBeNull()
  })
  it('map size → radius; falls back to ±200 without data', () => {
    expect(mapRadiusFromSize(401)).toBe(200)
    expect(mapRadiusFromSize(801)).toBe(400)
    expect(mapRadiusFromSize(undefined)).toBe(200)
    expect(mapRadiusFromSize(null)).toBe(200)
    expect(mapRadiusFromSize(NaN)).toBe(200)
  })
})

describe('OCR manual coords input shares the sanitizer', () => {
  it('parses the ts11 copied string', () => {
    expect(parseCoordsInput(TS11_COPIED)).toEqual({ x: 33, y: -4 })
  })
})
