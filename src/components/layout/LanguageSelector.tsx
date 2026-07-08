import type { Language } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

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

  return (
    <div
      aria-label={t('language.selectorLabel')}
      className="inline-flex h-11 w-fit items-center justify-center rounded-lg border border-border bg-secondary/70 p-[3px] text-muted-foreground"
      role="radiogroup"
    >
      {languageOptions.map((option) => {
        const label = t(option.labelKey)
        const isActive = language === option.value

        return (
          <button
            key={option.value}
            aria-checked={isActive}
            aria-label={t('language.switchTo', { language: label })}
            className={cn(
              'inline-flex size-9 items-center justify-center rounded-md border border-transparent leading-none transition-[background-color,box-shadow,transform] outline-none hover:bg-background/80 focus-visible:ring-[3px] focus-visible:ring-ring/45',
              isActive && 'bg-background text-foreground shadow-sm',
            )}
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
