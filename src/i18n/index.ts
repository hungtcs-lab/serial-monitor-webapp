import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'
import { zhCN } from './locales/zh-CN'

export const SUPPORTED_LANGUAGES = ['zh-CN', 'en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export function resolveLanguage(preference: 'auto' | Language): Language {
  if (preference !== 'auto') return preference
  return navigator.languages.some((lang) => lang.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: resolveLanguage('auto'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
