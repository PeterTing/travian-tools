import { describe, expect, it } from 'vitest'
import src from '../FieldRoiCalculator.tsx?raw'

// #34 幕僚長：金幣產量加成是乘在總產量上（官方說明頁 S129），頁首不能再寫「全部相加」
// 稽核 2026-10-10：+25% 是金幣產量加成，不是 Plus 帳號，改名
describe('Field ROI header text', () => {
  it('English: building + oasis add, the gold bonus multiplies the total', () => {
    expect(src).not.toMatch(/Plus bonuses all add together/)
    expect(src).toContain('Building and oasis bonuses add together; the gold production bonus (+25%) then multiplies the total production.')
  })
  it('Chinese says the same thing', () => {
    expect(src).not.toContain('Plus 金幣加成會一起算進去')
    expect(src).toContain('加成建築和綠洲加成相加，金幣產量加成（+25%）再乘上總產量。')
  })
  it('does not call it Plus', () => {
    expect(src).not.toMatch(/'Plus |Plus 產量/)
  })
})
