/**
 * Thin adapter so guide calculators keep calling useLang().
 * Maps to react-i18next language (zh* → zh, else en).
 */
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export type GuideLang = 'zh' | 'en'

export function useLang() {
  const { i18n } = useTranslation()
  const lang: GuideLang = useMemo(() => {
    const raw = (i18n.language || 'zh-TW').toLowerCase()
    return raw.startsWith('zh') ? 'zh' : 'en'
  }, [i18n.language])

  const t = useCallback(
    (pair: { zh: string; en: string } | string) => {
      if (typeof pair === 'string') return pair
      return lang === 'en' ? pair.en : pair.zh
    },
    [lang],
  )

  return { lang, t }
}
