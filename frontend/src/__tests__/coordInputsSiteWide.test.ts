import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 全站座標輸入都改用共用的 CoordPair（2026-10-10 Peter：預設 0、打不出負號）
const PAGES = [
  'pages/calculator/AttackPlannerPage.tsx',
  'pages/calculator/InterceptionCalculatorPage.tsx',
  'pages/calculator/PathCalculatorPage.tsx',
  'pages/calculator/PathSpeedTsCalculatorPage.tsx',
  'pages/calculator/SaveTroopsCalculatorPage.tsx',
  'pages/map/MapSqlPage.tsx',
  'pages/statistics/InactiveSearchPage.tsx',
  'pages/villages/VillageForm.tsx',
  'pages/paste/MovementCoordsPage.tsx',
]
const src = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf-8')

describe('coordinate inputs site-wide', () => {
  it.each(PAGES)('%s uses CoordPair and has no number-typed coordinate input or 0 default', (p) => {
    const s = src(p)
    expect(s).toContain("from '@/components/common/CoordPair'")
    // 舊寫法：座標欄位 type="number"＋Number(e.target.value)／parseInt(...) || 0
    expect(s).not.toMatch(/(?:_x|_y|X|Y)', Number\(e\.target\.value\)/)
    expect(s).not.toMatch(/set(?:Center|Start|Target)[XY]\(/)
    expect(s).not.toMatch(/parseInt\(e\.target\.value\) \|\| 0/)
  })
})
