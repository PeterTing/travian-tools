import { describe, expect, it } from 'vitest'
import { accountPlayerLabel, accountWorldLabel, browserTimeZone, updatedAgo } from '../accountDisplay'
import { makeAccount } from '@/test/accountFixtures'

const now = new Date('2026-10-05T04:00:00Z')

describe('accountDisplay', () => {
  it('uses the nickname, or the fallback when it is empty', () => {
    expect(accountPlayerLabel(makeAccount(), '未命名')).toBe('PeterT')
    expect(accountPlayerLabel(makeAccount({ player_name: '  ' }), '未命名')).toBe('未命名')
  })

  it('uses the world name, or the first part of the host name', () => {
    expect(accountWorldLabel(makeAccount())).toBe('ts3')
    expect(accountWorldLabel(makeAccount({ server_name: null }))).toBe('ts3')
    expect(accountWorldLabel(makeAccount({ server_name: null, server_url: 'not a url' }))).toBe('not a url')
  })

  it('describes the last update like the wireframe', () => {
    expect(updatedAgo(null, now)).toEqual({ key: 'neverUpdated' })
    expect(updatedAgo('2026-10-05T03:59:40', now)).toEqual({ key: 'updatedJustNow' })
    // 後端沒有時區標記的時間當作 UTC
    expect(updatedAgo('2026-10-05T03:58:00', now)).toEqual({ key: 'updatedMinutesAgo', count: 2 })
    expect(updatedAgo('2026-10-05T11:58:00+08:00', now)).toEqual({ key: 'updatedMinutesAgo', count: 2 })
    expect(updatedAgo('2026-10-05T01:00:00Z', now)).toEqual({ key: 'updatedHoursAgo', count: 3 })
    expect(updatedAgo('2026-10-04T02:00:00Z', now)).toEqual({ key: 'updatedYesterday' })
    expect(updatedAgo('2026-10-02T03:00:00Z', now)).toEqual({ key: 'updatedDaysAgo', count: 3 })
    expect(updatedAgo('garbage', now)).toEqual({ key: 'neverUpdated' })
  })

  it('reads an IANA time zone from the browser', () => {
    expect(browserTimeZone()).toMatch(/^(UTC|[A-Za-z_]+\/[A-Za-z_/+-]+)$/)
  })
})
