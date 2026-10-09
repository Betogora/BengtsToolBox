import type { Language } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { useSlidingIndicator } from '@/components/ui/useSlidingIndicator'

const languageOptions: {
  flag: 'de' | 'gb'
  labelKey: 'language.de.label' | 'language.en.label'
  value: Language
}[] = [
  {
    flag: 'de',
    labelKey: 'language.de.label',
    value: 'de',
  },
  {
    flag: 'gb',
    labelKey: 'language.en.label',
    value: 'en',
  },
]

function FlagIcon({ flag }: { flag: 'de' | 'gb' }) {
  const background =
    flag === 'de'
      ? 'linear-gradient(to bottom, #050505 0 33.333%, #dd0000 33.333% 66.666%, #ffce00 66.666% 100%)'
      : [
          'linear-gradient(0deg, transparent 36%, #ffffff 36% 44%, #c8102e 44% 56%, #ffffff 56% 64%, transparent 64%)',
          'linear-gradient(90deg, transparent 36%, #ffffff 36% 44%, #c8102e 44% 56%, #ffffff 56% 64%, transparent 64%)',
          'linear-gradient(34deg, transparent 40%, #ffffff 40% 47%, #c8102e 47% 53%, #ffffff 53% 60%, transparent 60%)',
          'linear-gradient(-34deg, transparent 40%, #ffffff 40% 47%, #c8102e 47% 53%, #ffffff 53% 60%, transparent 60%)',
          '#012169',
        ].join(', ')

  return (
    <span
      aria-hidden="true"
      className="block h-4 w-6 overflow-hidden rounded-[2px] border border-foreground/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]"
      style={{ background }}
    />
  )
}

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n()
  const { listRef, indicatorRef } = useSlidingIndicator()

  return (
    <div
      ref={listRef}
      aria-label={t('language.selectorLabel')}
      className="selection-track h-10 gap-0 p-[3px] sm:h-11"
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
            className="selection-item size-8 flex-none px-1 py-0 leading-none sm:size-9"
            role="radio"
            title={label}
            type="button"
            onClick={() => setLanguage(option.value)}
          >
            <FlagIcon flag={option.flag} />
          </button>
        )
      })}
    </div>
  )
}
