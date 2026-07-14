import {
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import {
  I18nContext,
  type I18nContextValue,
  type Language,
  type TranslationParams,
} from '@/lib/i18n/context'
import { translations } from '@/lib/i18n/translations'
import { localStore } from '@/lib/firebase/localStore'

const defaultLanguage: Language = 'de'
const storageKey = 'bengtstoolbox.language'
const locales: Record<Language, string> = {
  de: 'de-DE',
  en: 'en-GB',
}
const defaultDateTimeOptions: Intl.DateTimeFormatOptions = {
  dateStyle: 'short',
  timeStyle: 'short',
}

function isLanguage(value: unknown): value is Language {
  return value === 'de' || value === 'en'
}

function readStoredLanguage() {
  if (typeof window === 'undefined') {
    return defaultLanguage
  }

  const storedLanguage = localStore.readText(storageKey, defaultLanguage).value
  return isLanguage(storedLanguage) ? storedLanguage : defaultLanguage
}

function writeStoredLanguage(language: Language) {
  if (typeof window === 'undefined') {
    return
  }

  // Language persistence is deliberately best-effort; the active UI language
  // remains usable even when the browser blocks local storage.
  localStore.writeText(storageKey, language)
}

function interpolate(value: string, params?: TranslationParams) {
  if (!params) {
    return value
  }

  return value.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key)
      ? String(params[key])
      : match,
  )
}

function normalizeDate(value: Date | number | string) {
  return value instanceof Date ? value : new Date(value)
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage)
  const locale = locales[language]

  useEffect(() => {
    document.documentElement.lang = language
    writeStoredLanguage(language)
  }, [language])

  const value = useMemo<I18nContextValue>(
    () => ({
      formatDateTime: (dateValue, options) =>
        new Intl.DateTimeFormat(locale, options ?? defaultDateTimeOptions).format(
          normalizeDate(dateValue),
        ),
      formatNumber: (numberValue, options) =>
        new Intl.NumberFormat(locale, options).format(numberValue),
      formatTime: (dateValue, options) =>
        new Intl.DateTimeFormat(locale, options).format(normalizeDate(dateValue)),
      language,
      locale,
      setLanguage: setLanguageState,
      t: (key, params) => interpolate(translations[language][key], params),
    }),
    [language, locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
