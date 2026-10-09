import { describe, expect, it } from 'vitest'
import zh from '@/i18n/locales/zh-TW.json'
import en from '@/i18n/locales/en.json'
import { PENDING_KINDS, PENDING_KINDS_UNUSED, PENDING_KIND_USAGE } from '../pendingNotes'

// 掃全部原始碼，找出每個 <PendingVerifyChip kind=...> 用到的 kind
const sources = import.meta.glob('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function usedKinds(): Set<string> {
  const used = new Set<string>()
  for (const [file, text] of Object.entries(sources)) {
    if (file.includes('__tests__') || file.endsWith('.test.tsx')) continue
    for (const m of text.matchAll(/<PendingVerifyChip[^>]*\bkind=(?:"([a-zA-Z]+)"|\{([^}]*)\})/g)) {
      if (m[1]) used.add(m[1])
      else for (const q of m[2]!.matchAll(/'([a-zA-Z]+)'/g)) used.add(q[1]!)
    }
  }
  return used
}

type Notes = Record<string, { what?: string; source?: string }>

describe('「待驗證」說明文字表（lib/pendingNotes.ts）', () => {
  it('every chip in the code uses a kind from the table', () => {
    const used = usedKinds()
    expect(used.size).toBeGreaterThan(5)
    for (const k of used) expect(PENDING_KINDS as readonly string[], k).toContain(k)
  })

  it('every kind in the table is used somewhere and says where', () => {
    const used = usedKinds()
    for (const k of PENDING_KINDS) {
      // 表裡保留、但目前沒有灰標用到的種類要寫明（PENDING_KINDS_UNUSED）
      expect(used.has(k), k).toBe(!PENDING_KINDS_UNUSED.includes(k))
      expect(PENDING_KIND_USAGE[k], k).toBeTruthy()
    }
  })

  it.each([['zh-TW', zh], ['en', en]] as const)('%s has both lines for every kind', (_lang, dict) => {
    const notes = (dict as unknown as { pendingNotes: Notes }).pendingNotes
    expect(Object.keys(notes).sort()).toEqual([...PENDING_KINDS].sort())
    for (const k of PENDING_KINDS) {
      expect(notes[k]?.what?.trim(), `${k}.what`).toBeTruthy()
      expect(notes[k]?.source?.trim(), `${k}.source`).toBeTruthy()
    }
  })

  it('says the real source: community numbers are 「社群整理的數字」, never 「舊資料表」', () => {
    const notes = (zh as unknown as { pendingNotes: Notes }).pendingNotes
    expect(notes.units?.source).toContain('社群整理的數字')
    for (const k of PENDING_KINDS) expect(JSON.stringify(notes[k])).not.toContain('舊資料表')
  })

  it.each([['zh-TW', zh], ['en', en]] as const)('%s copy has no internal jargon (「T4」) and no simplified 「粮」', (_lang, dict) => {
    const notes = (dict as unknown as { pendingNotes: Notes }).pendingNotes
    for (const k of PENDING_KINDS) {
      const text = `${notes[k]?.what ?? ''} ${notes[k]?.source ?? ''}`
      expect(text, k).not.toMatch(/T4/)
      expect(text, k).not.toContain('粮')
    }
    // 整份語系檔也不能有
    expect(JSON.stringify(dict)).not.toMatch(/T4/)
    expect(JSON.stringify(dict)).not.toContain('粮')
  })

  it('the 已帶入 chip uses autofillUnits, whose two lines cover unit costs and Spartan speed', () => {
    const bar = Object.entries(sources).find(([f]) => f.endsWith('/components/autofill/AutoFillBar.tsx'))?.[1] ?? ''
    expect(bar).toMatch(/<PendingVerifyChip[^>]*kind="autofillUnits"/)
    expect(bar).not.toMatch(/kind="units"/)
    const n = (zh as unknown as { pendingNotes: Notes }).pendingNotes.autofillUnits
    expect(n?.what).toContain('兵種花費、糧耗、訓練時間')
    expect(n?.source).toContain('斯巴達速度')
  })

  it('no chip copy is written inline in components (no note= / withNote props left)', () => {
    for (const [file, text] of Object.entries(sources)) {
      if (file.includes('__tests__') || file.endsWith('.test.tsx')) continue
      expect(text, file).not.toMatch(/<PendingVerifyChip[^>]*\b(note|withNote)=/)
    }
  })
})
