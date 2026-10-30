import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

import {
  I18nContext,
  type I18nContextValue,
  type Language,
  type TranslationParams,
} from '@/lib/i18n/context'
import { dictionaryFor, isLanguageLoaded, loadLanguage } from '@/lib/i18n/dictionaries'
import { dateTimeFormat, numberFormat } from '@/lib/i18n/formatters'
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
  // A stored non-default language renders only once its texts are there, so the
  // first paint is never German for English users.
  const [isReady, setIsReady] = useState(() => isLanguageLoaded(language))
  const requestedLanguage = useRef(language)
  const locale = locales[language]

  useEffect(() => {
    document.documentElement.lang = language
    writeStoredLanguage(language)
  }, [language])

  useEffect(() => {
    if (isReady) {
      return undefined
    }

    let isActive = true
    void loadLanguage(language).then(() => {
      if (isActive) setIsReady(true)
    })

    return () => {
      isActive = false
    }
  }, [isReady, language])

  useEffect(() => {
    if (!isReady || isLanguageLoaded('en')) {
      return undefined
    }

    // Preload English while idle so switching stays instant.
    const preload = () => void loadLanguage('en')
    // Safari has no requestIdleCallback; a short delay serves the same purpose.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload, { timeout: 3_000 })
      return () => window.cancelIdleCallback(id)
    }

    const timeout = window.setTimeout(preload, 1_000)
    return () => window.clearTimeout(timeout)
  }, [isReady])

  const setLanguage = useCallback((nextLanguage: Language) => {
    requestedLanguage.current = nextLanguage

    if (isLanguageLoaded(nextLanguage)) {
      setLanguageState(nextLanguage)
      return
    }

    // Keep the current texts until the dictionary arrives; German stays the fallback if it fails.
    void loadLanguage(nextLanguage).then(() => {
      if (requestedLanguage.current === nextLanguage) setLanguageState(nextLanguage)
    })
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      formatDateTime: (dateValue, options) =>
        dateTimeFormat(locale, options ?? defaultDateTimeOptions).format(
          normalizeDate(dateValue),
        ),
      formatNumber: (numberValue, options) =>
        numberFormat(locale, options).format(numberValue),
      formatTime: (dateValue, options) =>
        dateTimeFormat(locale, options).format(normalizeDate(dateValue)),
      language,
      locale,
      setLanguage,
      t: (key, params) => interpolate(dictionaryFor(language)[key], params),
    }),
    [language, locale, setLanguage],
  )

  if (!isReady) {
    return null
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
