import { createI18n } from 'vue-i18n'

const messages = {
  en: {
    outputExplorer: 'Output Explorer',
    openOutputExplorer: 'Open Output Explorer',
    searchInFolder: 'Search in {0}',
  },
  zh: {
    outputExplorer: 'Output Explorer',
    openOutputExplorer: 'Open Output Explorer',
    searchInFolder: '在 {0} 中搜索',
  },
}

const getLocalLanguage = () => {
  const local =
    localStorage.getItem('Comfy.Settings.Comfy.Locale') ||
    navigator.language.split('-')[0] ||
    'en'

  return local.replace(/['"]/g, '')
}

export const i18n = createI18n({
  legacy: false,
  locale: getLocalLanguage(),
  fallbackLocale: 'en',
  messages,
})
