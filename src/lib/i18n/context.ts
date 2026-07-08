import { createContext } from 'react'

import type { TranslationKey } from '@/lib/i18n/translations'

export type Language = 'de' | 'en'

export type TranslationParams = Record<string, number | string>

export type I18nContextValue = {
  formatDateTime: (
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatTime: (
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string
  language: Language
  locale: string
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)
