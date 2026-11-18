import type { Language } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { useSlidingIndicator } from '@/components/ui/useSlidingIndicator'

const languageOptions: {
  labelKey: 'language.de.label' | 'language.en.label'
  value: Language
}[] = [
  { labelKey: 'language.de.label', value: 'de' },
  { labelKey: 'language.en.label', value: 'en' },
]

// Text-Umschalter im Segmented-Stil; ohne Flaggen bleibt das Chrome einfarbig.
export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n()
  const { listRef, indicatorRef } = useSlidingIndicator()

  return (
    <div
      ref={listRef}
      aria-label={t('language.selectorLabel')}
      className="selection-track h-10 gap-0 p-[3px]"
      role="radiogroup"
    >
      <span ref={indicatorRef} className="selection-indicator" aria-hidden="true" />
      {languageOptions.map((option) => {
        const label = t(option.labelKey)
        const isActive = language === option.value

        return (
          <button
            key={option.value}
            aria-checked={isActive}
            aria-label={t('language.switchTo', { language: label })}
            className="selection-item type-label h-8 w-9 flex-none px-0 py-0 leading-none"
            role="radio"
            title={label}
            type="button"
            onClick={() => setLanguage(option.value)}
          >
            {option.value.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
