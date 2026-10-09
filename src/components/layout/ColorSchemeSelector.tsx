import { colorSchemeOptions } from '@/components/layout/colorSchemeOptions'
import { useColorScheme } from '@/lib/colorScheme'
import { useI18n } from '@/lib/i18n'
import { useSlidingIndicator } from '@/components/ui/useSlidingIndicator'
import { cn } from '@/lib/utils'

export function ColorSchemeSelector({ className }: { className?: string }) {
  const { colorScheme, setColorScheme } = useColorScheme()
  const { t } = useI18n()
  const { listRef, indicatorRef } = useSlidingIndicator()

  return (
    <div
      ref={listRef}
      aria-label={t('colorScheme.selectorLabel')}
      className={cn('selection-track h-10 gap-0 p-[3px] sm:h-11', className)}
      role="radiogroup"
    >
      <span ref={indicatorRef} className="selection-indicator" aria-hidden="true" />
      {colorSchemeOptions.map(({ Icon, labelKey, value }) => {
        const label = t(labelKey)

        return (
          <button
            key={value}
            aria-checked={colorScheme === value}
            aria-label={label}
            className="selection-item size-8 flex-none px-1 py-0 leading-none sm:size-9"
            role="radio"
            title={label}
            type="button"
            onClick={() => setColorScheme(value)}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
