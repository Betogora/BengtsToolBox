import { Moon, Sun } from 'lucide-react'

import { useColorScheme } from '@/lib/colorScheme'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const iconClassName =
  'absolute size-4 transition-[rotate,scale,opacity] duration-300 ease-out motion-reduce:transition-none'

// One button flips between light and dark; the icon shows the active scheme and turns into the other.
export function ColorSchemeToggle({ className }: { className?: string }) {
  const { colorScheme, setColorScheme } = useColorScheme()
  const { t } = useI18n()
  const isDark = colorScheme === 'dark'
  const label = t(isDark ? 'colorScheme.switchToLight' : 'colorScheme.switchToDark')

  return (
    <button
      aria-label={label}
      className={cn(
        'relative inline-grid size-10 shrink-0 place-items-center rounded-md text-foreground outline-none transition-colors hover:bg-secondary hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:size-11',
        className,
      )}
      title={label}
      type="button"
      onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
    >
      <Sun
        aria-hidden="true"
        className={cn(iconClassName, isDark && '-rotate-90 scale-0 opacity-0')}
      />
      <Moon
        aria-hidden="true"
        className={cn(iconClassName, !isDark && 'rotate-90 scale-0 opacity-0')}
      />
    </button>
  )
}
