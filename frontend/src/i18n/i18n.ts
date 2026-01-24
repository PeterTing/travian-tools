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

export default i18n
