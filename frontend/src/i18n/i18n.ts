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
 * Value for <html lang>, used for font selection and by screen readers.
 * It does NOT change the native date input: Chrome formats it from the
 * browser's UI language, not <html lang> (measured: an en-US Chrome still
 * shows mm/dd/yyyy). Forcing 年/月/日 would mean replacing the native input;
 * PM decided not to.
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
