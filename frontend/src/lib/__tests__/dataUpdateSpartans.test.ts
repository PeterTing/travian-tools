import { describe, expect, it } from 'vitest'
import { DATA_UPDATE_ITEMS } from '@/lib/dataUpdate'
import { spartanDataUpdateItems } from '@/lib/dataUpdateSpartans'

// #43 的更新項目另外上線（PM）：先備好，不放進目前這一批
describe('#43 data-update items (ship separately, not in the current batch)', () => {
  it('two plain items; Viking carry is appended to (a) because it is ✓ (two independent sources agree)', () => {
    expect(spartanDataUpdateItems().map((it) => [it.label, it.before, it.after])).toEqual([
      ['斯巴達人兵種數值已核對（賴達投石機、五長官訓練時間除外）、維京運載量', undefined, undefined],
      ['斯巴達人兵種改用遊戲內正式名稱（弩炮→賴達投石機）', undefined, undefined],
    ])
  })

  it('if Viking carry went back to 待驗證, (a) drops 「、維京運載量」', () => {
    expect(spartanDataUpdateItems(true)[0]!.label).toBe('斯巴達人兵種數值已核對（賴達投石機、五長官訓練時間除外）')
  })

  it('no Ballista 9900 → 9000 item, and nothing from #43 in the current card', () => {
    const all = spartanDataUpdateItems().map((it) => `${it.label}${it.before ?? ''}${it.after ?? ''}`).join('\n')
    expect(all).not.toContain('9900')
    const labels = DATA_UPDATE_ITEMS.map((it) => it.label).join('\n')
    expect(labels).not.toContain('斯巴達')
    expect(labels).not.toContain('賴達投石機')
  })
})
