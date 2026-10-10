// 建築、部族、兵種名稱一律是 ts11 遊戲內名稱（#33）：前端每個顯示名稱的地方都讀同一張表
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType } from 'react'
import i18n from '@/i18n/i18n'
import zh from '@/i18n/locales/zh-TW.json'
import gen from '@/data/gameData.gen.json'
import speeds from '@/data/unitSpeeds.gen.json'
import type { AutoFillValue } from '@/components/autofill/AutoFillContext'
import { INGAME_BUILDINGS, INGAME_TRIBES, INGAME_UNITS, ingameBuildingNameByGid, ingameUnitNameByGameId } from '@/lib/ingameNames'
import { TRIBES } from '@/features/guideCalcs/data/tribes'

vi.mock('@/components/autofill/AutoFillContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/autofill/AutoFillContext')>()
  const value: AutoFillValue = {
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null, birthTribe: null, multiTribe: false,
    offsetHours: null, overrides: {}, setOverride: () => undefined, clearOverride: () => undefined,
    selectVillage: () => undefined,
  }
  return { ...mod, useAutoFill: () => value }
})

const INGAME = new Set<string>([
  ...Object.values(INGAME_BUILDINGS).map(b => b.zh),
  ...Object.values(INGAME_UNITS).map(u => u.zh),
  ...Object.values(INGAME_TRIBES).map(t => t.zh),
])
const ALIASES = [...new Set([
  ...Object.values(INGAME_BUILDINGS).flatMap(b => b.aliases),
  ...Object.values(INGAME_UNITS).flatMap(u => u.aliases),
  '條頓',
])].filter(a => !INGAME.has(a))

/**
 * 由左往右找名稱，同一個位置先比長的：「長矛兵」算舊名（不會先被「矛兵」遮掉），
 * 「大倉庫」是遊戲內名稱，不會被當成「倉庫」
 */
const NAME_RE = new RegExp(
  [...INGAME, ...ALIASES].sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'g',
)
function oldNamesIn(text: string): string[] {
  return [...new Set([...text.matchAll(NAME_RE)].map(m => m[0]).filter(n => !INGAME.has(n)))]
}

describe('遊戲內名稱表', () => {
  it('old-name scan matches longer names first (長矛兵／英雄宅邸／隱藏倉庫 are caught, 大倉庫 is not 倉庫)', () => {
    expect(oldNamesIn('優先訓練長矛兵')).toEqual(['長矛兵'])
    expect(oldNamesIn('英雄宅邸、隱藏倉庫')).toEqual(['英雄宅邸', '隱藏倉庫'])
    expect(oldNamesIn('矛兵、英雄宅、山洞、大倉庫、倉庫')).toEqual([])
  })

  it('table = ts11 manual: gid 13 盔甲廠, 7 鋼鐵鑄造廠, 2 泥坑, 4 農場, 41 放牧水槽; no gid 12', () => {
    expect(ingameBuildingNameByGid(13)).toBe('盔甲廠')
    expect(ingameBuildingNameByGid(7)).toBe('鋼鐵鑄造廠')
    expect(ingameBuildingNameByGid(2)).toBe('泥坑')
    expect(ingameBuildingNameByGid(4)).toBe('農場')
    expect(ingameBuildingNameByGid(41)).toBe('放牧水槽')
    expect(ingameBuildingNameByGid(12)).toBeUndefined()
    expect(INGAME_TRIBES.teutons?.zh).toBe('日耳曼人')
    expect(ingameUnitNameByGameId(64)).toBe('草原騎士')
    expect(ingameUnitNameByGameId(5)).toBe('帝國騎士')
    expect(ingameUnitNameByGameId(10)).toBe('開拓者')
    expect(ingameUnitNameByGameId(17)).toBe('破城槌')
  })

  it('i18n zh-TW building_N (gid) and field names come from the table', () => {
    const bn = zh.buildingNames as Record<string, string>
    for (const b of Object.values(INGAME_BUILDINGS)) expect(bn[`building_${b.gid}`], `gid ${b.gid}`).toBe(b.zh)
    expect([bn.wood_field, bn.clay_field, bn.iron_field, bn.crop_field]).toEqual(['伐木場', '泥坑', '鐵礦場', '農場'])
  })

  it('every on-screen building name in the generated data is an in-game name', () => {
    const names = gen.names as Record<string, string[]>
    for (const [id, [nameZh]] of Object.entries(names)) {
      expect(INGAME_BUILDINGS[id]?.zh, id).toBe(nameZh)
    }
  })

  it('tribe names: i18n, guide data and the table agree', () => {
    for (const [id, t] of Object.entries(INGAME_TRIBES)) {
      expect((zh.tribes as Record<string, string>)[id], id).toBe(t.zh)
      expect(TRIBES[id as keyof typeof TRIBES].name.zh, id).toBe(t.zh)
    }
  })

  it('each unit has exactly one name site-wide (table, i18n troop_N, speed table, guide data)', () => {
    const tn = zh.troopNames as Record<string, string>
    let guideHits = 0
    for (const [troopId, u] of Object.entries(INGAME_UNITS)) {
      const names = new Set([u.zh])
      if (u.game_id != null) names.add(tn[`troop_${u.game_id}`] ?? '(missing)')
      const row = (speeds.tribes as Record<string, { troop_id: string; stats: { name_zh: string } | null }[]>)[u.tribe]
        ?.find(r => r.troop_id === troopId)
      if (row?.stats) names.add(row.stats.name_zh)
      const g = TRIBES[u.tribe as keyof typeof TRIBES]?.units.find(x => x.id === u.fe_id)
      if (g) { names.add(g.name.zh); guideHits++ }
      expect([...names], troopId).toEqual([u.zh])
    }
    // 七族 70 種兵都在表裡（斯巴達、維京也是，#34），計算器資料每一種都找得到
    expect(Object.keys(INGAME_UNITS)).toHaveLength(70)
    expect(guideHits).toBe(70)
  })

  it('Spartan / Viking units: calculator names = troops page names (PM rule: S139/S187 have no zh page, keep the troops-page name)', () => {
    const pairs: [string, string, string][] = [
      ['vikings', 'thrall', '奴僕'], ['spartans', 'hoplite', '重裝步兵'],
      ['spartans', 'elpida', '希望騎士'], ['vikings', 'huskarlRider', '侍衛騎士'],
    ]
    for (const [tribe, id, zhName] of pairs) {
      expect(TRIBES[tribe as keyof typeof TRIBES].units.find(u => u.id === id)?.name.zh, id).toBe(zhName)
    }
  })

  it('Spartan / Viking: 中文暫譯（官方英文名）, Chinese part pending; ts11 units are not pending (P0-23 follow-up)', () => {
    const pending = Object.entries(INGAME_UNITS).filter(([, u]) => u.zh_pending)
    expect(pending).toHaveLength(20)
    for (const [id, u] of Object.entries(INGAME_UNITS)) {
      expect(u.zh_pending, id).toBe(u.tribe === 'spartans' || u.tribe === 'vikings')
      expect(u.display_zh, id).toBe(u.en ? `${u.zh}（${u.en}）` : u.zh)
      if (u.en) expect(u.en_ref, id).toMatch(/^https:\/\/support\.travian\.com\/en\/articles\/(139|187|10)-/)
      if (!u.zh_pending) expect([u.en, u.en_ref], id).toEqual([null, null])
    }
    expect(INGAME_UNITS.thrall?.display_zh).toBe('奴僕（Thrall）')
    expect(INGAME_UNITS.heimdalls_eye?.display_zh).toBe('海姆達爾之眼（Heimdall’s Eye）')
    expect(INGAME_UNITS.hoplite?.display_zh).toBe('重裝步兵（Hoplite）')
    expect(INGAME_UNITS.ephor?.display_zh).toBe('監察官（Ephor）')
    // 官方說明頁沒寫英文名：只有中文
    for (const id of ['spartan_ram', 'ballista', 'spartan_settler']) expect(INGAME_UNITS[id]?.en, id).toBeNull()
  })

  it('弩炮 is spelled like ts11 (manual/troop/18, 68); 弩砲 only survives as a search alias', () => {
    expect(ingameUnitNameByGameId(18)).toBe('弩炮')
    expect(INGAME_UNITS.ballista?.zh).toBe('弩炮')
    expect(INGAME_UNITS.ballista?.aliases).toContain('弩砲')
    expect(Object.values(INGAME_UNITS).map(u => u.zh)).not.toContain('弩砲')
  })

  it('no Chinese characters in any English name (name.en of tribes / guide units, table en, building names)', () => {
    const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/
    for (const t of Object.values(TRIBES)) {
      expect(t.name.en, t.id).not.toMatch(CJK)
      for (const u of t.units) expect(u.name.en, `${t.id}.${u.id}`).not.toMatch(CJK)
    }
    for (const [id, u] of Object.entries(INGAME_UNITS)) if (u.en) expect(u.en, id).not.toMatch(CJK)
    for (const [id, [, nameEn]] of Object.entries(gen.names as Record<string, string[]>)) expect(nameEn, id).not.toMatch(CJK)
  })

  it('no English unit name inside Chinese text of the tribe guides and build-order data (one name per unit on screen)', () => {
    const en = new Set<string>()
    for (const t of Object.values(TRIBES)) for (const u of t.units) if (!/^(Ram|Catapult|Settler)$/.test(u.name.en)) en.add(u.name.en)
    const files = import.meta.glob(['/src/features/guideCalcs/data/tribes/*.ts', '/src/features/guideCalcs/data/build-order/*.ts'], {
      query: '?raw', import: 'default', eager: true,
    }) as Record<string, string>
    const bad: string[] = []
    for (const [p, src] of Object.entries(files)) {
      if (/\.test\./.test(p)) continue
      for (const m of src.matchAll(/zh: (['"])(.*?)\1/g)) {
        const text = m[2]!
        const hits = [...en].filter(n => text.includes(n))
        if (hits.length) bad.push(`${p}: ${hits.join('、')} in 「${text.slice(0, 40)}」`)
      }
    }
    expect(bad).toEqual([])
    // 英文欄也不能是中文（#33 的替換曾經把幾個兵種的英文名換成中文）
    for (const t of Object.values(TRIBES)) for (const u of t.units) expect(u.name.en, `${t.id}.${u.id}`).not.toMatch(/[\u4e00-\u9fff]/)
  })

  it('no old name in front-end source (aliases only live in the table, for search)', () => {
    const files = import.meta.glob(['/src/**/*.{ts,tsx}', '/src/i18n/locales/zh-TW.json'], {
      query: '?raw', import: 'default', eager: true,
    }) as Record<string, string>
    const bad: string[] = []
    for (const [p, src] of Object.entries(files)) {
      if (/(__tests__|\.test\.|ingameNames)/.test(p)) continue
      const hits = oldNamesIn(src)
      if (hits.length) bad.push(`${p}: ${hits.join('、')}`)
    }
    expect(bad).toEqual([])
  })
})

const calculators = import.meta.glob('/src/features/guideCalcs/components/*Calculator.tsx', {
  import: 'default', eager: true,
}) as Record<string, ComponentType>

describe('畫面上的建築、兵種名稱都是遊戲內名稱', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
    // 桌機寬度：明細展開，看得到全部名稱
    window.matchMedia = ((query: string) => ({
      matches: true, media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  for (const [path, Comp] of Object.entries(calculators)) {
    it(`${path.split('/').pop()}: no old building / unit / tribe name on screen`, () => {
      const { container } = render(<MemoryRouter><Comp /></MemoryRouter>)
      const text = container.textContent + [...container.querySelectorAll('option')].map(o => o.textContent).join(' ')
      expect(oldNamesIn(text)).toEqual([])
      cleanup()
    })
  }

  it('passive CP shows 盔甲廠 (no T3 防具工坊); build order shows 泥坑 and 鋼鐵鑄造廠', async () => {
    const { default: PassiveCp } = await import('@/features/guideCalcs/components/PassiveCpCalculator')
    const a = render(<MemoryRouter><PassiveCp /></MemoryRouter>)
    expect(a.container.textContent).toContain('盔甲廠')
    expect(a.container.textContent).not.toContain('防具工坊')
    cleanup()
    const { default: BuildOrder } = await import('@/features/guideCalcs/components/BuildOrderCalculator')
    const b = render(<MemoryRouter><BuildOrder /></MemoryRouter>)
    expect(b.container.textContent).toContain('泥坑')
    expect(b.container.textContent).toContain('鋼鐵鑄造廠')
    cleanup()
  })
})
