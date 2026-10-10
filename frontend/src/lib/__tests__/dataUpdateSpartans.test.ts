import { describe, expect, it } from 'vitest'
import { DATA_UPDATE_ITEMS, SPARTAN_DATA_UPDATE_ITEMS } from '@/lib/dataUpdate'

// #43 斯巴達的更新項目另外上線（PM）：先備好，不放進目前這一批
describe('#43 Spartan data-update items (ship separately, not in the current batch)', () => {
  it('Ballista training time and official names, names read from the in-game name table', () => {
    expect(SPARTAN_DATA_UPDATE_ITEMS.map((it) => [it.label, it.before, it.after])).toEqual([
      ['斯巴達人賴達投石機訓練時間', '9900', '9000 秒'],
      ['斯巴達人兵種改用遊戲內正式名稱', '弩炮', '賴達投石機'],
    ])
    expect(SPARTAN_DATA_UPDATE_ITEMS[0]!.note).toBe('年度特別世界（ASIA x1）實測，一般世界還沒核對')
  })

  it('not in the current card', () => {
    const labels = DATA_UPDATE_ITEMS.map((it) => it.label).join('\n')
    expect(labels).not.toContain('斯巴達')
    expect(labels).not.toContain('賴達投石機')
  })
})
