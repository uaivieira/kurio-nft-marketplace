import type ptBR from './locales/pt-BR'

type Locale = typeof ptBR

export type ValidationKey = `validation.${keyof Locale['validation']}`
export const validation = (key: keyof Locale['validation']): ValidationKey => `validation.${key}`
