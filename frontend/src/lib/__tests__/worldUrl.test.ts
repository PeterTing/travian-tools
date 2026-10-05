import { describe, expect, it } from 'vitest'
import { describeServerUrl, formatUtcOffset, normalizeServerUrl, parseUtcOffsetDraft, UTC_OFFSET_CHOICES } from '../worldUrl'

describe('normalizeServerUrl', () => {
  it.each([
    ['https://ts3.x1.asia.travian.com/dorf1.php?newdid=1#x', 'https://ts3.x1.asia.travian.com'],
    ['  ts3.x1.asia.travian.com  ', 'https://ts3.x1.asia.travian.com'],
    ['HTTPS://TS3.X1.ASIA.TRAVIAN.COM/', 'https://ts3.x1.asia.travian.com'],
    ['http://ts1.travian.local:8080/x', 'http://ts1.travian.local:8080'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeServerUrl(raw)).toBe(expected)
  })

  it.each(['', '   ', 'invalid-url', 'not a url', 'ftp://ts3.travian.com'])('rejects %j', (raw) => {
    expect(normalizeServerUrl(raw)).toBeNull()
  })
})

describe('describeServerUrl (same cases as the backend)', () => {
  it.each([
    ['https://ts3.x1.asia.travian.com/dorf1.php', 'ts3 亞洲服', 1],
    ['ts20.x3.europe.travian.com', 'ts20 歐洲服', 3],
    ['https://ts3.x1.international.travian.com', 'ts3 國際服', 1],
    ['https://ts5.x1.arabia.travian.com', 'ts5 arabia', 1],
    ['https://ts1.travian.com', 'ts1', null],
    ['https://ts9.x7.asia.travian.com', 'ts9 亞洲服', null],
    ['https://example.com', null, null],
  ])('%s', (raw, name, speed) => {
    expect(describeServerUrl(raw)).toMatchObject({ serverName: name, serverSpeed: speed })
  })
})

describe('formatUtcOffset', () => {
  it('formats hours and minutes', () => {
    expect(formatUtcOffset(60)).toBe('UTC+1')
    expect(formatUtcOffset(-210)).toBe('UTC−3:30')
    expect(formatUtcOffset(345)).toBe('UTC+5:45')
    expect(formatUtcOffset(0)).toBe('UTC±0')
  })

  it('offers only real offsets between −12:00 and +14:00', () => {
    expect(Math.min(...UTC_OFFSET_CHOICES)).toBe(-720)
    expect(Math.max(...UTC_OFFSET_CHOICES)).toBe(840)
    expect(UTC_OFFSET_CHOICES.every((m) => m % 15 === 0)).toBe(true)
  })
})


describe('parseUtcOffsetDraft', () => {
  it('maps empty to null and numbers to minutes', () => {
    expect(parseUtcOffsetDraft('')).toBeNull()
    expect(parseUtcOffsetDraft('60')).toBe(60)
    expect(parseUtcOffsetDraft('120')).toBe(120)
  })
})
