import i18n, { type ParseKeys } from 'i18next'
import { initReactI18next } from 'react-i18next'
import ptBR from './locales/pt-BR'

const DEFAULT_LANGUAGE = 'pt-BR'
const resources = { [DEFAULT_LANGUAGE]: { translation: ptBR } } as const

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof ptBR }
  }
}

export type TranslationKey = ParseKeys

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  initAsync: false,
  interpolation: { escapeValue: false },
})

export const translateKey = i18n.t.bind(i18n) as unknown as (key: string, options?: Record<string, unknown>) => string

export const translateMessage = (message: string) => (i18n.exists(message) ? translateKey(message) : message)

export default i18n
