import { describe, expect, it } from 'vitest'
import zh from '@/i18n/locales/zh-TW.json'
import en from '@/i18n/locales/en.json'
import { PENDING_KINDS, PENDING_KIND_USAGE } from '../pendingNotes'

// 掃全部原始碼，找出每個 <PendingVerifyChip kind=...> 用到的 kind
const sources = import.meta.glob('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
// lib 裡選 kind 的小函式（例如 speedPendingKinds，P0-21）也算
const libSources = import.meta.glob('/src/lib/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function usedKinds(): Set<string> {
  const used = new Set<string>()
  for (const [file, text] of Object.entries({ ...sources, ...libSources })) {
    if (file.includes('__tests__') || /\.test\.tsx?$/.test(file)) continue
    // <PendingVerifyChip kind="x" | kinds={[...]}>、<SummaryPending kind(s)=...>、titlePending=...
    for (const m of text.matchAll(/(?:<(?:PendingVerifyChip|SummaryPending)[^>]*\bkinds?|\btitlePending)=(?:"([a-zA-Z]+)"|\{([^}]*)\})/g)) {
      if (m[1]) used.add(m[1])
      // typeof x === 'string' 這種比較不算
      else for (const q of m[2]!.matchAll(/(?<!=== )'([a-zA-Z]+)'/g)) used.add(q[1]!)
    }
    // kinds 用變數組出來的（例如 const prodKinds: PendingKind[] = [...(gold ? ['plusFormula' as const] : [])]）
    for (const line of text.split('\n')) {
      // 單一個 kind 用變數選的（例如 const capKind: PendingKind = office > 0 ? 'merchantTradeOffice' : 'merchantCapacity'）
      if (/:\s*PendingKind\s*=/.test(line)) for (const m of line.matchAll(/'([a-zA-Z]+)'/g)) used.add(m[1]!)
      if (!/PendingKind\[\]/.test(line) && !/^\s*\.\.\.\(/.test(line)) continue
      for (const m of line.matchAll(/'([a-zA-Z]+)' as const/g)) used.add(m[1]!)
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
      expect(used.has(k), k).toBe(true)
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

  it('no 「T4」 or 「粮」 in user-visible text of any .tsx file (comments ignored)', () => {
    for (const [file, text] of Object.entries(sources)) {
      if (file.includes('__tests__') || file.endsWith('.test.tsx')) continue
      // 拿掉註解（// …、/* … */、JSX 的 {/* … */}），剩下的字串和 JSX 文字都是使用者可能看到的
      const visible = text
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
      expect(visible, file).not.toMatch(/T4/)
      expect(visible, file).not.toContain('粮')
    }
  })

  it('the 已帶入 chip uses autofillUnits, whose one line covers unit costs and Spartan speed', () => {
    const bar = Object.entries(sources).find(([f]) => f.endsWith('/components/autofill/AutoFillBar.tsx'))?.[1] ?? ''
    expect(bar).toMatch(/<PendingVerifyChip[^>]*kind="autofillUnits"/)
    expect(bar).not.toMatch(/kind="units"/)
    const n = (zh as unknown as { pendingNotes: Notes }).pendingNotes.autofillUnits
    expect(n?.what).toContain('花費、糧耗、訓練時間')
    expect(n?.what).toContain('維京的花費、糧耗、訓練時間、攻防已照官方說明頁核對，攜帶量還是社群整理的數字')
    expect(n?.what).toContain('ts11 沒有斯巴達')
    expect(n?.source).toContain('斯巴達速度')
  })

  it('no chip copy is written inline in components (no note= / withNote props left)', () => {
    for (const [file, text] of Object.entries(sources)) {
      if (file.includes('__tests__') || file.endsWith('.test.tsx')) continue
      expect(text, file).not.toMatch(/<PendingVerifyChip[^>]*\b(note|withNote)=/)
    }
  })
})

describe('P0-17 新種類的文字（PM 定稿，2026-10-10；merchantCapacity、plusFormula、fieldHighLevel 已照官方核對，P0-23 拿掉）', () => {
  const notes = (zh as unknown as { pendingNotes: Notes }).pendingNotes
  const enNotes = (en as unknown as { pendingNotes: Notes }).pendingNotes
  it.each([
    ['unitCarry', '兵種攜帶量還沒在 ts11 遊戲內核對。', '目前用的是社群整理的數字，可能有誤差。'],
    ['launchSim', '開局花費是試算表每一步的加總，含派對（用小慶典的糧）。', '這些數字還沒在 ts11 遊戲內核對。'],
    // P0-23：維京運載量（設計師兩行格式；出處照實寫，跟已帶入列「攜帶量還是社群整理的數字」一致）
    ['vikingCarry', '維京運載量還沒核對。', '官方說明頁 S139 沒有運載量；目前用的是社群整理的數字。'],
    // P0-23：建築效果欄（官方知識庫沒有可對照數字的建築）
    ['buildingEffect', '這棟建築的效果還沒核對。', '官方知識庫沒有可以對照的效果數字；目前的文字來源還在查。'],
  ])('%s', (kind, what, source) => {
    expect(notes[kind]).toEqual({ what, source })
    expect(enNotes[kind]?.what).toBeTruthy()
    expect(enNotes[kind]?.source).toBeTruthy()
    for (const t of [what, source, enNotes[kind]!.what!, enNotes[kind]!.source!]) {
      expect(t).not.toMatch(/T4/)
      expect(t).not.toContain('粮')
    }
  })
})

describe('#27 後續新種類的文字（merchantTradeOffice 已照官方核對，P0-23 拿掉）', () => {
  const notes = (zh as unknown as { pendingNotes: Notes }).pendingNotes
  const enNotes = (en as unknown as { pendingNotes: Notes }).pendingNotes
  it.each([
    // PM 定稿（照官方說明頁 S71 的實際內容寫）
    ['arenaSpeed', '競技場加速還沒在 ts11 遊戲內核對。', '目前照官方說明頁：前 20 格不加速，超過的路段每級 +20%。'],
    // P0-20（PM 定稿）
    ['heroBootsSpeed', '英雄靴子加速還沒在 ts11 遊戲內核對。', '目前照官方說明頁：只加快超過 20 格的路段。'],
    ['arenaBootsSpeed', '競技場和英雄靴子加速還沒在 ts11 遊戲內核對。', '目前照官方說明頁：前 20 格不加速，超過的路段每級 +20%，再加上靴子的加成（兩者相加，不是相乘）。'],
  ])('%s', (kind, what, source) => {
    expect(notes[kind]).toEqual({ what, source })
    expect(enNotes[kind]?.what).toBeTruthy()
    expect(enNotes[kind]?.source).toBeTruthy()
    for (const t of [what, source, enNotes[kind]!.what!, enNotes[kind]!.source!]) {
      expect(t).not.toMatch(/T4/)
      expect(t).not.toContain('粮')
    }
  })
})

describe('P0-23：照官方資料核對過的種類拿掉了', () => {
  it.each(['heroMansionCost', 'cropSim', 'merchantCapacity', 'plusFormula', 'fieldHighLevel', 'merchantTradeOffice'])('%s', (kind) => {
    expect((PENDING_KINDS as readonly string[]).includes(kind)).toBe(false)
    expect((zh as unknown as { pendingNotes: Notes }).pendingNotes[kind]).toBeUndefined()
    expect((en as unknown as { pendingNotes: Notes }).pendingNotes[kind]).toBeUndefined()
  })
})
