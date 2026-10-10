import { describe, expect, it } from 'vitest'
import { interceptLink } from '../IncomingListPage'

// 來襲列表 →「攔截」：帶到達時間（伺服器時間）、攻方座標、被攻擊村莊座標（稽核 2026-10-10）
describe('interceptLink', () => {
  it('server time + both coordinates', () => {
    // 2026-10-11 13:05:00 UTC，伺服器 UTC+1 → 14:05:00
    const url = interceptLink({ arrival_at: '2026-10-11T13:05:00Z', coordinate_x: -4, coordinate_y: 12 }, { coordinate_x: 33, coordinate_y: -4 }, 60)
    const q = new URL(url, 'https://x').searchParams
    expect(url.startsWith('/calculator/interception?')).toBe(true)
    expect(q.get('arrival')).toBe('14:05:00')
    expect([q.get('ax'), q.get('ay'), q.get('dx'), q.get('dy')]).toEqual(['-4', '12', '33', '-4'])
  })

  it('no world offset yet → no arrival (avoid the wrong time zone); unknown attacker → no ax/ay', () => {
    const url = interceptLink({ arrival_at: '2026-10-11T13:05:00Z', coordinate_x: null, coordinate_y: null }, undefined, null)
    expect(url).toBe('/calculator/interception')
  })
})
