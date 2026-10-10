import { describe, expect, it } from 'vitest'
import { DATA_UPDATE_ITEMS } from '@/lib/dataUpdate'
import { spartanDataUpdateItems } from '@/lib/dataUpdateSpartans'

// #43 的更新項目併進 #41 那張 10/11 卡（一天一張卡；排在 x3 那項後面）
describe('#43 data-update items (merged into the 10/11 card)', () => {
  it('two plain items; no 「、維京運載量」 (幕僚長 2026-10-11: 出處不明，退回待驗證)', () => {
    expect(spartanDataUpdateItems().map((it) => [it.label, it.before, it.after])).toEqual([
      ['斯巴達人兵種數值已核對（賴達投石機、五長官訓練時間除外）', undefined, undefined],
      ['斯巴達人兵種改用遊戲內正式名稱（弩炮→賴達投石機）', undefined, undefined],
    ])
  })

  it('nothing about Viking carry in the card', () => {
    expect(spartanDataUpdateItems().map((it) => it.label).join('\n')).not.toMatch(/維京|運載量/)
  })

  it('no Ballista 9900 → 9000 item; both items sit in the card as items 2 and 3, not expanded-only', () => {
    const all = spartanDataUpdateItems().map((it) => `${it.label}${it.before ?? ''}${it.after ?? ''}`).join('\n')
    expect(all).not.toContain('9900')
    expect(DATA_UPDATE_ITEMS.slice(1, 3)).toEqual(spartanDataUpdateItems())
    expect(DATA_UPDATE_ITEMS.slice(1, 3).some((it) => it.expandedOnly)).toBe(false)
  })
})
