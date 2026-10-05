import { describe, expect, it } from 'vitest'

/** 全站統一用「部族」，不用「種族」（設計決定，2026-10-05） */
const SOURCES = import.meta.glob<string>(['../**/*.{ts,tsx,json}', '!../**/__tests__/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('terminology', () => {
  it('scans the source tree', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(20)
  })

  it('uses 部族, never 種族', () => {
    const offenders = Object.entries(SOURCES)
      .filter(([, text]) => text.includes('種族'))
      .map(([file]) => file)
    expect(offenders).toEqual([])
  })
})
