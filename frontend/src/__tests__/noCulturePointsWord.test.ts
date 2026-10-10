// 畫面文字一律寫「CP」，不寫「文化點」（P0-23 設計師）
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('UI text says CP, not 文化點', () => {
  it('zh-TW strings, front-end source and backend static data', () => {
    const files = import.meta.glob(['/src/**/*.{ts,tsx}', '/src/i18n/locales/zh-TW.json'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const bad = Object.entries(files).filter(([p, src]) => !/(__tests__|\.test\.)/.test(p) && src.includes('文化點')).map(([p]) => p)
    expect(bad).toEqual([])
    for (const f of ['buildings.json', 'resources.json', 'culture_points.json', 'troops.json']) {
      expect(readFileSync(resolve(__dirname, '../../../backend/data/static', f), 'utf8'), f).not.toContain('文化點')
    }
  })
})
