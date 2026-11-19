import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

// Sichtbarer App-Titel in der schmalen TopBar. Die Überschrift für Screenreader steht in der Seite,
// damit sie auch bei ausgeblendeter Leiste erhalten bleibt; dieser Titel ist deshalb nur Anzeige.
export function ShellTitle({
  className,
  Icon,
  shortTitle,
  title,
}: {
  className?: string
  Icon: LucideIcon
  // Ersetzt den Titel, wo lange App-Namen sonst abgeschnitten würden: unter md (768 px) neben den Aktionen
  // und von lg bis 72rem (1024–1151 px), wo die Navigation in der Mitte Platz kostet.
  shortTitle?: string
  title: string
}) {
  return (
    <span aria-hidden="true" data-shell-title className={cn('flex min-w-0 items-center gap-2', className)}>
      <Icon className="size-5 shrink-0 text-primary" />
      <span className="min-w-0 truncate text-[1.0625rem] font-[650] leading-tight tracking-[-0.01em]">
        {shortTitle ? (
          <>
            <span className="md:max-lg:hidden min-[72rem]:hidden">{shortTitle}</span>
            <span className="max-md:hidden lg:max-[72rem]:hidden">{title}</span>
          </>
        ) : (
          title
        )}
      </span>
    </span>
  )
}
