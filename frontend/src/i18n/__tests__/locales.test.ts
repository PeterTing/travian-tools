import { describe, expect, it } from 'vitest'

/**
 * JSON.parse 遇到重複的 key 時不會報錯，只會留下最後一個；
 * 之前 zh-TW.json / en.json 各有兩個 "common"，第二個把第一個整個蓋掉，
 * 畫面上就出現 common.loading 之類的原始 key。這裡讀原始文字，任何層級有重複 key 都算失敗。
 */
const LOCALE_FILES = import.meta.glob<string>('../locales/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** 走過整份 JSON，回傳重複的 key 路徑（例如 "common"、"villages.roles.ww"） */
function findDuplicateKeys(text: string): string[] {
  let i = 0
  const duplicates: string[] = []

  const skipWhitespace = () => {
    while (i < text.length && /\s/.test(text[i])) i += 1
  }

  const consume = (char: string) => {
    skipWhitespace()
    if (text[i] !== char) {
      throw new SyntaxError(`expected "${char}" at offset ${i}`)
    }
    i += 1
  }

  const readString = (): string => {
    skipWhitespace()
    const start = i
    if (text[i] !== '"') throw new SyntaxError(`expected string at offset ${i}`)
    i += 1
    while (i < text.length && text[i] !== '"') {
      i += text[i] === '\\' ? 2 : 1
    }
    i += 1
    return JSON.parse(text.slice(start, i)) as string
  }

  const readValue = (path: string): void => {
    skipWhitespace()
    const char = text[i]
    if (char === '{') {
      i += 1
      const seen = new Set<string>()
      skipWhitespace()
      if (text[i] === '}') {
        i += 1
        return
      }
      for (;;) {
        const key = readString()
        const keyPath = path ? `${path}.${key}` : key
        if (seen.has(key)) duplicates.push(keyPath)
        seen.add(key)
        consume(':')
        readValue(keyPath)
        skipWhitespace()
        if (text[i] === ',') {
          i += 1
          continue
        }
        consume('}')
        return
      }
    }
    if (char === '[') {
      i += 1
      skipWhitespace()
      if (text[i] === ']') {
        i += 1
        return
      }
      for (let index = 0; ; index += 1) {
        readValue(`${path}[${index}]`)
        skipWhitespace()
        if (text[i] === ',') {
          i += 1
          continue
        }
        consume(']')
        return
      }
    }
    if (char === '"') {
      readString()
      return
    }
    // 數字、true、false、null
    const match = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i))
    if (!match) throw new SyntaxError(`unexpected token at offset ${i}`)
    i += match[0].length
  }

  readValue('')
  skipWhitespace()
  if (i !== text.length) throw new SyntaxError(`trailing content at offset ${i}`)
  return duplicates
}

describe('findDuplicateKeys', () => {
  it('finds duplicates at any depth and ignores the same key in different objects', () => {
    const text = '{"a": {"x": 1, "y": [ {"k": 1, "k": 2} ]}, "b": {"x": 1}, "a": {"z": "\\"a\\""}}'
    expect(findDuplicateKeys(text)).toEqual(['a.y[0].k', 'a'])
    expect(findDuplicateKeys('{"a": {"x": 1}, "b": {"x": 2}, "c": [], "d": {}}')).toEqual([])
  })

  it('rejects text that is not JSON', () => {
    expect(() => findDuplicateKeys('{"a": 1,}')).toThrow(SyntaxError)
  })
})

describe('locale files', () => {
  const entries = Object.entries(LOCALE_FILES)

  it('are all picked up', () => {
    const names = entries.map(([file]) => file.split('/').pop())
    expect(names).toEqual(expect.arrayContaining(['en.json', 'zh-TW.json']))
  })

  it.each(entries)('%s has no duplicate keys', (_file, text) => {
    expect(findDuplicateKeys(text)).toEqual([])
  })
})
