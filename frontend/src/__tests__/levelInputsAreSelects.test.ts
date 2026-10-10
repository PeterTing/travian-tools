import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Peter 10/10：建築、資源田的等級一律用下拉選單選（只能選、不能打字）。
function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) files(p, out)
    else if (/\.tsx$/.test(name) && !/\.test\./.test(name)) out.push(p)
  }
  return out
}

describe('building / field level inputs are dropdowns', () => {
  it('no page uses the old − number ＋ Stepper any more', () => {
    for (const f of files('src')) {
      if (f.endsWith('Stepper.tsx')) continue
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/<Stepper\b/)
    }
  })

  it('no number input is bound to a level value', () => {
    for (const f of files('src')) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/<input\b[^>]*?type="number"[^>]*?>/gs)) {
        expect(m[0], f).not.toMatch(/value=\{[^}]*(level|Level|lv|flv|bonus\.(saw|bri|fnd|mil|bak)|waterworks|arena|office|tsLevel)\b/)
      }
    }
  })
})
