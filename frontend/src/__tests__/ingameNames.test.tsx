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
    account: null, village: null, villages: [], speed: 1, tribe: null, accountSpeed: 1, accountTribe: null,
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

/** 先把遊戲內名稱拿掉（避免「大倉庫」裡的「倉庫」這種誤判），剩下的不能有舊名 */
function oldNamesIn(text: string): string[] {
  let s = text
  for (const n of [...INGAME].sort((a, b) => b.length - a.length)) s = s.split(n).join('＿')
  return ALIASES.filter(a => s.includes(a))
}

describe('遊戲內名稱表', () => {
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
    expect(guideHits).toBeGreaterThanOrEqual(50)
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
