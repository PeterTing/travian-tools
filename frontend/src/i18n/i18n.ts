import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'

const resources = {
  'zh-TW': {
    translation: zhTW,
  },
  en: {
    translation: en,
  },
}

/**
 * Value for <html lang>. Browsers use it for native controls (the date input
 * shows 年/月/日 under zh-Hant) and for font selection.
 */
export function htmlLangFor(language: string | undefined): string {
  return language?.toLowerCase().startsWith('en') ? 'en' : 'zh-Hant'
}

function syncDocumentLang() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = htmlLangFor(i18n.resolvedLanguage ?? i18n.language)
}

i18n.on('languageChanged', syncDocumentLang)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-TW',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    saveMissing: true,
    missingKeyHandler: (_lngs, _ns, key) => {
      console.warn(`🌐 Missing i18n key: "${key}"`)
    },
  })

syncDocumentLang()

export default i18n
