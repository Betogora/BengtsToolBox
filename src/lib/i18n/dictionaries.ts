import type { Language } from '@/lib/i18n/context'
import { de, type TranslationKey } from '@/lib/i18n/translations'

type Dictionary = Record<TranslationKey, string>

// German ships with the startup bundle and is the fallback; English loads on demand.
const dictionaries: Partial<Record<Language, Dictionary>> = { de }
let englishRequest: Promise<void> | null = null

export function isLanguageLoaded(language: Language) {
  return dictionaries[language] !== undefined
}

// Resolves once the dictionary is available or loading failed; it never rejects.
export function loadLanguage(language: Language): Promise<void> {
  if (isLanguageLoaded(language)) {
    return Promise.resolve()
  }

  englishRequest ??= import('@/lib/i18n/englishTranslations').then(
    ({ en }) => {
      dictionaries.en = en
    },
    () => {
      // A later call retries; until then the German texts stay in place.
      englishRequest = null
    },
  )

  return englishRequest
}

export function dictionaryFor(language: Language): Dictionary {
  return dictionaries[language] ?? de
}
