import { afterAll, describe, expect, it } from 'vitest'
import i18n, { htmlLangFor } from '../i18n'
import indexHtml from '../../../index.html?raw'

describe('<html lang>', () => {
  const original = i18n.language

  afterAll(async () => {
    await i18n.changeLanguage(original)
  })

  it('maps app languages to html lang values', () => {
    expect(htmlLangFor('zh-TW')).toBe('zh-Hant')
    expect(htmlLangFor('en')).toBe('en')
    expect(htmlLangFor('en-US')).toBe('en')
    expect(htmlLangFor(undefined)).toBe('zh-Hant')
  })

  it('follows language changes', async () => {
    await i18n.changeLanguage('en')
    expect(document.documentElement.lang).toBe('en')

    await i18n.changeLanguage('zh-TW')
    expect(document.documentElement.lang).toBe('zh-Hant')
  })

  it('uses zh-Hant when the detected language falls back to zh-TW', async () => {
    await i18n.changeLanguage('fr')
    expect(document.documentElement.lang).toBe('zh-Hant')
    await i18n.changeLanguage('en-GB')
    expect(document.documentElement.lang).toBe('en')
  })

  it('index.html starts as zh-Hant', () => {
    expect(indexHtml).toContain('<html lang="zh-Hant">')
  })
})
