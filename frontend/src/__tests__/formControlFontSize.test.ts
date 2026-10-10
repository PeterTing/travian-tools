import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// P0-17 (f)：輸入框、下拉選單、多行輸入一律 16px（iOS 點進去不會放大畫面）
function files(dir: string, ext: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) files(p, ext, out)
    else if (ext.test(name) && !/\.test\./.test(name)) out.push(p)
  }
  return out
}

describe('form controls render at 16px everywhere', () => {
  it('index.css forces 16px on select and textarea with !important, so text-sm or CSS modules cannot shrink them', () => {
    const css = readFileSync('src/index.css', 'utf8')
    expect(css).toMatch(/select,\s*textarea\s*\{[^}]*font-size:\s*16px\s*!important;/)
  })

  it('no CSS module sets a font-size on a rule that targets select, textarea or input', () => {
    for (const f of files('src', /\.css$/)) {
      if (f.endsWith('index.css')) continue
      const css = readFileSync(f, 'utf8')
      for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
        const sel = m[1]!.trim()
        if (/(^|[\s,>+~])(select|textarea|input)\b/.test(sel)) expect(m[2], `${f} ${sel}`).not.toMatch(/font-size/)
      }
    }
  })

  it('no <select> or <textarea> in the pages uses text-xs / text-sm', () => {
    for (const f of files('src', /\.tsx$/)) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/<(select|textarea)\b[^>]*?className=(["'`{])([^>]*?)>/gs)) {
        expect(m[3], `${f} <${m[1]}>`).not.toMatch(/\btext-(xs|sm)\b/)
      }
    }
  })
})
