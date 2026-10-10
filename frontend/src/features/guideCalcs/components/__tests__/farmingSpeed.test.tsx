import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { farmingCalc } from '../FarmingCalculator'
import { distanceOnMap } from '@/lib/travianFormulas'

// 跟行軍時間、攔截、OP 規劃讀同一份案例（P0-22：農場收益也走共用行軍公式）
interface TravelCase { from?: [number, number]; to?: [number, number]; distance: number; unitSpeed: number; serverSpeed: number; arenaLevel: number; bootsPercent: number; seconds: number }
const { cases } = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../../../docs/knowledge/travel-speed-cases.json'), 'utf-8'),
) as { cases: TravelCase[] }

const base = { carry: 75, cost: 1090, freq: 15, loot: 400 }

describe('農場收益單程時間＝共用行軍公式（P0-22）', () => {
  it.each(cases)('距離 $distance、速度 $unitSpeed、競技場 $arenaLevel、靴子 $bootsPercent% → $seconds 秒', (c) => {
    const dist = c.from && c.to ? distanceOnMap(c.from[0], c.from[1], c.to[0], c.to[1]) : c.distance
    const r = farmingCalc({ ...base, dist, unitSpeed: c.unitSpeed, serverSpeed: c.serverSpeed, arena: c.arenaLevel, boots: c.bootsPercent })
    expect(r.owSec).toBe(c.seconds)
  })

  it('PM 指定的跨邊界案例：競技場 5、沒有靴子 → 3:45:19', () => {
    const dist = distanceOnMap(-190, 0, 180, 10)
    const r = farmingCalc({ ...base, dist, unitSpeed: 7, serverSpeed: 1, arena: 5, boots: 0 })
    expect(r.owSec).toBe(3 * 3600 + 45 * 60 + 19)
  })

  it('伺服器 2 倍速時單程減半（10 格、速度 19）', () => {
    const x1 = farmingCalc({ ...base, dist: 10, unitSpeed: 19, serverSpeed: 1, arena: 0, boots: 0 })
    const x2 = farmingCalc({ ...base, dist: 10, unitSpeed: 19, serverSpeed: 2, arena: 0, boots: 0 })
    expect(x1.owSec).toBe(Math.round((10 / 19) * 3600))
    expect(x2.owSec).toBe(Math.round((10 / 38) * 3600))
  })

  it('20 格以內競技場不影響單程', () => {
    const a0 = farmingCalc({ ...base, dist: 15, unitSpeed: 19, serverSpeed: 1, arena: 0, boots: 0 })
    const a10 = farmingCalc({ ...base, dist: 15, unitSpeed: 19, serverSpeed: 1, arena: 10, boots: 50 })
    expect(a10.owSec).toBe(a0.owSec)
  })
})
